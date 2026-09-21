/**
 * FDE-04: a browser matrix is not done until it names real targets,
 * evidence, and a fallback.
 */

const NAMED_TARGETS = [
  /chrome/i,
  /safari/i,
  /firefox/i,
  /\bedge\b/i,
  /\bie\s*11\b|\bie11\b|\binternet explorer\b/i,
  /麒麟|统信|\buos\b|360|qq\s*浏览器|微信|鸿蒙|android|\bios\b|iphone|国产/i,
  /手机/,
];

function namedTargetCount(text) {
  const t = String(text || "");
  return NAMED_TARGETS.filter((re) => re.test(t)).length;
}

export function missingCompatMatrix(text) {
  const t = String(text || "").trim();
  const missing = [];
  const vagueOnly =
    /^(主流浏览器|现代浏览器|主流终端|modern browsers|all browsers)[.。!！\s]*$/i.test(
      t,
    );
  if (vagueOnly || namedTargetCount(t) < 2) {
    missing.push("至少两个具体浏览器或国产终端");
  }
  if (!/截图|录屏|云测|真机|证据|screenshot|recording|browserstack|compat\//i.test(t)) {
    missing.push("截图/录屏或云测证据");
  }
  if (!/降级|polyfill|不支持|fallback|垫片|提示升级|upgrade notice/i.test(t)) {
    missing.push("降级或 Polyfill");
  }
  return missing;
}
