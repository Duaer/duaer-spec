/**
 * Stable hash key for a product project path (desk session id).
 */

import { createHash } from "node:crypto";

export function projectChatKey(projectPath) {
  const abs = String(projectPath || "")
    .trim()
    .replace(/[\\/]+$/, "");
  if (!abs) return "";
  return createHash("sha256").update(abs).digest("hex").slice(0, 24);
}
