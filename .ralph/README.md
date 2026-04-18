# Ralph 循环使用说明

## 作用

本目录用于驱动 Idle Champions Helper 的 Ralph 循环开发流程。

- `run-ralph.sh`：启动脚本
- `ralph-prompt.md`：循环提示词与执行规则
- `ralph-tasks.md`：任务清单与进度文件

Ralph 的 Tasks Mode 会自动读取当前仓库根目录下的 `.ralph/ralph-tasks.md`，所以不需要单独传任务文件路径，但必须在仓库根目录运行。

## 速查

最常用的命令只有下面这几个：

```bash
./.ralph/run-ralph.sh
```

```bash
ralph --status --tasks
```

```bash
ralph --list-tasks
```

```bash
RALPH_MAX_ITERATIONS=80 ./.ralph/run-ralph.sh
```

```bash
RALPH_MODEL=gpt-5.4 ./.ralph/run-ralph.sh
```

## 快速开始

在仓库根目录执行：

```bash
./.ralph/run-ralph.sh
```

等价的完整步骤：

```bash
cd /Users/rain/Workspaces/Idle-Champions-Helper
./.ralph/run-ralph.sh
```

脚本会自动：

- 切到仓库根目录
- 检查本机是否安装了 `ralph` 和 `codex`
- 读取 `.ralph/ralph-prompt.md`
- 读取 `.ralph/ralph-tasks.md`
- 以 Ralph `--tasks` 模式逐个推进顶级任务

## 常用命令

启动循环：

```bash
./.ralph/run-ralph.sh
```

查看当前状态：

```bash
ralph --status --tasks
```

列出任务：

```bash
ralph --list-tasks
```

中断后继续跑：

```bash
./.ralph/run-ralph.sh
```

停止循环：

```bash
Ctrl+C
```

## 常用可选参数

提高最大迭代次数：

```bash
RALPH_MAX_ITERATIONS=80 ./.ralph/run-ralph.sh
```

指定模型：

```bash
RALPH_MODEL=gpt-5.4 ./.ralph/run-ralph.sh
```

指定 agent：

```bash
RALPH_AGENT=codex ./.ralph/run-ralph.sh
```

查看更详细日志：

```bash
./.ralph/run-ralph.sh --verbose-tools
```

## 文件职责

### `.ralph/run-ralph.sh`

启动脚本。默认会带上这些参数：

- `--tasks`
- `--completion-promise COMPLETE`
- `--task-promise READY_FOR_NEXT_TASK`
- `--max-iterations 40`
- `--no-questions`
- `--no-commit`

### `.ralph/ralph-prompt.md`

Ralph 每轮执行时使用的规则说明，主要控制：

- 一次只处理一个顶级任务
- 不向用户提问
- 单任务完成输出 `<promise>READY_FOR_NEXT_TASK</promise>`
- 全部完成输出 `<promise>COMPLETE</promise>`
- 完成后应做的验证与提交要求

### `.ralph/ralph-tasks.md`

真实任务进度文件。Ralph 会直接读取并更新这份任务列表。

任务状态含义：

- `[ ]`：未开始
- `[/]`：进行中
- `[x]`：已完成

如果要调整任务内容或手动修正进度，直接编辑这份文件。

## 使用建议

- 最好先切到一个 `codex/*` 分支，再启动循环，不要长期直接在 `main` 上跑开发任务。
- 如果 Ralph 中途退出，只要 `.ralph/ralph-tasks.md` 还在，下次重新执行脚本就会从当前进度继续。
- 如果发现任务规则需要调整，优先修改 `.ralph/ralph-prompt.md`。
- 如果发现只是任务内容需要调整，优先修改 `.ralph/ralph-tasks.md`。

## 当前推荐流程

```bash
git checkout -b codex/ralph-loop-run
./.ralph/run-ralph.sh
```
