/**
 * Extract Archify architecture JSON from assistant reply text (browser).
 */

export function extractArchitectureIr(text) {
  const s = String(text || "");
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [];
  if (fence) candidates.push(fence[1]);
  const brace = s.match(/\{[\s\S]*"diagram_type"\s*:\s*"architecture"[\s\S]*\}/);
  if (brace) candidates.push(brace[0]);
  // Also accept ready payload that embeds IR fields at top level
  const ready = s.match(/\{[\s\S]*"ready"\s*:\s*true[\s\S]*"components"\s*:\s*\[[\s\S]*\}/);
  if (ready) candidates.push(ready[0]);
  for (const chunk of candidates) {
    try {
      const obj = JSON.parse(chunk.trim());
      if (!obj || typeof obj !== "object") continue;
      if (obj.diagram_type === "architecture") return obj;
      if (obj.ready && Array.isArray(obj.components)) {
        return {
          schema_version: obj.schema_version || 1,
          diagram_type: "architecture",
          meta: obj.meta || { title: obj.title || "Architecture", quality_profile: "standard" },
          components: obj.components,
          boundaries: obj.boundaries || [],
          connections: obj.connections || [],
          cards: obj.cards || [],
        };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}
