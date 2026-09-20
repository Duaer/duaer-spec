/**
 * Desk-owned accept gate. The employee may write delivery.json; the desk
 * runs `.duaer/memory/verify.json` and reopens a stamp the commands do not support.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const VERIFY_REL = path.join(".duaer", "memory", "verify.json");
export const DOCS_WAIVER = "docs-only";

const MAX_COMMANDS = 8;
const MAX_COMMAND_LEN = 240;
const DEFAULT_TIMEOUT_SEC = 600;
const MAX_TIMEOUT_SEC = 1800;
const FAIL_RETRY_MS = 30_000;
const TAIL_CHARS = 4000;

export function clampTimeoutSec(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TIMEOUT_SEC;
  return Math.min(MAX_TIMEOUT_SEC, Math.max(1, Math.floor(n)));
}

export function parseVerifyContract(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { kind: "invalid" };
  }
  const commands = Array.isArray(value.commands)
    ? value.commands.map((c) => String(c ?? "").trim()).filter(Boolean)
    : [];
  if (
    commands.length > MAX_COMMANDS ||
    commands.some((c) => c.length > MAX_COMMAND_LEN || /[\r\n]/.test(c))
  ) {
    return { kind: "invalid" };
  }
  if (commands.length) {
    return {
      kind: "commands",
      commands,
      timeoutSec: clampTimeoutSec(value.timeoutSec),
    };
  }
  if (value.waiver === DOCS_WAIVER) {
    return { kind: "waiver", waiver: DOCS_WAIVER };
  }
  if (value.waiver != null && String(value.waiver).trim() !== "") {
    return { kind: "invalid" };
  }
  return { kind: "missing" };
}

export function readVerifyContract(repoRoot) {
  if (!repoRoot) return { kind: "missing" };
  const file = path.join(repoRoot, VERIFY_REL);
  if (!fs.existsSync(file)) return { kind: "missing" };
  try {
    return parseVerifyContract(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return { kind: "invalid" };
  }
}

export function resolveVerifyContract(fileContract, frozen) {
  if (frozen && Array.isArray(frozen.commands) && frozen.commands.length) {
    return {
      kind: "commands",
      commands: frozen.commands.map((c) => String(c)),
      timeoutSec: clampTimeoutSec(frozen.timeoutSec),
      frozen: true,
    };
  }
  return fileContract || { kind: "missing" };
}

export function contractKey(contract) {
  if (!contract) return "missing";
  if (contract.kind === "commands") return `cmd:${contract.commands.join("\n")}`;
  if (contract.kind === "waiver") return "waiver:docs-only";
  return contract.kind || "missing";
}

export function regressionLane(workerCount) {
  const n = Math.max(Number(workerCount) || 1, 1);
  return `w${n}`;
}

export function runVerifyCommands(repoRoot, commands, { timeoutSec } = {}) {
  const timeout = clampTimeoutSec(timeoutSec) * 1000;
  const results = [];
  for (const command of commands) {
    const r = spawnSync(command, {
      cwd: repoRoot,
      shell: true,
      encoding: "utf8",
      timeout,
      maxBuffer: 1024 * 1024,
    });
    const timedOut = Boolean(r.error && r.error.code === "ETIMEDOUT");
    const exitCode = timedOut ? 124 : r.status == null ? 1 : r.status;
    const tail = `${r.stdout || ""}\n${r.stderr || ""}${
      r.error && !timedOut ? `\n${r.error.message}` : ""
    }`
      .trim()
      .slice(-TAIL_CHARS);
    results.push({ command, exitCode, tail, timedOut });
    if (exitCode !== 0) break;
  }
  return results;
}

function evidence(contract, result, commands, ranAt) {
  const body = {
    gate: "machine",
    result,
    ranAt,
  };
  if (contract?.waiver) body.waiver = contract.waiver;
  if (commands?.length) body.commands = commands;
  return body;
}

export function deliveryAfterGate(delivery, verification, { reopen }) {
  const base =
    delivery && typeof delivery === "object" && !Array.isArray(delivery)
      ? { ...delivery }
      : {};
  base.verification = verification;
  if (reopen) {
    base.status = "open";
    delete base.acceptedAt;
  } else if (!base.status) {
    base.status = "open";
  }
  return base;
}

function publicGate(result, command, exitCode) {
  if (!result || result === "pass") {
    return result === "pass" ? { result: "pass" } : null;
  }
  return {
    result,
    command: command || "",
    exitCode: exitCode ?? null,
  };
}

function nudgeOf(result, command, exitCode, tail) {
  return {
    fingerprint: `VERIFY:${result}:${command || ""}:${exitCode ?? ""}`,
    result,
    command: command || "",
    exitCode: exitCode ?? null,
    tail: String(tail || "").slice(-1200),
  };
}

function shouldExecute({
  contract,
  previous,
  now,
  terminalBusy,
  deliveryAccepted,
}) {
  const key = contractKey(contract);
  if (contract.kind === "waiver") {
    return !(previous?.result === "pass" && previous.contractKey === key);
  }
  if (contract.kind !== "commands") {
    return !previous || previous.contractKey !== key || deliveryAccepted;
  }
  if (terminalBusy && !deliveryAccepted) return false;
  if (previous?.result === "pass" && previous.contractKey === key) return false;
  if (previous?.result === "fail" && previous.contractKey === key) {
    if (terminalBusy && !deliveryAccepted) return false;
    const age = now - Date.parse(previous.ranAt || "");
    if (Number.isFinite(age) && age >= 0 && age < FAIL_RETRY_MS && !deliveryAccepted) {
      return false;
    }
  }
  return true;
}

/**
 * @returns {{
 *   action: "skip" | "write",
 *   delivery?: object,
 *   verifyGate: object | null,
 *   state: object | null,
 *   frozen: object | null,
 *   nudge: object | null,
 * }}
 */
