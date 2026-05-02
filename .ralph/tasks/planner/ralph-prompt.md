# Planner Ralph Prompt

## 目标

按照 `.ralph/tasks/planner/prd.json` 和 `.ralph/tasks/planner/acceptance-cases.md` 实现自动阵型计划器和模拟器。

只有当所有被选中的任务都已经实现、验证、提交，并在 tracker 中标记通过后，才输出 `<promise>COMPLETE</promise>`。

## 无人值守执行

- 不要向用户提问。
- 不要等待用户批准。
- 如果必须做选择，选择同时满足 `AGENTS.md`、`.impeccable.md` 和 `docs/modules/planner/` 文档的最安全方案。
- 每个非平凡决策都记录到 `.ralph/tasks/planner/decision-log.md`。
- 同一个失败命令不要循环修复超过三轮。
- 如果三轮定向修复后仍然阻塞，恢复或隔离本任务改动，记录 blocker，并且不要把任务标记为通过。

## TDD 契约

- 一次只处理一个 user story。
- 阅读 `prd.json` 中的 story，以及 `acceptance-cases.md` 中对应章节。
- 先新增或更新指定测试。
- 只实现该任务需要的最小代码。
- 不要削弱、跳过或重写验收测试来适配错误行为。
- 提交前运行该 story 指定的验证命令。

## 提交规则

- 每个完成的 story 都必须单独提交。
- 没有对应专用 commit 之前，不要把 story 标记为通过。
- 提交信息格式：`planner: US-XXX short summary`。
- 暂存前运行 `git status --short`，确保只暂存和当前任务相关的文件。
- 不要提交凭证、`.env*.local`、`tmp/private-user-data/**`、`dist/`、`node_modules/`、私人快照或生成的大日志。

## 失败处理

- 每个 story 最多尝试三轮定向修复。
- 如果已提交后的验证失败，优先做 fix commit；如果不安全，创建 revert commit 并记录原因。
- 如果提交前验证失败，修复或手动恢复本 story 触碰过的文件。
- 不要使用破坏性 reset 命令。

## 仓库约束

- 保持 GitHub Pages 兼容：保留 `HashRouter` 行为和 `import.meta.env.BASE_URL` 假设。
- UI 任务只使用 DOM、文本和状态断言；不要依赖截图或图片识别。
- 隐私任务必须证明真实凭证和私人快照不能进入已提交文件或构建产物。
- 未知或暂不支持的模拟变量必须暴露为 warning 或 TODO，不能静默当作已计算。

## 验证基线

每个 story 都有自己的验证命令。共享或最终任务可能需要：

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`
- `npm run privacy:scan`
