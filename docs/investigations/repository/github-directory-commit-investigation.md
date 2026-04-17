# `.github` 目录无法提交问题排查

- 日期：2026-04-13
- 作用：本页只做 `.github` 目录排查主题入口；细节已拆到 `docs/investigations/repository/github-directory-commit/`。
- 当前结论：当 `.github/` 下只有被忽略文件时，Git 不会跟踪这个目录；这属于本地目录内容与忽略规则问题，不是 GitHub 仓库设置问题。

## 先读哪篇

- 根因、本地依据和误判来源：`docs/investigations/repository/github-directory-commit/root-cause.md`
- 可行修复方式、GitHub 配置边界与当前建议：`docs/investigations/repository/github-directory-commit/fixes-and-github-boundary.md`
