# Fix: architecture diagram not visible on desk

## Symptom

Model says「架构图已生成」but the desk shows no diagram. Session can stay
`architecture.status=designing` with `url=null` while the panel is buried under
「计划托管」and easy to miss.

## Cause

1. Panel nested inside deploy-target field (low visibility / wrong scroll)
2. Client only renders when IR is in `jsonBlock`; model often returns ready text without IR
3. No clear empty/missing CTA when designing without a URL

## Acceptance

1. Architecture panel is a first-class block in the middle column (not under deploy chips)
2. Server tries to render IR from architecture chat and returns `architectureUrl`
3. Client applies server URL; if claim-ready without IR, shows missing hint + regenerate
4. Panel scrolls into view when designing / preview
5. Copy points to middle「系统架构」not「计划托管」
6. L0 + tests + E2E row
