# 本地开发与预览

## 选择入口

| 任务 | 命令 |
| --- | --- |
| 日常开发与联调 | `npm run dev` |
| 验证 GitHub Pages 基线路径 | 先 `npm run build`，再 `npm run preview:pages` |
| 只检查现有 `dist/` 是否可服务 | `npm run preview` |

根路由会重定向到英雄筛选页。验证当前页面范围以 `src/app/App.tsx` 的路由为准，不把未挂载页面当作入口。

## Pages 预览

`preview:pages` 只读取当前 `dist/`。源码变化后必须先重新构建；不确定服务是否对应最新产物时，停止旧进程并重启。

验收至少确认：

- `/Idle-Champions-Helper/` 能返回页面。
- 静态资源从 `import.meta.env.BASE_URL` 对应路径加载。
- `HashRouter` 页面刷新和切换正常。

## 端口冲突

默认预览端口被占用或页面明显不是当前代码时：

1. 运行 `lsof -nP -iTCP:4173 -sTCP:LISTEN`，确认 PID 与工作目录。
2. 只停止已确认属于旧工作树的预览进程。
3. 在当前工作树重新执行 `npm run build` 和目标预览命令。
4. 重新检查页面路由、DOM 与静态资源路径。

不要因为端口已监听就假定它属于当前工作树。
