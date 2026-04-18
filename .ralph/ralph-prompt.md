# Idle Champions Helper Ralph Prompt

## Goal
按 `.ralph/ralph-tasks.md` 逐项完成 Idle Champions Helper 的 UI / 交互 / 逻辑优化；只有在全部顶级任务真实完成并通过最终回归后，才输出 `<promise>COMPLETE</promise>`。

## Execution Rules
- 使用 Ralph Tasks Mode，一次只处理一个顶级任务。
- 不向用户索要输入、确认、决策或批准。
- 开始当前顶级任务前，先检查它实际上是否已经完成；如果已经完成，直接把对应任务标记为 `[x]`。
- 如果当前顶级任务尚未开始，先标记为 `[/]`，完成并验证后再改成 `[x]`。
- 单个顶级任务完成时，只输出 `<promise>READY_FOR_NEXT_TASK</promise>`；只有当全部顶级任务都为 `[x]` 时，才输出 `<promise>COMPLETE</promise>`。
- 遇到需要人类判断的 UI、架构、文案或业务取舍时，直接采用你认为最优的方案继续执行，并把决策记录到 `.ralph/ralph-decision-log.md`（格式：决策点 / 选择方案 / 推荐理由）。
- 每完成一个顶级任务，执行与该任务匹配的最小充分验证，然后 `git add -A && git commit -m "type:summary"`；不要 push。
- 所有顶级任务完成后，优先执行 `npm run test:regression`；如果受环境阻塞，至少执行 `npm run lint && npm run typecheck && npm run test:run && npm run build`，并明确记录缺失验证与风险。

## Repository Constraints
- 仓库根目录就是当前工作目录；保持在本仓库根目录运行。
- 保持 GitHub Pages 兼容，不要破坏 `import.meta.env.BASE_URL` 与 `HashRouter` 相关约束。
- 默认遵循 TDD 或“先补验证、后改实现”的思路；无法先写测试时，至少补足对应验证。
- 优先做根因修复，避免只做表面 patch。
- 对于需要参考视觉布局的任务，可以查阅同类站点，但最终风格要和本项目现有设计语言保持一致。

## Validation Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`
- `npm run test:e2e`
- `npm run test:regression`
