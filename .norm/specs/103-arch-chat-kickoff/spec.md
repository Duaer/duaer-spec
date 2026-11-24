# Brief: Architecture design chat must start visibly

## Goal

After Confirm, left chat must immediately start an architecture dialogue
(bot asks / streams). Hint "正在对话设计架构（Duaer）" must not look stuck
with no chat activity.

## Acceptance

1. Confirm → bot intro + first architecture question in chat (no silent hang)
2. Architecture mode persists and restores with architecture messages visible
3. Kickoff awaits after confirm busy clears (no busy race)
