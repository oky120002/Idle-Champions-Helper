# 回归测试：覆盖范围、阶段状态与 rollout

- 日期：2026-04-13
- 目标：回答“首批必须覆盖什么”“当前处在哪个阶段”“还有哪些未决点”。

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
