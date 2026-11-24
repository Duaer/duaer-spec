# Feat: speech-to-text model for composer Record

## Goal

After Record stops, decode speech to text via a configurable STT model in
Settings (alongside the console chat model). Transcript lands in the composer.

## Acceptance

1. Settings has an STT / speech model block (Base URL, API Key, Model) saved in
   live config; OpenAI-compatible `/audio/transcriptions` (e.g. whisper-1).
2. Record uses MediaRecorder when STT is configured; stop → `/api/transcribe` →
   text in `#input`. Visible recognizing state; errors are not silent.
3. Without STT config, browser SpeechRecognition remains a fallback (or a short
   bot hint to configure STT).
4. Docs (README / live-desk) + E2E + L0/L3 smoke pass.
