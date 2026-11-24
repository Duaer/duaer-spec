Round: 1
Commit: 022a025d3782f7de102f70392e526d9103ceb427

What this change does: Translates the intro page from Chinese to English: all visible copy, the `<title>`, meta and Open Graph descriptions, the nav, the desk sketch, and the "You prepare:" label that appears on phones. `lang` becomes `en`. Layout and styles are unchanged. Load assumed: a static page on GitHub Pages.

Looks good. Ship.

Checked: the only CJK left is the footer link to `README.zh-CN.md`, labeled in its own language on purpose; role names (Implementer / Functional regression / Deployer), "planned host", deploy options and prerequisites, "open a change", "Dispatch center" and "deliverables page" match `README.md`; product-surface copy says "Norm console", per the brand rule; the "Does not" rows read as sentences after the heading ("Change product scope; stamp accepted when tests fail"); the CSS-only `::before` label still sits only on the last deploy column at phone width; headless Chromium at 375px and 1280px shows no horizontal scroll, and the longer English headline wraps cleanly on both; `npm test` passes 302 / 302.

Verdict: Ship.

Not checked: Safari and Firefox (Chromium only).
