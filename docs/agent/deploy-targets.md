# Deploy targets (planned hosting)

> Part of **duaer-spec** agent ops. Precedence: [`AGENTS.md`](../../AGENTS.md).  
> Language: English only.

On the live desk, operators pick a **planned host** before dispatch:
**Cloudflare**, **Alibaba Cloud**, **AWS**, **GitHub Pages**, or **none**.

That choice is written into the product Brief and the agent launch prompt.
Implement for the chosen platform from day one — do not build a Node-only
app and “adapt later” when Cloudflare (or another edge host) was selected.

When the desk choice is **none** but the Brief text still asks for public
hosting, default to **GitHub Pages** via [`deploy-github.md`](deploy-github.md)
unless the project already standardizes on another host.

## Cloudflare (Workers / Pages)

Use when the desk target is `cloudflare`.

**FDE gate:** Operators must save **API Token** and **Account ID** in desk
Settings first. Until both are present, the live UI hides Cloudflare. Keys
live in `~/.duaer/live/config.json`; public config only exposes
`hasCloudflareCredentials`. On deploy, FDE injects `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID` into the Terminal shell.

### Product shapes

| Need | Prefer |
|---|---|
| Static site / SPA assets | **Cloudflare Pages** |
| HTTP APIs / edge logic | **Workers** or Pages Functions |
| Scheduled / queue work | Cron Triggers, Queues, Durable Objects |

### Coding constraints (must follow)

* **No durable local filesystem** for app state. Do not rely on Node `fs`
  writes at runtime. Use KV, R2, D1, Durable Objects, or external stores.
* Prefer **Web-standard** `fetch`, `Request`, `Response`, `URL`, streams.
  Avoid APIs that only exist in a long-lived Node server unless the project
  already uses a supported compatibility layer and documents it.
* **Secrets** via Wrangler secrets / dashboard — never commit credentials.
* Cold starts and CPU limits apply; keep handlers small; push heavy work to
  Queues / scheduled jobs.
* Document Wrangler (`wrangler.toml` / `wrangler.jsonc`) and deploy steps in
  the product README.

### Deploy evidence

Put the public URL into `delivery.json` `preview.url` after a successful
publish (label e.g. `View result`).

## Alibaba Cloud (阿里云)

Use when the desk target is `aliyun`.

**FDE gate:** Operators must save **AccessKey ID** and **AccessKey Secret** in
desk Settings first. Until both are present, the live UI hides the Alibaba
Cloud option. Keys live in `~/.duaer/live/config.json` (mode `0600` when
possible); the public config API only exposes `hasAliyunCredentials`, never
the secret values. On deploy, FDE injects
`ALIBABA_CLOUD_ACCESS_KEY_*` / `ALIYUN_ACCESS_KEY_*` into the Terminal shell.

Common shapes: **OSS** (+ CDN) for static sites; **Function Compute (FC)**
for APIs; **SAE** / ECS when a container or long-lived process is required.

Match the code and build output to the chosen shape. Keep secrets in the
cloud KMS / env config. Document console or CLI steps in the product README.
Write the public URL to `delivery.preview.url` when hosted.

## AWS

Use when the desk target is `aws`.

**FDE gate:** Operators must save **Access Key ID** and **Secret Access Key**
in desk Settings (optional Region). Until both keys are present, the live UI
hides AWS. Public config only exposes `hasAwsCredentials`. On deploy, FDE
injects `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (and Region when set).

Common shapes: **S3 + CloudFront** for static sites; **Amplify Hosting**;
**Lambda + API Gateway** for APIs; containers via **App Runner** / ECS when
needed.

Match code to the service limits (especially Lambda package size and
ephemeral `/tmp`). Use IAM roles and Secrets Manager — no keys in git.
Document Console / AWS CLI / SAM / CDK steps in the product README.
Write the public URL to `delivery.preview.url` when hosted.

## GitHub Pages

Use when the desk target is `github-pages`, or when deploy is implied and no
other target was chosen. See [`deploy-github.md`](deploy-github.md).

## Checklist

* [ ] Desk (or Brief) records the planned target
* [ ] Code and deps match that target’s constraints
* [ ] Deploy steps documented in the product repo
* [ ] Public URL recorded in `delivery.preview.url` when hosted
