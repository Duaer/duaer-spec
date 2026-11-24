# Feature Specification: Intro site in English

## Goal

The intro site (`site/index.html`) is in English instead of Chinese (user ask, 2026-11-24). Replaces the Chinese-only decision in 312-site-redesign; no language toggle.

## Scope

- Translate all page copy, `<title>`, meta / Open Graph text and the phone-width deploy label; `lang="en"`.
- Use the English terms already in `README.md` and the desk UI: Implementer / Functional regression / Deployer, planned host, Norm console, open a change, Dispatch center, deliverables page.
- Out of scope: layout, palette, README files.

## Acceptance

1. `lang="en"`; no CJK text left except the footer link to the Chinese README, labeled 中文.
2. Role, host and console names match `README.md`.
3. No horizontal scroll at 375px or 1280px.
4. `npm test` passes.
