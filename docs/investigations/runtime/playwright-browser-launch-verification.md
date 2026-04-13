# Playwright 浏览器启动与页面验收记录

- 确认时间：`2026-04-13`
- 目标：验证当前工作树中“最近草稿保存 / 恢复 + 命名方案库”是否能在不同 Codex 会话权限下通过 Playwright 完成真实页面验收。

---

## 1. 环境前提

- 工作树：`/Users/rain/.worktrees/Idle-Champions-Helper/recent-draft-save-restore`
- Playwright 浏览器目录：`/Users/rain/.playwright-browsers`
- 已验证 `PLAYWRIGHT_BROWSERS_PATH` 已指向上述长期目录

---

## 2. 第一轮：受限会话验证

依次做了下面几类验证：

1. 用 Python Playwright 直接执行 `firefox.launch()` / `chromium.launch()` / `webkit.launch()`
2. 用 Playwright helper 启动本地 Vite 服务后，尝试跑完整页面验收脚本
3. 直接启动 Firefox / Chromium 二进制，和 Playwright 启动路径做对照

---

## 3. 第一轮结果摘要

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

## 4. 第一轮结论

当前受限点不是 Playwright 浏览器安装，而是 **Codex CLI 当前运行环境对浏览器自动化控制链路的权限限制**。

因此：

- 当前工作树内的代码级验证可继续依赖：
  - `npm run build`
  - `npm run lint`
- 若要完成真实页面自动化验收，应改在更宽松的会话环境中运行，而不是继续依赖当前受限会话

---

## 5. 第二轮：`danger-full-access` 会话验证

在切换到完全访问权限会话后，重新执行了下面验证：

1. 最小浏览器启动验证：
   - `firefox.launch(headless=True)`
   - `chromium.launch(headless=True)`
   - `webkit.launch(headless=True)`
2. 完整页面验收脚本：
   - 启动本地 Vite 服务
   - 使用 Playwright 依次覆盖：
     - 放置英雄并制造 / 消除 `seat` 冲突
     - 等待最近草稿自动保存
     - 刷新后恢复最近草稿
     - 保存为命名方案
     - 在方案页编辑名称/备注/优先级
     - 从方案恢复回阵型页
     - 删除方案并验证空态

结果：

- `firefox / chromium / webkit` 最小启动验证：全部通过
- 完整页面验收脚本：通过
- 结果标记：`VERIFICATION_OK`
- 验证截图目录：`/tmp/idle-champions-helper-shots`

---

## 6. 最终结论

本轮实现已经完成：

- 最近草稿的本地自动保存 / 恢复
- 命名方案的保存 / 编辑 / 删除 / 恢复
- 版本感知的恢复校验与兼容恢复提示

最终确认结果：

- 在受限 Codex 会话中，Playwright 可能因为运行权限限制而无法启动
- 在 `danger-full-access` 会话中，Playwright 与完整页面验收链路均已通过
- 当前这条工作树上的“最近草稿 + 命名方案库”主流程，已经完成真实浏览器自动化点验
