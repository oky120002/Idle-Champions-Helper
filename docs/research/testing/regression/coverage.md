# 回归测试覆盖范围

- 作用：定义回归测试必须覆盖的范围、当前状态与未来增强。

## 必须覆盖的范围

- 规则与数据：`seat` 冲突、`public/data/version.json` 读取、数据路径基于 `import.meta.env.BASE_URL`、用户导入解析 / 脱敏、归一化输出必填字段。
- 页面与路由：首页可开、导航可达、核心页面标题 / 空态 / 基础结构可渲染、数据加载失败有可见反馈。
- 浏览器级流程：首页进入各一级页面；GitHub Pages 路径下静态资源加载正常；`HashRouter` 路由切换可用；个人数据输入与脱敏预览可跑通。

## 当前状态

- 测试基础设施：`Vitest`、RTL、`Playwright`、脚本骨架已接入。
- 最小可用回归：规则单测、数据路径与版本测试、首页 / 导航组件测试、Playwright 基础回归。
- 部署门禁：回归通过后才构建，artifact 上传成功后才部署。

## 技术栈

1. 逻辑与数据：`Vitest`
2. 组件与页面集成：`Vitest + React Testing Library`
3. 浏览器回归：`Playwright`
4. 主分支门禁：`push main` 跑完整回归，全部通过后才部署 GitHub Pages

## 未来增强

- 主分支治理：补分支保护、PR 必过检查、管理员不绕过检查，必要时要求部署成功后才允许合并。
- 主分支是否接受 flaky 重试通过：建议允许 1 次重试辅助定位，但把 flaky 视为问题。
- `main` 全量回归是否跑全浏览器矩阵：当前只跑 `chromium`，稳定后再评估 `firefox` / `webkit`。
- 是否继续允许直接推 `main`：允许则只能保证“不坏发布”；不允许则应转为「分支 → PR → 必过检查 → 合并 → main 全量回归 → deploy」。

## 依据

- 本地仓库：`package.json`、`.github/workflows/deploy.yml`、`src/app/App.tsx`、`src/data/client.ts`、`src/data/userImport.ts`、`src/rules/seat.ts`、`docs/investigations/runtime/local-run/README.md`
- 官方资料：GitHub protected branches、GitHub Pages custom workflows / publishing source、Playwright CI / retries / configuration、Testing Library、Vitest projects
