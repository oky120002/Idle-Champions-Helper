# Planner 上下文备注

- 生产环境是 GitHub Pages 静态站，没有后端凭证存储。
- 生产环境中的凭证只在用户手动同步私人数据时，于浏览器内使用。
- 本地开发私人凭证必须保留在环境变量或 `.local` 文件中，输出只能进入 `tmp/private-user-data/`。
- planner 实现必须交给 Ralph 任务完成，不在规划分支里直接开发。
- `ralph-tui 0.11.0` 已安装在 `~/.bun/bin/ralph-tui`；优先使用它，不优先使用旧版 `ralph`。
- `ralph-tui doctor --json` 当前显示 `/opt/homebrew/bin/claude` 里的 Claude Code 健康。
