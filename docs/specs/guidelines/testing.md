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
| E2E | playwright | `tests/e2e/**` |
| 运维（bash） | bash | `scripts/ops/test_*.sh` |

新增测试目录必须同步扩展对应运行器 glob；测试存在但不被任何运行器扫到 = 游离，禁止。运维 bash 脚本测试用 `bash scripts/ops/test_*.sh` 跑（co-located，临时仓库自包含，不进 vitest），shellcheck 全量 gate；约定见 `scripts/ops/AGENTS.md`。

接入 `test` / `test:xxx` 链的脚本步骤必须真 gate：有断言 + 失败时非零退出码。只打印报告不断言不构成 gate——要么加阈值/快照断言（真实数据 gate），要么移出测试链。`signal-coverage` 的 gate 模式：`main()` 比对 `signal-coverage-baseline.json` 关键计数，漂移 `exit 1` + 打印 diff，`--update-baseline` 显式确认。详见 `docs/audits/scripts-audit.md` §2 #1。

## 4. 配置约束

- `tsconfig.app.json` exclude `src/**/*.test.*`、`src/**/*.spec.*`：测试不进生产类型检查与构建产物。
- `tsconfig.test.json` include 覆盖全部测试位置（`tests/**` + `src/**/*.test.*` + `scripts/**/*.test.ts`）。
- `eslint.config.js` 测试宽松规则覆盖 `**/*.test.*`、`**/*.spec.*` 与夹具模式（`*TestHarness`、`*TestData`、`*Fixture`、`*Fixtures`、`*TestUtils`）。

## 5. 夹具纪律

- 禁止重复夹具：一模一样或仅配置不同的 setup/data 必须抽公共，不得散落各测试。
- 公共夹具放主被测模块同目录；跨模块多处复用时，提取到被复用模块邻近的独立单元并显式导出。
- 夹具命名：`*TestHarness`（渲染壳）、`*TestData`（数据）、`*Fixture`（固定输入）、`*TestUtils`（工具函数）。

## 6. 守护测试

- 跨边界一致性（如 src 侧 scorer 与 scripts 侧脚本的平行白名单）无法合并为单一来源时，必须配 keys 同步守护测试，任一侧变更时强制失败。
- 数据管线（归一化→评分→展示等多级流水线）除逐级手搓输入单测外，必须配真实产物端到端守护测试（加载 built JSON 喂入完整链路，断言最终输出）。手搓输入会掩盖级间集成回归——级 A 实际产出偏离级 B 假设输入时，手搓单测仍绿。
- 真实产物端到端守护必须覆盖**聚合层**（pool/total/carryDps），不能只断言中间信号值。`championReferenceVerification` 曾只断言 per-signal multiplier（16384/576）而跳过 pool 聚合值（以为「pool 非直接可比」），致 22× buff_upgrade 双重计数漏网数月。聚合整体难对照时，断言其**组成**（addPercent 各来源、各 pool 分量）而非整体跳过——「难对照」不是跳过聚合层覆盖的理由。
- breakdown/分解因子声称「因子之积 = 目标值」（如 `SimulationBreakdown.factors` 之积 = `carryDps`）时，必须配**组合测试**：多个因子同时非默认值时断言因子之积确实复现目标值。尤其当多个来源**加法合并进同一 add pool**（如装备 + 外部 hero_dps 同为 `hero_dps_multiplier_mult`）时——单来源非默认的测试会漏掉「来源间非各自独立乘、而是同池加法」的口径错误。`heroDpsPool` 曾把 equipment/external 分列为两个独立 × 因子，实际却加法合并，双来源同时生效时因子相乘 ≠ carryDps，违反 `computation-runtime.md` 声明的因子之积契约；根因是新增 #9 外部 hero_dps 通道接入 add pool 时未同步更新 breakdown 外露口径。

## 7. 类型检查门控

- 所有测试入口（`test` / `test:run` / `test:unit` / `test:component` / `test:data`）必须先过 `npm run typecheck`（`test:regression` 经 `test:run` 间接覆盖，不重复显式调用）。
- vitest 用 esbuild 转译、**不做类型检查**；测试绿不等于类型正确。曾因 `.d.ts` 漏声明（mergeHeroQualifiers）导致 `tsc` 长期红、却被 vitest 绿色掩盖。typecheck 增量 ~5s，相对测试本体（~20-50s）非瓶颈，任何入口都不得绕过。
- 新增测试入口同样必须链 `npm run typecheck &&`。

## 8. 数据 schema 门控（zod）

- 职责分工：zod 守**外来数据**（运行时形状校验 + CI 拦截），TS 守**内部代码逻辑**（编译期类型）；外来 JSON 经 `JSON.parse` 为 `any`，形状漂移只能由 zod 运行时守门，TS 不替代 zod（`scripts/**/*.ts` 运行时类型注解被剥除，类型正确性仅靠 `tsc` 编译期把关）。
- 外部游戏数据（CNE definitions 归一化产物：`champions`/`adventures`/`patrons`/`variants`/`champion-details` 等）→ 对象 `.passthrough()`，只钉消费方依赖的核心字段，透传其余字段，不耦合上游字段增减。
- 项目自著内部数据（`semantic-overrides`/`manual-overrides`/`champion-animation-idle-overrides`/`resource-sync-state`/`version` 等）→ `.strict()`，白名单校验，未知字段即报错，防内部契约漂移。
- schema 放 `scripts/data/*-schema.ts`，co-located 测试 `*-schema.test.ts`（合法样本 + 类型/枚举/必填/nullable 变异拦截）；CI 经 `npm run data:validate-schema`（`validate-data-schemas.ts`）在真实产物上校验，坏数据非零退出。
