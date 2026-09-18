# Brief: Persist and restore revise dialogue

## Symptom

Revise chat / 改进卡 are written to project-chats but after refresh the
dialogue does not reappear in the chat column (only original specify messages).

## Goal

Restore revise messages and revise-card UI whenever the desk reloads a project
that has revise history. Persist after revise kickoff.

## Acceptance

1. Reload with mode=revise or reviseMessages: chat shows revise turns (skip system kicks)
2. reviseLocked / filled revise card still visible after reload
3. kickoffReviseDialogue persists messages
4. L0 + L3
