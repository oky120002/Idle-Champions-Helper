# 主分支整体回归测试框架设计

- 设计日期：2026-04-13
- 设计目标：为本项目建立一套面向 `main` 分支的整体回归测试框架，确保每次推送到 `main` 后都会执行完整回归，并且只有在回归通过后才允许发布到生产环境。
- 当前结论：**推荐采用“PR 快速门禁 + `main` 全量回归 + 通过后再部署 GitHub Pages”的三段式框架；其中生产发布必须严格依赖完整回归结果，不能与回归并行或绕过。**

---

## 1. 先说结论

### 1.1 生产门禁必须放在部署前，而不是部署后

当前仓库已经有 `GitHub Pages` 部署工作流，但它在 `push main` 后会直接构建并部署，缺少测试门禁。

如果目标是“**不能把有问题的东西提交到生产**”，最关键的调整不是先写很多测试，而是先把工作流改成下面这条强依赖链：

```text
push main
  ↓
质量检查
  ↓
单元 / 规则 / 数据回归
  ↓
页面与流程回归
  ↓
生产构建
  ↓
Pages 部署
```

只有当前面全部通过时，部署作业才允许运行。

### 1.2 仅靠 `push main` 后跑工作流，不能阻止坏提交进入 `main`

如果保留“直接推送到 `main`”的开发方式，GitHub Actions 可以做到：

- 阻止坏构建发布到生产
- 为失败提交留下明确报告

但它**不能在提交已经推上 `main` 之后，再阻止这次提交进入 `main` 历史**。

因此要区分两个目标：

1. **不让坏东西进生产**：可以通过 `push main` 后完整回归 + 部署依赖回归达成。
2. **不让坏东西进 main**：需要额外启用分支保护、PR 审核和必过检查。

### 1.3 推荐最终形态

推荐分三层执行：

1. **本地层**：开发时运行快速测试，缩短反馈回路。
2. **PR 层**：在 `pull_request -> main` 时跑快速门禁，尽量在合并前发现问题。
3. **主分支层**：在 `push main` 时跑完整回归，全部通过后才部署 GitHub Pages。

这个结构既满足你“每次 `push main` 要做整体回归”的要求，也能给后续分支保护留出升级空间。

---

## 2. 当前仓库现状

### 2.1 已有基础

- 技术栈已固定为 `Vite + React + TypeScript`
- 已有 GitHub Pages 自定义工作流：`.github/workflows/deploy.yml`
- 已有基础质量脚本：
  - `npm run lint`
  - `npm run build`
- 页面骨架已具备：
  - `总览`
  - `英雄筛选`
  - `变体限制`
  - `阵型编辑`
  - `方案存档`
  - `个人数据`

### 2.2 当前缺口

- `package.json` 里还没有 `typecheck`、单元测试、组件测试、端到端测试脚本
- 仓库里还没有 `Vitest`、`Playwright`、`React Testing Library` 等测试基础设施
- 当前部署工作流没有把“测试通过”作为部署前置条件
- 当前本地 `preview` 与 GitHub Pages 的 `base` 路径存在差异，直接访问根路径时会出现白屏，这意味着回归测试不能只测“本地根路径是否打开”，而必须测**贴近 GitHub Pages 的真实访问路径**

### 2.3 本阶段设计边界

本次先完成“框架设计”，不在这一轮直接把所有测试基础设施全部落地。

本轮设计输出应当回答清楚：

- 用什么测试分层
- 哪些内容进入 `main` 的完整回归
- GitHub Actions 如何串起回归与部署
- 哪些点必须先做，哪些点可以后补

---

## 3. 推荐测试分层

## 3.1 第一层：静态质量门禁

目标：尽早拦截低成本问题。

建议纳入：

- `lint`
- `typecheck`
- `build`

建议脚本：

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "build": "tsc -b && vite build"
  }
}
```

职责：

- `lint`：拦语法风格、潜在误用、未处理变量等问题
- `typecheck`：拦类型漂移、接口变更、字段不一致
- `build`：拦真实构建阶段错误，确保部署产物能生成

### 3.2 第二层：单元 / 规则 / 数据回归

目标：验证“逻辑是否正确”，而不是页面是否能打开。

推荐使用：

- `Vitest`

建议覆盖：

- `src/rules/`：规则判断，例如阵位冲突、限制判定
- `src/data/`：数据访问、路径拼接、版本读取、脱敏解析
- `scripts/`：数据抓取与归一化脚本的纯函数部分
- `public/data/`：结构化数据文件格式、字段完整性、枚举一致性

建议目录：

```text
tests/
  unit/
  data/
  fixtures/
```

建议脚本：

```json
{
  "scripts": {
    "test:unit": "vitest run --project unit",
    "test:data": "vitest run --project data"
  }
}
```

### 3.3 第三层：组件与页面集成测试

目标：验证组件和页面在 React 环境中的交互闭环，不依赖真实浏览器全链路。

推荐使用：

- `Vitest`
- `React Testing Library`

建议覆盖：

- 顶层路由与导航是否渲染正确
- 页面标题、核心说明、空态文案是否出现
- 筛选表单、基础交互、提示文本、异常态渲染
- 用户操作后 DOM 是否按预期变化

建议目录：

```text
tests/
  component/
  page/