export function evaluateVerifyGate({
  repoRoot,
  delivery = null,
  allTasksDone = false,
  deliveryAccepted = false,
  skip = false,
  terminalBusy = false,
  frozen = null,
  previous = null,
  now = Date.now(),
  readContract = readVerifyContract,
  runCommands = runVerifyCommands,
} = {}) {
  if (skip || !repoRoot) {
    return { action: "skip", verifyGate: null, state: previous, frozen, nudge: null };
  }
  const contract = resolveVerifyContract(readContract(repoRoot), frozen);
  const key = contractKey(contract);
  if (!allTasksDone && !deliveryAccepted) {
    return { action: "skip", verifyGate: null, state: previous, frozen, nudge: null };
  }

  const cachedPass =
    previous?.result === "pass" && previous.contractKey === key;
  if (contract.kind === "commands" && cachedPass) {
    const nextFrozen = {
      commands: contract.commands,
      timeoutSec: contract.timeoutSec,
    };
    if (delivery?.verification?.result === "pass") {
      return {
        action: "skip",
        verifyGate: { result: "pass" },
        state: previous,
        frozen: nextFrozen,
        nudge: null,
      };
    }
    const verification = evidence(
      contract,
      "pass",
      previous.commands || [],
      previous.ranAt,
    );
    return {
      action: "write",
      delivery: deliveryAfterGate(delivery, verification, { reopen: false }),
      verifyGate: { result: "pass" },
      state: previous,
      frozen: nextFrozen,
      nudge: null,
    };
  }

  const execute = shouldExecute({
    contract,
    previous,
    now,
    terminalBusy,
    deliveryAccepted,
  });

  if (!execute) {
    if (deliveryAccepted && previous && previous.result !== "pass") {
      const verification = evidence(
        contract,
        previous.result,
        previous.commands || [],
        previous.ranAt || new Date(now).toISOString(),
      );
      return {
        action: "write",
        delivery: deliveryAfterGate(delivery, verification, { reopen: true }),
        verifyGate: publicGate(previous.result, previous.command, previous.exitCode),
        state: previous,
        frozen:
          contract.kind === "commands"
            ? { commands: contract.commands, timeoutSec: contract.timeoutSec }
            : frozen,
        nudge: nudgeOf(previous.result, previous.command, previous.exitCode, ""),
      };
    }
    return {
      action: "skip",
      verifyGate: publicGate(previous?.result, previous?.command, previous?.exitCode),
      state: previous,
      frozen,
      nudge: null,
    };
  }

  const ranAt = new Date(now).toISOString();
  if (contract.kind === "waiver") {
    const verification = evidence(contract, "pass", [], ranAt);
    const state = {
      result: "pass",
      contractKey: key,
      ranAt,
      waiver: DOCS_WAIVER,
    };
    return {
      action: "write",
      delivery: deliveryAfterGate(delivery, verification, { reopen: false }),
      verifyGate: { result: "pass" },
      state,
      frozen: null,
      nudge: null,
    };
  }

  if (contract.kind !== "commands") {
    const verification = evidence(contract, contract.kind, [], ranAt);
    const state = { result: contract.kind, contractKey: key, ranAt };
    return {
      action: "write",
      delivery: deliveryAfterGate(delivery, verification, { reopen: true }),
      verifyGate: { result: contract.kind },
      state,
      frozen: null,
      nudge: nudgeOf(contract.kind, "", "", ""),
    };
  }

  const results = runCommands(repoRoot, contract.commands, {
    timeoutSec: contract.timeoutSec,
  });
  const failed = results.find((r) => r.exitCode !== 0);
  const result = failed ? "fail" : results.length ? "pass" : "fail";
  const stored = results.map((r) => ({
    command: r.command,
    exitCode: r.exitCode,
    tail: r.tail || "",
    ...(r.timedOut ? { timedOut: true } : {}),
  }));
  const verification = evidence(contract, result, stored, ranAt);
  const head = failed || stored[stored.length - 1] || null;
  const state = {
    result,
    contractKey: key,
    ranAt,
    command: head?.command || contract.commands[0] || "",
    exitCode: head?.exitCode ?? null,
    commands: stored,
  };
  return {
    action: "write",
    delivery: deliveryAfterGate(delivery, verification, {
      reopen: result !== "pass",
    }),
    verifyGate: publicGate(result, state.command, state.exitCode),
    state,
    frozen: { commands: contract.commands, timeoutSec: contract.timeoutSec },
    nudge: result === "pass" ? null : nudgeOf(result, state.command, state.exitCode, head?.tail),
  };
}

export function verifyNudgePrompt({ nudge, worktreePath, featureDir }) {
  if (!nudge) return "";
  if (nudge.result === "missing" || nudge.result === "invalid") {
    return `Duaer

机器验收未放行。工作目录: ${worktreePath}
Brief: ${featureDir || ""}

产品仓需要 \`.duaer/memory/verify.json\`。
- 有可跑测试时写入 { "commands": ["<真实命令>"] }（例如 npm test）
- 只有纯文档、没有可跑命令时才允许 { "waiver": "docs-only" }
不要 stamp delivery.json 为 accepted。控制台会自己复跑；失败会把 accepted 打回 open。
`;
  }
  return `Duaer

机器验收未通过。工作目录: ${worktreePath}
Brief: ${featureDir || ""}
命令: ${nudge.command || ""}
退出码: ${nudge.exitCode ?? ""}

输出尾部:
${nudge.tail || "(无)"}

修好并使上述命令退出码为 0。不要把已有 commands 改成 waiver 来跳过。不要 stamp accepted；控制台会复跑，通过后才允许 accepted。
`;
}
