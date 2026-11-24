# Feature Specification: Redesign the intro site around current Norm

## Goal

The intro site (`site/index.html`, served at `https://fujiezee.github.io/norm/`)
only has hero, delivery flow, a one-line FDE section and install. Rebuild it
around what Norm does today, as described in `README.zh-CN.md`.

User decisions (2026-11-24): content follows the current README; Chinese only;
keep the dark ember/teal palette of the Norm FDE logo, new layout.

## In scope

- `site/index.html` only (single static page, no build step, no new deps).
- Sections: sticky nav, hero, delivery flow (Brief → implement → review →
  accept → handoff), editor-side digital employee, Norm FDE (desk layout
  sketch + capabilities), three digital-employee roles, deployment targets,
  install / update (incl. rename note), footer.

## Out of scope

- English version, language toggle, new logo, README changes, desk UI.
- Version bump / npm release; promotion to `main` (needs a separate go-online ask).

## Acceptance

1. Page is Chinese (`lang="zh-CN"`), uses the existing palette tokens, and names the product as Norm / Norm FDE.
2. Sections present with anchors: `#how`, `#editor`, `#fde`, `#roles`, `#deploy`, `#install`; nav links to each.
3. Content matches README.zh-CN: Ponytail review gate, optional PR mode, Cursor / Claude Code, FDE capabilities (modular confirm, architecture, signed baseline + change order, dispatch, task progress, deliverables, revise, bug fix, dispatch center), three roles with does / does-not, five deploy options, `init` and `update` commands, `duaer-spec` rename note.
4. No redundant explanatory prose (ai-ui-copy rule): short headings, labels and one-line helpers.
5. Layout works at 375px width with no horizontal page scroll; `prefers-reduced-motion` disables animation.
6. All links point at `fujiezee/norm` / `@fujiezee/norm`; no `duaer` link left except the rename note.
7. `npm test` passes; HTML parses (no unclosed tags).
