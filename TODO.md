<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- planner scenarioSelection 组件测试失败：组件与测试的详情文案不一致 <!-- auto-todo:id=atd_8019e19b24 -->
  - 记录时间: `2026-07-18T16:51:22+08:00`
  - 类型: issue
  - 备注: tests/component/plannerPage.scenarioSelection.test.tsx:127 期望详情面板出现 /目标区域：175/，但组件 PlannerScenarioSelection.tsx:359 实际渲染的是 "175 区完成"（t({zh:`{area} 区完成`})），不含 "目标区域：" 前缀。
    - 性质：pre-existing 文案不一致（改了组件文案未同步测试，或反之），与本次 lint 清债、依赖升级均无关（stash 验证：无 lint 改动也失败）
    - 影响：test:regression 的 test 阶段仍有 1 个失败（lint/typecheck/build/e2e 均绿）
    - 处置：需 planner 特性作者确认详情面板应展示 "目标区域：{area}" 还是 "{area} 区完成"，再对齐组件或测试
- userDataPage.syncFlow 组件测试在完整 test:run 下随机失败（flaky） <!-- auto-todo:id=atd_7c4b2e9a31 -->
  - 记录时间: `2026-07-18T17:42:00+08:00`
  - 类型: issue
  - 备注: tests/component/userDataPage.syncFlow.test.tsx 单独运行 11/11 通过，但在完整 test:run 或 test:component 下随机有 1~4 个测试 waitFor 超时，每次失败的测试不同（如 "同步错误展示时不包含凭证"、"开发模式切换到本地开发快照时不会覆盖浏览器同步快照"）。
    - 性质：pre-existing 测试隔离/时序问题。0e738403 基线 test:component 失败 4 个，HEAD 失败 2 个，与本次改动无关——范围内 user-sync 改动仅为类型标注（payload: unknown）+ eslint-disable 注释 + readInstanceId/toStringValue 严格化，均不触碰 fetch 错误路径（worktree 验证：0e738403 源码 + 当前依赖跑该文件 11/11 通过）。
    - 可能根因：测试用 `vi.stubGlobal('fetch', ...)` 但 afterEach 只 `vi.restoreAllMocks()`（不清理 stubGlobal），vitest.config 也未配 `unstubGlobals`；叠加完整运行时时序压力，导致 stub 残留或 waitFor 超时。
    - 影响：test:regression 的 test 阶段不稳定（lint/typecheck/build/e2e 不受影响）。
    - 处置：修复需改范围外代码（vitest.config 加 `unstubGlobals: true`，或 syncFlow/userProfileSourceResolver 测试 afterEach 加 `vi.unstubAllGlobals()`）；建议先确认根因再实施。本任务约束（不修改 0e738403..HEAD 范围外代码）内未修复。

<!-- auto-todo:end -->
