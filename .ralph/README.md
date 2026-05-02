# Ralph 任务编排

本目录是仓库内通用的 Ralph 任务编排层。顶层只保留通用脚本、模板和说明；具体功能任务统一放在 `.ralph/tasks/<task-name>/`。

## 当前工具

本机已经安装 `ralph-tui`，默认使用它作为 Ralph 运行器。

- 版本：`ralph-tui 0.11.0`
- 路径：`~/.bun/bin/ralph-tui`
- 默认 agent 插件：`claude`
- 当前预检：`ralph-tui doctor --json` 显示 Claude Code 健康

旧版 `ralph` 仍位于 `/opt/homebrew/bin/ralph`，只在 `ralph-tui` 不可用时作为 fallback 使用。

## 目录结构

```text
.ralph/
  README.md
  scripts/
  templates/
  tasks/
    planner/
    legacy-ui-polish/
```

## 常用命令

运行 planner 任务包：

```bash
./.ralph/scripts/run-task.sh planner
```

planner 任务包也提供了便捷入口：

```bash
./.ralph/tasks/planner/run.sh
```

查看任务进度：

```bash
./.ralph/scripts/status.sh planner
```

验证任务包结构：

```bash
./.ralph/scripts/validate-task.sh planner
```

确认或重新安装 `ralph-tui`：

```bash
./.ralph/scripts/install-ralph-tui.sh
```

## 服务器安装与执行

如果服务器还没有 Bun 和 `ralph-tui`，可以用这一行安装 Bun、把 Bun 路径写入 `~/.zshrc`，并安装 `ralph-tui`：

```bash
curl -fsSL https://bun.sh/install | bash && LINE='export BUN_INSTALL="$HOME/.bun"; export PATH="$BUN_INSTALL/bin:$PATH"' && touch ~/.zshrc && { grep -qxF "$LINE" ~/.zshrc || echo "$LINE" >> ~/.zshrc; } && export BUN_INSTALL="$HOME/.bun" PATH="$BUN_INSTALL/bin:$PATH" && bun install -g ralph-tui && ralph-tui --version
```

服务器仓库路径为 `/Users/rain/Workspaces/Idle-Champions-Helper` 时，直接运行 planner：

```bash
cd /Users/rain/Workspaces/Idle-Champions-Helper && export BUN_INSTALL="$HOME/.bun" PATH="$BUN_INSTALL/bin:$PATH" && ./.ralph/scripts/run-task.sh planner
```

只验证 1-2 号任务时：

```bash
cd /Users/rain/Workspaces/Idle-Champions-Helper && export BUN_INSTALL="$HOME/.bun" PATH="$BUN_INSTALL/bin:$PATH" && RALPH_TASK_RANGE=1-2 RALPH_MAX_ITERATIONS=2 ./.ralph/scripts/run-task.sh planner
```

脚本本身没有写死服务器路径：`run-task.sh` 和任务本地的 `run.sh` 都会根据脚本所在目录反推仓库根目录。上面的绝对路径只是服务器 checkout 位置示例。

服务器无人值守运行前，建议先确认 Claude Code 可用：

```bash
cd /Users/rain/Workspaces/Idle-Champions-Helper && export BUN_INSTALL="$HOME/.bun" PATH="$BUN_INSTALL/bin:$PATH" && claude --version && ralph-tui doctor --json
```

`ralph-tui 0.11.0` 的内置 `claude` agent 默认 `skipPermissions = true`，会用 `claude --print --dangerously-skip-permissions` 启动 Claude Code，避免夜间任务卡在权限确认。通用 `run-task.sh` 也默认传 `--no-sandbox`，让 Ralph 自身不额外收窄文件或网络权限；如果要临时开启 Ralph sandbox，可以显式设置：

```bash
RALPH_SANDBOX=auto ./.ralph/scripts/run-task.sh planner
```

即便开启了 Claude 全权限，Claude Code / 服务器系统 / Git 凭据 / 网络环境仍可能限制部分操作；遇到不能自动处理的问题时，planner prompt 会要求记录失败原因和下一步建议。

## 目录规则

- `.ralph/scripts/**`：只放通用脚本，不写具体功能业务逻辑。
- `.ralph/templates/**`：放可复用的 prompt、决策日志和验收用例模板。
- `.ralph/tasks/<task-name>/**`：放某个任务专属的 PRD、prompt、决策、上下文和精选产物。
- `.ralph/tasks/planner/**`：自动计划模块的 Ralph 任务包。
- `.ralph/tasks/legacy-ui-polish/**`：从旧 Ralph 循环迁移过来的历史任务文件。

大型原始日志、临时上下文、私人游戏数据和模型草稿应放在任务本地的忽略目录或 `tmp/`，不要散落到仓库根目录。

## 默认运行行为

`run-task.sh` 会从 `.ralph/tasks/<task-name>/` 读取这些文件：

- `prd.json`
- `ralph-prompt.md`
- `decision-log.md`

默认以 headless、串行模式运行 `ralph-tui`，默认 agent 是 Claude Code。默认不传 `--model`，让 `claude` CLI 使用它自己的默认模型：

```bash
RALPH_AGENT=claude ./.ralph/scripts/run-task.sh planner
```

常用覆盖参数：

```bash
RALPH_TASK_RANGE=1-3 ./.ralph/scripts/run-task.sh planner
RALPH_MAX_ITERATIONS=20 ./.ralph/scripts/run-task.sh planner
RALPH_MODEL=sonnet ./.ralph/scripts/run-task.sh planner
RALPH_SANDBOX=auto ./.ralph/scripts/run-task.sh planner
```

注意：`ralph-tui 0.11.0` 的内置 `claude` agent 只接受 `sonnet`、`opus`、`haiku` 这三个显式模型别名。不要给 `RALPH_AGENT=claude` 传 `glm-5.1`；如果 Claude Code 本机默认模型已经配置为 GLM，则保持 `RALPH_MODEL` 为空。
