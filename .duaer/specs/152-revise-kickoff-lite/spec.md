# 152 — Revise kickoff must not run heavy chrome

## Goal

「再改一版」starts the model reply without Maximum call stack. Prior fix
dropped IR from memory; kickoff still called full `syncReviseDispatchButton`
(accordion / field sync) before fetch, and any stack overflow was mislabeled
as architecture serialization.

## Acceptance

1. Kickoff start only flips busy / dispatch disabled — no accordion rebuild
2. Chrome sync runs only after a successful kickoff reply
3. Stack errors show stage + real message (not always「架构图序列化爆栈」)
4. ResizeObserver for architecture frame is re-entry safe
5. L0 + live smoke pass
