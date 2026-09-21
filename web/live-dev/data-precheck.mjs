/**
 * FDE-06: dirty rows and bad field maps must not reach the page.
 * The confirm card records a mapping, an import precheck failure list,
 * and that the list can be exported for cleanup. The desk does not scan
 * the customer database.
 */

const PARTS = [
  { label: "字段映射", re: /字段映射|欄位映射|映射表|field mapping/i },
  { label: "导入预检失败清单", re: /预检|預檢|precheck|失败清单|失敗清單|failure list/i },
  { label: "可导出", re: /导出|導出|匯出|\bexport\b/i },
];

export function dataPrecheckDeclaresNoImport(text) {
  return /本模块无导入|本模組無導入|无数据导入|無資料匯入|無數據導入|no import/i.test(
    String(text || ""),
  );
}

export function missingDataPrecheck(text) {
  const t = String(text || "").trim();
  if (dataPrecheckDeclaresNoImport(t)) return [];
  const missing = [];
  for (const part of PARTS) {
    if (!part.re.test(t)) missing.push(part.label);
  }
  return missing;
}

/** Kickoff schedules the precheck only when an import was declared. */
export function dataPrecheckNeedsTask(text) {
  const t = String(text || "").trim();
  if (!t || dataPrecheckDeclaresNoImport(t)) return false;
  return true;
}
