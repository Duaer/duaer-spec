/**
 * FDE-07 UAT pack: exception cases must cover more than the happy path.
 */

const UAT_CASES = [
  { label: "空态", re: /空态|空列表|为空|无数据|\bempty\b/i },
  { label: "失败", re: /失败|错误|出错|\bfail|\berror/i },
  { label: "权限不足", re: /权限|未授权|403|\bforbidden\b|\bpermission\b/i },
  { label: "超时", re: /超时|\btimeout\b|timed out/i },
  { label: "重试", re: /重试|\bretry\b/i },
];

export function missingUatCases(text) {
  const t = String(text || "");
  return UAT_CASES.filter((c) => !c.re.test(t)).map((c) => c.label);
}

/** Contract modules must name an error code or HTTP status in the UAT text. */
export function uatMentionsErrorCode(text) {
  return /错误码|error\s*code|status\s*\d{3}|\b[45]\d{2}\b/i.test(String(text || ""));
}
