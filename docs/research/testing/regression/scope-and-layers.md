# 回归测试：目标、边界与分层

- 日期：2026-04-13
- 目标：回答“为什么要做这套门禁”“测试应分成哪几层”“当前仓库基线是什么”。

## 目标与边界

- `push main` 后的工作流能保证“不坏发布”，但不能阻止坏提交已经进入 `main` 历史。
- 如果目标升级为“尽量不坏进入 `main`”，还要补分支保护、PR 审核和必过检查。
- 本主题同时记录两件事：当前已落地的部署门禁；后续仍需补的测试分层与治理增强。

## 推荐分层

| 层级 | 工具 | 职责 | 建议目录 / 脚本 |
| --- | --- | --- | --- |
| 静态质量门禁 | `eslint`、`tsc`、`vite build` | 语法、类型、构建错误 | `lint`、`typecheck`、`build` |
| 单元 / 规则 / 数据回归 | `Vitest` | `src/rules/`、`src/data/`、`scripts/` 纯函数、`public/data/` 合同与一致性 | `tests/unit/`、`tests/data/`、`test:unit`、`test:data` |
| 组件 / 页面集成 | `Vitest + React Testing Library` | 路由、页面标题、空态、筛选表单、交互后的 DOM 变化 | `tests/component/`、`tests/page/`、`test:component` |
| 浏览器级回归 | `Playwright` | 真实浏览器里的加载、路由、关键流程、部署路径 | `tests/e2e/smoke/`、`tests/e2e/regression/`、`test:e2e:*` |

原则：不要把所有问题都压给 Playwright；规则问题先让单元测试拦，组件问题先让集成测试拦，真实流程问题再交给浏览器层。

## 当前仓库基线

- 技术栈：`Vite + React + TypeScript`
- 现有脚本：`lint`、`typecheck`、`test:run`、`test:unit`、`test:component`、`test:e2e`、`test:regression`、`build`
- 关键源码：`src/app/App.tsx`、`src/data/client.ts`、`src/data/userImport.ts`、`src/rules/seat.ts`
- 当前部署链路：`.github/workflows/deploy.yml` 已是“完整回归与构建 -> 上传 Pages artifact -> 部署”
- 环境约束：本地预览与 GitHub Pages `base` 路径不同，页面回归和产物验收优先走 `npm run preview:pages` 与 `scripts/serve-github-pages-preview.mjs`

## `main` 完整回归定义

- 当前已落地口径：`lint -> typecheck -> test:run -> test:e2e -> build -> deploy`
- 建议长期口径：`lint -> typecheck -> test:unit -> test:data -> test:component -> test:e2e:regression -> build -> deploy`
- PR 快速门禁可轻量一些：`lint + typecheck + unit + data + component + e2e:smoke`
