# investigations 文档入口

本目录存放排查、验证、环境确认和历史问题记录；只在需要复现或核对结论时按主题读取。

## 主题索引

- `docs/investigations/runtime/`：本地运行、预览、浏览器行为和页面异常排查
- `docs/investigations/repository/`：仓库结构、Git 与历史配置问题排查

## 当前入口文件

- `docs/investigations/runtime/local-run-verification.md`
- `docs/investigations/runtime/champions-filter-scroll-stability-investigation.md`
- `docs/investigations/runtime/playwright-browser-launch-verification.md`
- `docs/investigations/repository/github-directory-commit-investigation.md`
- `docs/investigations/repository/agents-layering-verification.md`

## 使用约定

- 只保留可复用结论，不写长流水账
- 问题已经沉淀成通用摘要后，优先把入口补到 `docs/troubleshooting-log.md`
- 历史问题要明确说明当前是否仍有效
