# Feature Specification: Pass baseline fields through chat parse/SSE

## Goal

When the model returns deviceMatrix / criticalPaths / exceptionCases in chat
JSON, they must reach the middle confirm card (not be stripped by
parseChatResult / chatDoneSsePayload).

## In scope

- parseChatResult + chatDoneSsePayload passthrough (top-level + modules[])
- Unit / smoke coverage

## Out of scope

- Prompt wording (already done in 264)

## Acceptance

1. Parsed chat JSON with baseline fields retains them in the done payload shape
2. Middle card merge path receives the three keys from SSE done
3. `npm run test:live` + targeted unit pass
