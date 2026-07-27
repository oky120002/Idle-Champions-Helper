# 校验阵型模拟器

## 何时跑

调整模拟器引擎（scoring / 归一化 / 机制消费）后必须跑 `npm run test:simulator`，不得跳过。CI 列为模拟器相关 PR 的必过门控。

## 命令

```bash
npm run test:simulator
```

聚合：

- `npm run typecheck`（类型门控）
- vitest run 模拟器 + planner 域：`src/domain/simulator/**/*.test.ts` + `src/domain/planner/**/*.test.ts`（含 `championReferenceVerification` 英雄机制准确性对照）
- `npm run data:signal-coverage`（机制 supported 白名单一致性）
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

`src/domain/abilities/` 下的归一化逻辑改动**不被 pipelineHash 自动检测**（pipelineHash 只覆盖 `scripts/data/**` + 三入口）。改归一化后须 `FORCE_DATA_REBUILD=1` 强制重建 hero-abilities.json，否则产物仍是旧逻辑。

```bash
FORCE_DATA_REBUILD=1 npm run data:official   # 含网络 fetch
# 或离线（需指定快照）：
FORCE_DATA_REBUILD=1 npx tsx scripts/normalize-idle-champions-definitions.ts --input <source.json> --localizedInput <lang7.json>
FORCE_DATA_REBUILD=1 npx tsx scripts/data/build-models.ts
```
