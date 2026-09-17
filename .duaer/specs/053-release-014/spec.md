# Feature Specification: Release 0.14.0 + docs

**Feature Branch**: `feat/release-014`

**Created**: 2026-09-17

**Status**: Active

## Goal

Ship **0.14.0**: update EN/ZH manuals (live desk), CHANGELOG, bump version,
promote `develop` → `main`, tag, GitHub Release (npm Trusted Publishing).

## In scope

- README.md + README.zh-CN.md live-desk flow (fullscreen, three columns,
  validate-before-send, structured confirm)
- CHANGELOG 0.14.0 (fold Unreleased + recent desk work)
- package.json → 0.14.0
- Promote to main, push, tag `v0.14.0`, `gh release create`

## Out of scope

- Further UI redesign
- Manual npm token publish (use Trusted Publishing workflow)

## Acceptance

1. Docs describe current live desk accurately (EN no CJK; ZH OK)
2. Version 0.14.0 on main with tag and GitHub Release
3. npm publish workflow triggered by the release

## Assumptions

- Worktree: `.worktree/feat-release-014`
- Brief: `.duaer/specs/053-release-014/`
