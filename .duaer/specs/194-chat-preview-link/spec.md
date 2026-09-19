# 194 — Clickable preview URL in chat

## Goal

When the desk posts「数字员工已做好…打开看看」with a preview URL, that URL
must be a real clickable link in the chat bubble (not plain text).

## Acceptance

1. Accepted bot bubble shows an `<a href>` for http(s) and `/api/…` preview URLs.
2. Clicking opens in a new tab (noopener).
3. Relative page paths still offer an open action via「打开看看」chip when not
   directly linkable.
4. L0 + chat-markdown / smoke tests; merge develop.
