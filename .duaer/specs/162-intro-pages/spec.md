# 162 — Intro site on GitHub Pages

## Goal

Public landing page introducing Duaer-spec / FED, published via GitHub Pages
from `site/`.

## In scope

- Static `site/index.html` (Chinese-primary): brand, pitch, delivery flow, FED, install
- Workflow `.github/workflows/pages.yml` deploying `site/`
- Publish so `https://fujiezee.github.io/duaer-spec/` is reachable

## Out of scope

- Live desk hosting
- Multi-page docs site rebuild

## Acceptance

1. Landing presents brand hero, system intro, install CTA
2. Pages workflow deploys `site/` on `main` (and workflow_dispatch)
3. Merged, pushed, Pages enabled; URL loads
