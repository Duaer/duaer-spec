# Feat: chat voice input next to Send

## Goal

Operators can **record speech** beside Send to collect requirements by talking.
Transcript lands in the composer (editable), then Send as usual.

## Acceptance

1. Composer has a voice control next to Send (label via i18n).
2. Uses browser SpeechRecognition when available; unsupported / denied shows a
   short bot or aria notice — no silent fail.
3. Listening state is visible; interim/final text appends into `#input`.
4. Voice respects the same enable rules as Send (ready + project + not busy).
5. README (en/zh) + live-desk note the voice path; E2E row; L0/L3 smoke pass.
