# Planner Ralph 任务包

这个任务包用于驱动自动阵型计划器和模拟器的 Ralph 无人值守开发。

## 入口

```bash
./.ralph/tasks/planner/run.sh
```

```bash
./.ralph/scripts/run-task.sh planner
```

两个命令都会读取本目录中的 `prd.json`、`ralph-prompt.md` 和 `decision-log.md`。

规划基座已经完成：`US-001` 和 `US-002` 由当前分支交付，不交给 Ralph 重做。后续无人值守实现建议从 `US-003` 开始：

```bash
RALPH_TASK_RANGE=3-34 RALPH_MAX_ITERATIONS=200 ./.ralph/scripts/run-task.sh planner
```

## 运行器

本机已在 `~/.bun/bin/ralph-tui` 安装 `ralph-tui 0.11.0`。planner 任务包默认使用它作为主运行器：

```bash
ralph-tui run --prd .ralph/tasks/planner/prd.json --agent claude --serial --headless
```

通用 wrapper 会额外传入任务包 prompt、输出目录、progress 文件和默认迭代限制。旧版 `ralph` 只在 `ralph-tui` 缺失时作为 fallback 使用。

注意：`ralph-tui 0.11.0` 的内置 `claude` agent 只接受 `sonnet`、`opus`、`haiku` 三个显式模型别名。默认保持 `RALPH_MODEL` 为空，让 `claude` CLI 使用本机默认模型；不要用 `RALPH_AGENT=claude RALPH_MODEL=glm-5.1`。

## 规则

- 串行、无人值守运行。
- 每个 user story 都必须遵循 TDD。
- 每个完成的 story 都单独提交，提交格式为 `planner: US-XXX ...`。
- 不提交凭证、私人快照、`.env*.local`、`tmp/private-user-data/**`、`dist/` 或生成的依赖目录。
- 非平凡选择必须记录到 `decision-log.md`。

## 文件

- `prd.json`：Ralph 可读取的任务队列。
- `ralph-prompt.md`：给执行 agent 的运行规则。
- `acceptance-cases.md`：每个微任务的人读测试与 review 契约。
- `decision-log.md`：agent 决策和阻塞记录。
- `context/`：任务本地上下文，运行期间可以增长。
- `artifacts/`：简短验证摘要；不要提交大体积原始日志。
