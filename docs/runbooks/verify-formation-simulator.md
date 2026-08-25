# 校验阵型模拟器

## 何时跑

调整模拟器引擎（scoring / 归一化 / 机制消费）后必须跑 `pnpm run test:simulator`，不得跳过。CI 列为模拟器相关 PR 的必过门控。

## 命令

```bash
pnpm run test:simulator
```

聚合：

- `pnpm run typecheck`（类型门控）
- vitest run 模拟器 + planner 域：`src/domain/simulator/**/*.test.ts` + `src/domain/planner/**/*.test.ts`（含 `championReferenceVerification` 英雄机制准确性对照）
- `pnpm run data:signal-coverage`（机制 supported 白名单一致性）
- 全英雄 evaluateFormation smoke（所有英雄 × 典型 variant 不崩溃、无 warning 外异常）

## 输出判断

- **类型/测试 fail**：按报错修；不得为通过测试削弱断言。
- **signal-coverage 偏差**：新增 stackFunc 须同步 `STACK_COUNT_RESOLVERS` + `SCORING_SUPPORTED_STACK_FUNCS`（`scoringSupportSync.test.ts` 守护）。
- **championReferenceVerification 偏差报告**：英雄/机制/公式/计算值/实测值/偏差%。偏差 ≥ 30% fail，须修正 scoring/归一化，或在 research 调研 md（`docs/research/gameplay/champion-mechanics/<heroId>.md`）标注合理根因后放宽断言。口径见 `docs/specs/modules/planner/champion-reference-verification.md`。

## 覆盖三维度

- **可用性**：smoke 跑通、类型绿、无运行时异常。
- **稳定性**：deterministic（同输入同输出）、beam search 排序稳定、worker 协议不崩。
- **准确性**：参照对照（`championReferenceVerification` 自动遍历所有 `*ReferenceData.ts`）。

## 归一化改动注意

`pipelineHash` 已覆盖 `scripts/data` + `src/domain/abilities` + `src/domain/effects` + normalize/fetch/build 三入口——`src/domain/abilities`（signalSemantics / heroPredicate / abilityModel / heroTargetingRelation 等）与 `src/domain/effects`（effect-string）的全部源文件都是数据管线 build 依赖，改归一化语义会自动触发 hero-abilities / feat-catalog / specialization-catalog 重建，无需手动 force。

`FORCE_DATA_REBUILD=1` 作通用逃生口（如怀疑指纹漏检、产物异常，或强制覆盖增量跳过）：

```bash
FORCE_DATA_REBUILD=1 pnpm run data:official   # 含网络 fetch
# 或离线（需指定快照）：
FORCE_DATA_REBUILD=1 pnpm exec tsx scripts/normalize-idle-champions-definitions.ts --input <source.json> --localizedInput <lang7.json>
FORCE_DATA_REBUILD=1 pnpm exec tsx scripts/data/build-models.ts
```
