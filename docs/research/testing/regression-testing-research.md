# 主分支整体回归测试框架设计

- 日期：2026-04-13
- 目标：让 `main` 只有在完整回归通过后才部署 GitHub Pages；后续再把门禁前移到 PR。
- 当前结论：采用“本地快反馈 + PR 快速门禁 + `main` 全量回归 + 通过后部署”的分层框架；部署永远依赖完整回归，不能并行绕过。
- 当前已落地：`Vitest`、`React Testing Library`、`Playwright` 已接入，`.github/workflows/deploy.yml` 已改成“回归 -> 构建 -> Pages 部署”。
- 当前缺口：业务规则 / 数据覆盖仍需补齐，`pull_request -> main` 的独立快速门禁 workflow 还未拆出。

## 目标与边界

- `push main` 后的工作流能保证“不坏发布”，但不能阻止坏提交已经进入 `main` 历史。
- 如果目标升级为“尽量不坏进入 `main`”，还要补分支保护、PR 审核和必过检查。
- 本文同时记录两件事：当前已落地的部署门禁；后续仍需补的测试分层与治理增强。

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

## GitHub Actions 设计

- 推荐最终拆成两个 workflow：
  - `ci.yml`：触发 `pull_request -> main` 与 `workflow_dispatch`；跑快速质量门禁、单元 / 数据 / 组件测试、轻量 smoke。
  - `deploy.yml`：触发 `push main` 与 `workflow_dispatch`；跑 `main` 完整回归、构建、上传 artifact、部署。
- 如果暂时不拆，单工作流也要显式保持依赖链：`quality -> tests -> build-pages -> deploy-pages`；`deploy-pages` 只能在 `push main` 且前序全过后运行。
- 部署门禁关键点：显式 `needs` 依赖构建作业；使用 GitHub Pages 环境；不允许与测试作业并行提前执行。

## Playwright CI 策略

- CI 优先稳定：`workers = 1`；本地可保持默认并行。
- 重试：本地 `0`；CI `1`。允许一次重试辅助定位偶发抖动，但 `flaky` 应视为待清零告警，不是健康状态。
- 失败证据：`trace: 'on-first-retry'`、`screenshot: 'only-on-failure'`、`video` 按成本决定。
- 路径口径：浏览器级回归必须覆盖 GitHub Pages 项目站路径；不能只测 `http://127.0.0.1:4173/` 根路径，否则会漏掉 `base` 与 `HashRouter` 问题。

## 首批必须覆盖的范围

- 规则与数据：`seat` 冲突、`public/data/version.json` 读取、数据路径是否基于 `import.meta.env.BASE_URL`、用户导入解析 / 脱敏、归一化输出必填字段。
- 页面与路由：首页可开、导航可达、核心页面标题 / 空态 / 基础结构可渲染、数据加载失败有可见反馈。
- 浏览器级流程：首页进入各一级页面；GitHub Pages 路径下静态资源加载正常；`HashRouter` 路由切换可用；个人数据输入与脱敏预览可跑通。

## 分阶段状态

| 阶段 | 当前状态 | 说明 |
| --- | --- | --- |
| 阶段一：测试基础设施 | 已完成 | `Vitest`、RTL、`Playwright`、脚本骨架已接入 |
| 阶段二：最小可用回归 | 已完成 | 已有规则单测、数据路径与版本测试、首页 / 导航组件测试、Playwright 基础回归 |
| 阶段三：完整部署门禁 | 已完成 | 当前是“回归通过后才构建，artifact 上传成功后才部署” |
| 阶段四：主分支治理增强 | 下一步 | 补分支保护、PR 必过检查、管理员不绕过检查，必要时要求部署成功后才允许合并 |

## 当前建议的最终决策

1. 逻辑与数据：`Vitest`
2. 组件与页面集成：`Vitest + React Testing Library`
3. 浏览器回归：`Playwright`
4. 主分支门禁：`push main` 跑完整回归，全部通过后才部署 GitHub Pages
5. 治理增强：后续再把门禁前移到 PR，并启用分支保护

## 仍需明确的决策点

- 是否继续允许直接推 `main`：允许则只能保证“不坏发布”；不允许则应转为“分支 -> PR -> 必过检查 -> 合并 -> main 全量回归 -> deploy”。
- 主分支是否接受 flaky 重试通过：建议允许 1 次重试辅助定位，但把 flaky 视为问题。
- `main` 全量回归是否一开始就跑全浏览器矩阵：建议先只跑 `chromium`，稳定后再评估 `firefox` / `webkit`。

## 依据

- 本地仓库：`package.json`、`.github/workflows/deploy.yml`、`src/app/App.tsx`、`src/data/client.ts`、`src/data/userImport.ts`、`src/rules/seat.ts`、`docs/investigations/runtime/local-run-verification.md`
- 官方资料：GitHub protected branches、GitHub Pages custom workflows / publishing source、Playwright CI / retries / configuration、Testing Library、Vitest projects
