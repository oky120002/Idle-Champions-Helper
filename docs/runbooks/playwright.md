# Playwright 本地验收

## 运行前提

- 使用项目的 `@playwright/test`、`playwright.config.ts` 和 `tests/e2e/`。
- 浏览器缺失时运行 `npm run playwright:install`。
- 视觉或 Pages 验收前先构建，避免测试旧 `dist/`。

## 启动失败

浏览器二进制能直接启动、但 Playwright 在 remote debugging pipe、Mach port 或自动化控制链路报权限错误时，优先判断为宿主权限限制，不反复安装依赖。先完成 lint、typecheck、unit 和 build；浏览器验收改在允许自动化控制的本机会话运行。

## 完成口径

浏览器能启动不等于验收完成。必须运行对应 E2E，并核对退出码、失败证据和当前工作树产物。涉及视觉变化时补桌面与移动视口截图检查。
