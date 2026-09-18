# Brief: Show result / project open path after job finishes

## Symptom

After delivery is accepted, users cannot find where to preview the project.
When there is no `preview.url` / `index.html`, the result panel stays hidden.

## Goal

When a job is accepted (or has results), always show a Result area with either
「查看结果」or a clear open-project path (worktree / folder).

## In scope

- Show result panel whenever product is ready, even without a preview URL
- Open worktree / project folder from the desk
- Mirror a result CTA in the progress column so it is easy to spot
- Scroll the result panel into view when it first appears

## Out of scope

- Auto-starting local HTTP servers for APIs
- Inventing fake page URLs

## Acceptance

1. Accepted job with preview URL: 「查看结果」visible in middle + progress
2. Accepted job without preview: panel still visible with open-folder CTA + path
3. First appear scrolls result into view in the requirements column
4. L0 + L3 (`npm run test:live`) + E2E catalog row
