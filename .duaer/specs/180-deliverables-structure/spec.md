# Feat: structured deliverables HTML

## Goal

Make the customer-facing deliverables page easier to scan: table of contents,
per-stage anchors, and field-structured card layout (dl/dt/dd) instead of
dense prose blocks.

## Acceptance

1. Page has a Contents / 目录 nav linking to each stage and artifact
2. Requirement / revise cards render as labeled field rows (goal, out of
   scope, acceptance, assumptions)
3. Multi-line and bullet text becomes structured paragraphs / lists
4. Unit tests cover TOC / card-dl markers; XSS escaping unchanged
5. Progress「查看交付物」still opens this page in a new tab
