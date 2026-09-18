# 166 — Cloudflare / AWS credentials in FED settings

## Goal

Same gate as Alibaba Cloud: save host credentials in Settings; show
Cloudflare / AWS in planned-host and Deploy picker only when configured.

## Credentials

- Cloudflare: API Token + Account ID
- AWS: Access Key ID + Secret Access Key (optional Region)

## Acceptance

1. Settings can save/clear both hosts; secrets never in public API
2. Options hidden until credentials present; deploy rejects if missing
3. Deploy injects standard env vars into Terminal shell
4. L0 + targeted tests + test:live pass