```

建议脚本：

```json
{
  "scripts": {
    "test:component": "vitest run --project component"
  }
}
```

### 3.4 第四层：浏览器级回归测试

目标：验证真实浏览器里的页面加载、路由、关键流程与部署路径。

推荐使用：

- `Playwright`

建议目录：

```text
tests/
  e2e/
    smoke/
    regression/
```

分成两类：

- `smoke`：页面能打开、导航可达、核心元素存在
- `regression`：关键用户路径，例如筛选、阵型编辑、个人数据导入入口、数据文件加载、错误提示

建议脚本：

```json
{
  "scripts": {
    "test:e2e:smoke": "playwright test tests/e2e/smoke",
    "test:e2e:regression": "playwright test tests/e2e/regression"
  }
}
```

---

## 4. 为什么这样分层

### 4.1 不把所有问题都压给 Playwright

如果所有测试都放到浏览器端回归：

- 反馈慢
- 维护成本高
- 定位失败原因困难

更合理的做法是：

- 规则问题由单元测试先拦
- 组件问题由组件测试先拦
- 真实流程问题再由 Playwright 做最终闭环确认

### 4.2 `Vitest` 适合作为本项目的逻辑与组件测试底座

原因：

- 与 `Vite` 技术栈天然兼容
- 可以用一个 runner 管理多个测试项目
- 后续如有必要，还能扩展出浏览器模式或更多项目配置

### 4.3 `Playwright` 适合作为主分支生产门禁的最终回归层

原因：

- 可以直接跑真实浏览器
- 可以产出 HTML 报告、trace、截图等排错材料
- GitHub Actions 集成路径成熟，适合放进主分支回归

---

## 5. `main` 分支完整回归的建议定义

每次 `push main` 时，建议把“完整回归”定义为以下作业全部通过：

1. `lint`
2. `typecheck`
3. `test:unit`
4. `test:data`
5. `test:component`
6. `test:e2e:regression`
7. `build`

然后才允许：

8. `deploy`

也就是说，**部署不是完整回归的一部分，而是完整回归通过后的后续动作。**

---

## 6. GitHub Actions 设计建议

### 6.1 推荐工作流拆分

推荐拆成两个 workflow：

#### A. `ci.yml`

触发：

- `pull_request` 到 `main`
- `workflow_dispatch`

职责：

- 快速质量门禁
- 单元、数据、组件测试
- 轻量浏览器 smoke 测试

目的：

- 在进入 `main` 前尽早发现问题

#### B. `deploy.yml`

触发：

- `push` 到 `main`
- `workflow_dispatch`

职责：

- 跑 `main` 的完整回归
- 产出生产构建
- 上传 Pages artifact
- 只有全部通过时才部署

### 6.2 如果暂时不想拆两个 workflow

也可以先保守演进：

- 直接重构现有 `.github/workflows/deploy.yml`
- 把它改成“回归 + 构建 + 部署”的单工作流

建议作业链：

```text
quality
  ├─ lint
  └─ typecheck

tests
  ├─ unit
  ├─ data
  ├─ component
  └─ e2e-regression

build-pages
  └─ 依赖上述全部通过

deploy-pages
  └─ 仅依赖 build-pages 且只在 push main 时执行
```

### 6.3 主分支部署门禁的关键点

部署作业必须满足：

- 显式依赖构建作业
- 使用 GitHub Pages 环境
- 不允许与测试作业并行提前执行

这部分与 GitHub Pages 官方工作流约束一致。

---

## 7. Playwright 配置建议

### 7.1 CI 中优先稳定而不是并行速度

建议：

- CI 中 `workers = 1`
- 本地保持默认并行

这样更稳，更容易复现。

### 7.2 重试策略

建议：

- 本地默认 `retries = 0`
- CI 使用 `retries = 1`

原因：

- 允许偶发性环境抖动得到一次补救机会
- 仍然保持结果可读，不把真正不稳定的测试伪装成健康测试

### 7.3 失败证据

建议：

- `trace: 'on-first-retry'`
- `screenshot: 'only-on-failure'`
- `video: 'on-first-retry'` 或按成本决定是否启用

这样可以在失败时保留可追溯材料，但不让成功用例的产物过重。

### 7.4 基于 GitHub Pages 路径做回归，而不是只测根路径

这是本项目特有的关键点。

由于生产站点运行在 GitHub Pages Project 站路径下，浏览器级回归应当贴近真实访问方式：

- 要么测试地址直接使用 `/<repo-name>/`
- 要么在测试服务器里按仓库名挂载构建产物

不建议仅以 `http://127.0.0.1:4173/` 根路径作为唯一回归入口，否则会漏掉 `base` 路径相关问题。

---

## 8. 建议的测试目录与脚本框架

## 8.1 目录建议

