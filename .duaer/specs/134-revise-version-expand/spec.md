# 134 — Expandable requirement versions + architecture

## Goal

Show every requirement iteration as an expandable card (初版 + 第1/2/3…版).
When architecture changed for a version, show that diagram on the card.

## In scope

- Accordion list: 初版 (originalCard) + locked reviseCards + draft
- All history entries open by default; toggle still works
- Persist architecture snapshot on each revise entry when it changed
- Persist initialArchitecture from first confirm
- Editable draft fields remain for the active revise

## Acceptance

1. After several revises, user sees expandable 初版 / 第1版 / 第2版 with full fields
2. Version whose architecture changed shows an embed under the fields
3. Reload restores accordion + architecture snapshots
4. L0 + project-chat unit + `npm run test:live` pass; E2E-102
