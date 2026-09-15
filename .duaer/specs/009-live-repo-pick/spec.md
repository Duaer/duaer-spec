# Feature Specification: Easier product repo selection

**Feature Branch**: `feat/live-repo-pick`

**Created**: 2026-09-16

**Status**: Active

## Goal

派工时不必手搓绝对路径：本机选文件夹、扫描发现、CLI 登记、列表点选。

## Acceptance

- UI: 「浏览…」调系统选文件夹；「扫描」列出常见目录下的 git 仓；可筛选点选
- `duaer live repo add [path]` 登记仓库（默认 cwd）
- 路径输入框降为备选
