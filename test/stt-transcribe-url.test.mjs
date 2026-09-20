/**
 * STT transcriptions URL helper (mirrors duaer-live.mjs).
 */
import assert from "node:assert/strict";
import test from "node:test";

function sttTranscriptionsUrl(baseUrl) {
  const base = String(baseUrl || "")
    .trim()
    .replace(/\/$/, "");
  if (!base) return "";
  if (/\/audio\/transcriptions$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/audio/transcriptions`;
  return `${base}/v1/audio/transcriptions`;
}

test("sttTranscriptionsUrl normalizes OpenAI-compatible bases", () => {
  assert.equal(
    sttTranscriptionsUrl("https://api.openai.com/v1"),
    "https://api.openai.com/v1/audio/transcriptions",
  );
  assert.equal(
    sttTranscriptionsUrl("https://api.openai.com/v1/"),
    "https://api.openai.com/v1/audio/transcriptions",
  );
  assert.equal(
    sttTranscriptionsUrl("https://api.openai.com"),
    "https://api.openai.com/v1/audio/transcriptions",
  );
  assert.equal(
    sttTranscriptionsUrl(
      "https://api.openai.com/v1/audio/transcriptions",
    ),
    "https://api.openai.com/v1/audio/transcriptions",
  );
  assert.equal(sttTranscriptionsUrl(""), "");
});
