# Playwright：受限会话下的启动失败

- 日期：2026-04-13
- 目标：说明为什么当前问题不是浏览器未安装，而是自动化控制链路受限。

## 环境前提

- 工作树：当次独立任务工作树；具体路径会随 Codex 会话变化，不作为长期文档约束
- Playwright 浏览器目录：长期共享浏览器目录
- 已验证 `PLAYWRIGHT_BROWSERS_PATH` 已指向该长期目录

## 第一轮验证与结果摘要

依次做了这些验证：Python Playwright 直接执行 `firefox.launch()` / `chromium.launch()` / `webkit.launch()`；用 Playwright helper 启动本地 Vite 服务后尝试跑完整页面验收脚本；直接启动 Firefox / Chromium 二进制与 Playwright 路径做对照。

结果是：

- `firefox.launch(headless=True)`：浏览器进程能被拉起，但在 `-juggler-pipe` 控制链路下立即退出，退出信号为 `SIGABRT`
- `chromium.launch(headless=True)`：浏览器启动后在 `--remote-debugging-pipe` 阶段失败，关键错误为 `MachPortRendezvousServer ... Permission denied (1100)`
- `webkit.launch(headless=True)`：同样无法在当前 Codex CLI 沙箱环境内完成启动
- 浏览器二进制本身可直接启动，说明问题主要出在 Playwright 与浏览器之间的控制链路，而不是浏览器文件缺失

## 第一轮结论

当前受限点不是 Playwright 浏览器安装，而是 Codex CLI 当前运行环境对浏览器自动化控制链路的权限限制。

因此：代码级验证可继续依赖 `npm run build`、`npm run lint`、`npm run typecheck`、`npm run test:run`；若要完成真实页面自动化验收，应改在更宽松的会话环境中运行。