```text
tests/
  unit/
    rules/
    data/
  component/
  page/
  e2e/
    smoke/
    regression/
  fixtures/
```

新增配置文件建议：

```text
vitest.config.ts
playwright.config.ts
```

### 8.2 推荐脚本清单

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run --project unit",
    "test:data": "vitest run --project data",
    "test:component": "vitest run --project component",
    "test:e2e:smoke": "playwright test tests/e2e/smoke",
    "test:e2e:regression": "playwright test tests/e2e/regression",
    "test:regression:ci": "npm run lint && npm run typecheck && npm run test:unit && npm run test:data && npm run test:component && npm run test:e2e:regression && npm run build"
  }
}
```

说明：

- `test:regression:ci` 对应 `push main` 的完整回归
- PR 阶段可只跑更轻的组合，例如 `lint + typecheck + unit + data + component + e2e:smoke`

---

## 9. 首批必须覆盖的回归范围

第一批不要追求覆盖面极大，先把“生产最容易坏、最值得拦”的地方做起来。

### 9.1 规则与数据

- `seat` 冲突判断
- 版本文件 `public/data/version.json` 读取
- 数据路径拼接是否正确使用 `import.meta.env.BASE_URL`
- 用户导入解析与脱敏逻辑
- 数据归一化输出的必填字段

### 9.2 页面与路由

- 首页可打开
- 导航链接可跳到各页面
- 各核心页面标题、空态说明、基础结构能渲染
- 数据文件加载失败时有可见反馈，而不是静默白屏

### 9.3 浏览器级流程

- 从首页进入各一级页面
- GitHub Pages 路径下静态资源能正确加载
- `HashRouter` 路由切换可用
- 个人数据页面的输入与脱敏预览流程可跑通

---

## 10. 分阶段落地建议

### 阶段一：测试基础设施

先补：

- `Vitest`
- `React Testing Library`
- `Playwright`
- `typecheck` / `test:*` 脚本
- 回归目录骨架

### 阶段二：最小可用回归

先补：

- 规则单元测试
- 数据路径与版本测试
- 首页与导航组件测试
- Playwright smoke

目标：

- 让 `push main` 至少具备“不会白屏、不会路径错、不会核心规则直接坏掉”的门禁能力

### 阶段三：完整部署门禁

把现有 Pages workflow 改成：

- 回归通过后才构建
- 构建通过后才上传 artifact
- artifact 上传成功后才部署

### 阶段四：主分支治理增强

如果后续要进一步做到“坏东西尽量不要进 `main`”，再补：

- 分支保护
- PR 必过检查
- 管理员不绕过检查
- 可选：要求部署成功后才允许合并

---

## 11. 当前建议的最终决策

本项目回归测试框架建议确定为：

1. **逻辑与数据：`Vitest`**
2. **组件与页面集成：`Vitest + React Testing Library`**
3. **浏览器回归：`Playwright`**
4. **主分支门禁：`push main` 跑完整回归，全部通过后才允许 GitHub Pages 部署**
5. **后续增强：再引入分支保护与 PR 必过检查，减少坏提交进入 `main` 的概率**

---

## 12. 待你确认的决策点

### 12.1 是否允许继续直接推送 `main`

如果允许：

- 可以保证“不坏发布”
- 但不能保证“不坏进入 main”

如果不允许，建议后续改成：

- 开发分支 -> PR -> 必过检查 -> merge main -> main 全量回归 -> deploy

### 12.2 主分支回归是否接受 flaky 重试通过

我当前建议：

- 允许一次重试帮助定位偶发失败
- 但把 `flaky` 视为需要尽快清零的告警，不应长期接受

### 12.3 `main` 全量回归是否一开始就跑全浏览器矩阵

我当前建议：

- 第一阶段只跑 `chromium`
- 等用例稳定后，再评估是否补 `firefox` / `webkit`

原因：

- 当前项目还是早期骨架
- 先保证门禁稳定，比一开始把矩阵铺太大更重要

---

## 13. 本次设计依据

### 本地仓库依据

- `package.json`
- `.github/workflows/deploy.yml`
- `src/app/App.tsx`
- `src/data/client.ts`
- `src/data/userImport.ts`
- `src/rules/seat.ts`
- `docs/investigations/runtime/local-run-verification.md`

### 官方资料

- GitHub Docs: About protected branches  
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub Docs: Using custom workflows with GitHub Pages  
  https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- GitHub Docs: Configuring a publishing source for your GitHub Pages site  
  https://docs.github.com/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Playwright Docs: Continuous Integration  
  https://playwright.dev/docs/ci
- Playwright Docs: Retries  
  https://playwright.dev/docs/test-retries
- Playwright Docs: Configuration  
  https://playwright.dev/docs/test-configuration
- React Testing Library Docs: Intro  
  https://testing-library.com/docs/react-testing-library/intro/
- Testing Library Docs: About Queries  
  https://testing-library.com/docs/queries/about/
- Vitest Docs: Test Projects  
  https://vitest.dev/guide/projects.html
