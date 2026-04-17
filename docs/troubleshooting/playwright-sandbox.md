# 受限 Codex 会话内 Playwright 无法正常启动

- 状态 / 时间：已定位；`2026-04-13`
- 影响：受限会话内无法完成浏览器级自动化验收，尽管 Playwright 浏览器已安装。
- 现象：`firefox.launch()` 在 `-juggler-pipe` 后 `SIGABRT`；`chromium.launch()` 报 `MachPortRendezvousServer ... Permission denied (1100)`；`webkit` 同样失败。
- 根因：浏览器二进制本身可启动，但 Playwright 控制链路受会话权限 / 沙箱限制影响，安装不是主因。
- 处理：受限会话先跑 `npm run build` + `npm run lint`；需要真实页面回归时切到 `danger-full-access` 会话。
- 验证：切到完全访问权限后，`firefox / chromium / webkit` 均可启动，页面验收通过。
- 入口：`docs/investigations/runtime/playwright-browser-launch-verification.md`
