# 165 — Alibaba Cloud credentials in FED settings

## Goal

Operators can save Alibaba Cloud AccessKey ID + Secret in FED settings.
「阿里云」appears in planned-host and deploy picker only when both are set.

## In scope

- Settings fields (local `~/.duaer/live/config.json`); never expose secrets via API
- Hide `aliyun` chips/picker option until `hasAliyunCredentials`
- Reject `/api/deploy` with `aliyun` if credentials missing; inject env for deploy launch

## Out of scope

- Cloudflare / AWS credential gates
- Building full OSS deploy automation beyond credential plumbing

## Acceptance

1. Settings can save / clear AccessKey ID + Secret
2. Without credentials, 阿里云 is not shown; with both, it is
3. Public config returns `hasAliyunCredentials` only (no secret values)
4. L0 + unit/smoke + `npm run test:live` (or targeted) pass
