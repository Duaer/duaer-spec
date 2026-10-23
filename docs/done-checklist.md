# Done checklist for agent work / 给 agent 的活写一份「做完」清单

> Fill this in **before** the run, not after. 运行之前填，不是之后。
> Works with any agent or editor. In duaer-spec it lines up with the Brief: goal / boundary / acceptance.
> 与任何 agent 或编辑器通用；在 duaer-spec 里对应 Brief 的三块：目标 / 边界 / 验收。

## English

Many agent failures tend to come down to this rather than the model being wrong: nobody wrote down what "done" meant, so the agent's own message became the definition.

### The five lines

1. **Deliverable** – what exists when this is finished, and where (a URL, a file path, a branch, a record id).
2. **Checks** – 3 to 5 yes/no statements whose answer can be found outside the agent's own message.
   - "The required test suite ran and exited 0" (not "tests pass")
   - "Only files under `src/billing/` changed"
   - "The page at `<url>` shows the new text"
3. **Evidence** – for each check, where the proof lives (log line, diff, screenshot, API readback).
4. **Limits** – actions that need a person regardless of the checks (deleting data, sending anything to a third party, spending money).
5. **Verdict owner** – who or what decides *accepted / rejected / could not verify*. It must be someone or something the agent cannot edit.

### Three rules that keep it honest

- The agent reports **per check**, with a pointer to evidence. A summary is not evidence.
- **"Could not verify" is its own state.** Missing evidence is neither success nor failure; it means someone has to look.
- A rejection **names the failing check**, or adds a new one with a reason. That keeps "I changed my mind" separate from "the work failed".

### Example (illustrative only)

Task: "Add rate limiting to the export endpoint."

| Line | Content |
| --- | --- |
| Deliverable | A PR against `main` touching only the export handler and its tests |
| Checks | (a) the 101st request within a minute returns 429, covered by a test that runs in CI; (b) existing export tests still pass; (c) no new dependencies |
| Evidence | CI run link, the diff |
| Limits | No changes to production configuration |
| Verdict owner | The reviewer named in `CODEOWNERS`, not the agent |

### When nobody answers

If a result is only "done" once someone accepts it, decide the silent case in advance:

- Three end states only: **accepted, rejected, expired**. No "pending forever".
- The clock starts when the evidence is complete, not when the agent says it is finished.
- On expiry, auto-release only if every machine-checkable item passed and nothing needs human judgment; otherwise route to a named second reviewer.
- Log who decided, on what evidence, and when.

## 中文

不少「agent 翻车」往往不是模型不行，而是没人事先写下「什么叫做完」，最后 agent 自己那句「已完成」就成了标准。

### 五行清单

1. **交付物**：做完之后存在什么、在哪（URL、文件路径、分支、记录 id）。
2. **检查项**：3～5 句能回答「是/否」的话，答案必须能从 agent 自己的消息之外找到。例如「要求的测试套件跑过且退出码为 0」，而不是「测试通过」；「只改了 `src/billing/` 下的文件」。
3. **证据**：每个检查项的证明放在哪（日志行、diff、截图、接口读回）。
4. **红线**：不管检查项过没过，都必须由人决定的动作（删数据、对外发东西、花钱）。
5. **验收人**：谁（或什么脚本）来判「通过 / 拒收 / 无法验证」，必须是 agent 改不了的一方。

### 三条规则

- agent 要**逐条**报告并给出证据位置，一段总结不算证据。
- **「无法验证」是单独一种状态**：证据缺失既不是成功也不是失败，意思是需要人看一眼。
- 拒收要**指向具体的检查项**，或者补一条新的并写明原因，这样「我改主意了」和「活没做好」不会混在一起。

### 示例（仅示意）

任务：「给导出接口加限流」。交付物是只改导出处理函数和测试的 PR；检查项是 1 分钟内第 101 次请求返回 429（CI 里有测试）、原有导出测试仍通过、没有新增依赖；红线是不改生产配置；验收人是 `CODEOWNERS` 里指定的审阅者，不是 agent。

### 没人回应怎么办

只有被验收才算「做完」的话，要提前定好沉默的情况：只有三种终态（**通过、拒收、过期**），没有「无限待定」；从证据齐全开始计时，而不是从 agent 说做完开始；到期时只有所有可机器核对的项都过了、且没有需要人判断的项，才自动放行，否则交给指定的第二审阅人；记录谁、依据什么证据、什么时候做的决定。
