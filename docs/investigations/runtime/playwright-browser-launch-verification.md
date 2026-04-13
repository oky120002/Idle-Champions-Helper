# Playwright 浏览器启动确认记录

- 确认时间：`2026-04-13`
- 目标：验证当前工作树中“最近草稿保存 / 恢复 + 命名方案库”是否能在 Codex CLI 环境内通过 Playwright 完成真实页面验收。

---

## 1. 环境前提

- 工作树：`/Users/rain/.worktrees/Idle-Champions-Helper/recent-draft-save-restore`
- Playwright 浏览器目录：`/Users/rain/.playwright-browsers`
- 已验证 `PLAYWRIGHT_BROWSERS_PATH` 已指向上述长期目录

---

## 2. 验证动作

依次做了下面几类验证：

1. 用 Python Playwright 直接执行 `firefox.launch()` / `chromium.launch()` / `webkit.launch()`
2. 用 Playwright helper 启动本地 Vite 服务后，尝试跑完整页面验收脚本
3. 直接启动 Firefox / Chromium 二进制，和 Playwright 启动路径做对照

---

## 3. 结果摘要

### 3.1 Playwright 直接启动失败

- `firefox.launch(headless=True)`：
  - 浏览器进程能被拉起
  - 但在 `-juggler-pipe` 控制链路下立即退出
  - 退出信号为 `SIGABRT`

- `chromium.launch(headless=True)`：
  - 浏览器启动后，在 `--remote-debugging-pipe` 阶段失败
  - 关键错误为：
    - `MachPortRendezvousServer ... Permission denied (1100)`

- `webkit.launch(headless=True)`：
  - 同样无法在当前 Codex CLI 沙箱环境内完成启动

### 3.2 浏览器二进制本身可直接启动

- 直接执行 Firefox headless 二进制时，可以进入 headless 模式，不是“浏览器未安装”
- 这说明问题主要出在 Playwright 与浏览器之间的控制链路，而不是浏览器文件缺失

---

## 4. 结论

当前受限点不是 Playwright 浏览器安装，而是 **Codex CLI 当前运行环境对浏览器自动化控制链路的权限限制**。

因此：

- 当前工作树内的代码级验证可继续依赖：
  - `npm run build`
  - `npm run lint`
- 若要完成真实页面自动化验收，应改在用户本机常规终端环境运行，而不是继续依赖当前 Codex CLI 沙箱

---

## 5. 对当前功能验收的影响

本轮实现已经完成：

- 最近草稿的本地自动保存 / 恢复
- 命名方案的保存 / 编辑 / 删除 / 恢复
- 版本感知的恢复校验与兼容恢复提示

但在当前环境下，**尚未完成真实浏览器链路的最终自动化点验**。

这意味着：

- 代码静态与构建校验已通过
- 浏览器端交互仍建议在用户本机终端环境补做一轮真实回归
