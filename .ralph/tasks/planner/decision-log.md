# Planner Ralph 决策日志

本文件用于记录无人值守执行期间的选择、阻塞、fallback 和范围变化。

## 模板

```md
## YYYY-MM-DD HH:mm:ss +08:00 - US-XXX - 简短标题

- 状态：chosen | blocked | changed | fallback
- 决策：
- 原因：
- 考虑过的替代方案：
- 修改文件：
- 验证：
- 后续：
```

## 2026-05-03 02:27:18 +08:00 - US-002 - 标记 Ralph planner 任务包可运行

- 状态：chosen
- 决策：将 `prd.json` 中的 `US-002` 标记为 `passes: true`。
- 原因：US-002 是 Ralph 自举运行基座任务，已由当前规划分支提前完成并提交；继续让 Ralph 执行会造成“Ralph 还没准备好却要求 Ralph 准备自己”的自举冲突。
- 考虑过的替代方案：保留 US-002 未完成；删除 US-002；把 US-001 和 US-002 都标记完成。
- 修改文件：`.ralph/tasks/planner/prd.json`、`.ralph/tasks/planner/decision-log.md`。
- 验证：`.ralph/scripts/validate-task.sh planner` 已通过；`.ralph/scripts/status.sh planner` 能读取任务状态。
- 后续：US-001 当时尚未完成；后续已由当前规划分支完成，不交给 Ralph 执行。

## 2026-05-03 02:41:59 +08:00 - US-001 - Codex 完成 planner 文档

- 状态：chosen
- 决策：将 `prd.json` 中的 `US-001` 标记为 `passes: true`，后续 Ralph 从 `US-003` 开始实现。
- 原因：用户明确要求 PRD、开发设计、总体方案、细节流程和逐任务验收用例由 Codex 完成，弱模型只做后续开发实现。
- 考虑过的替代方案：让 Ralph 补文档；保留 US-001 未完成；只在聊天里说明不落库。
- 修改文件：`docs/modules/planner/**`、`docs/modules/README.md`、`docs/modules/user-data/user-data-import-design.md`、`docs/product/roadmap/value-and-positioning.md`、`AGENTS.md`、`.ralph/tasks/planner/prd.json`、`.ralph/tasks/planner/decision-log.md`。
- 验证：待最终执行 `test -f docs/modules/planner/development-design.md`、`test -f docs/modules/planner/final-todo.md`、`.ralph/scripts/validate-task.sh planner` 和敏感信息扫描。
- 后续：Ralph 只执行 `US-003` 及之后的业务实现 story。

## 2026-05-03 03:02:00 +08:00 - Runner - 不再默认传递 glm-5.1 给 Claude agent

- 状态：changed
- 决策：`.ralph/scripts/run-task.sh` 默认不再传递 `--model`；只有显式设置非空 `RALPH_MODEL` 时才追加 `--model`。
- 原因：`ralph-tui 0.11.0` 的内置 `claude` agent 只接受 `sonnet`、`opus`、`haiku`，传入 `glm-5.1` 会在 engine 初始化阶段失败；不传模型时可让 `claude` CLI 使用本机默认模型。
- 考虑过的替代方案：把默认模型改成 `sonnet`；继续要求用户运行 `RALPH_MODEL=`；改用其他 agent。
- 修改文件：`.ralph/scripts/run-task.sh`、`.ralph/README.md`、`.ralph/tasks/planner/README.md`、`docs/modules/planner/final-todo.md`、`docs/modules/planner/auto-formation-planner-plan.md`、`.ralph/tasks/planner/decision-log.md`。
- 验证：`RALPH_TASK_RANGE=1-2 RALPH_MAX_ITERATIONS=1 RALPH_DELAY_MS=100 ./.ralph/scripts/run-task.sh planner` 已通过；打印的命令不包含 `--model`，Ralph 成功初始化并因 `US-001`、`US-002` 已完成而 0 次迭代退出。
- 后续：`ralph-task-packager` 技能同步记录该经验，避免生成新的坏默认。
