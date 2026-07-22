# 测试组织规范

项目级硬约束。新增与迁移测试必须遵守。本文件只写规则，不写说明。

## 1. Co-located

- 单元测试、组件测试、测试夹具（harness/fixture/testData/testUtils）co-located 到被测模块的同目录。
- 测试文件命名 = 被测文件名（保留大小写）+ `.test.{ts,tsx}`：被测 `foo.ts` → `foo.test.ts`；被测 `ChampionAvatar.tsx` → `ChampionAvatar.test.tsx`。大小写必须与被测一致。
- 多个测试覆盖同一被测时，用 `{被测名}.{主题}.test.{ext}` 区分；被测为逻辑页（无单一 Page 文件、经 `xxxPageTestHarness` 组装）时，主题前缀用 camelCase 页名（`championsPage.filters.test.tsx`）。
- 测试跟随主被测模块：被测在 `src/` 还是 `scripts/`，测试就在那。
- 删除模块时必须连同测试与夹具一起删除（零残留）。

## 2. 集中例外

- E2E 测试：`tests/e2e/`（无单一归属模块）。
- 全局测试 setup：`tests/setup/`。
- 除以上两项，不得在 `tests/` 下放测试或夹具。

## 3. 运行器接入

| 类型 | 运行器 | glob |
|---|---|---|
| 单元（node） | vitest `unit` | `src/**/*.test.ts`、`scripts/**/*.test.ts` |
| 组件（jsdom） | vitest `component` | `src/**/*.test.tsx` |
| 数据脚本 | `node:test` | `scripts/**/*.test.mjs`（`npm run test:data`）|
| E2E | playwright | `tests/e2e/**` |

新增测试目录必须同步扩展对应运行器 glob；测试存在但不被任何运行器扫到 = 游离，禁止。

## 4. 配置约束

- `tsconfig.app.json` exclude `src/**/*.test.*`、`src/**/*.spec.*`：测试不进生产类型检查与构建产物。
- `tsconfig.test.json` include 覆盖全部测试位置（`tests/**` + `src/**/*.test.*` + `scripts/**/*.test.ts`）。
- `eslint.config.js` 测试宽松规则覆盖 `**/*.test.*`、`**/*.spec.*` 与夹具模式（`*TestHarness`、`*TestData`、`*Fixture`、`*Fixtures`、`*TestUtils`）。

## 5. 夹具纪律

- 禁止重复夹具：一模一样或仅配置不同的 setup/data 必须抽公共，不得散落各测试。
- 公共夹具放主被测模块同目录；跨模块多处复用时，提取到被复用模块邻近的独立单元并显式导出。
- 夹具命名：`*TestHarness`（渲染壳）、`*TestData`（数据）、`*Fixture`（固定输入）、`*TestUtils`（工具函数）。

## 6. 守护测试

- 跨边界一致性（如 `.ts` scorer 与 `.mjs` 脚本的平行白名单）无法合并为单一来源时，必须配 keys 同步守护测试，任一侧变更时强制失败。

## 7. 类型检查门控

- 所有测试入口（`test` / `test:run` / `test:unit` / `test:component` / `test:data`）必须先过 `npm run typecheck`（`test:regression` 经 `test:run` 间接覆盖，不重复显式调用）。
- vitest 用 esbuild 转译、**不做类型检查**；测试绿不等于类型正确。曾因 `.d.ts` 漏声明（mergeHeroQualifiers）导致 `tsc` 长期红、却被 vitest 绿色掩盖。typecheck 增量 ~5s，相对测试本体（~20-50s）非瓶颈，任何入口都不得绕过。
- 新增测试入口同样必须链 `npm run typecheck &&`。
