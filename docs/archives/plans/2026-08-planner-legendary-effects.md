# planner 传奇装备效果接入

**状态**: 已落地
**类型**: milestone
**范围**: planner（scoringBonusInputs + steadyStateScoring + recommendationEngine）、data 管线
**创建日期**: 2026-08-10

## 目标

将 990 条传奇装备效果接入 planner 评分链路，使评分反映玩家已锻造传奇装备的贡献。只做阶段一（存档驱动评分接入），不做无存档假设配置和锻造优先级建议。

## 数据现状

- 990 条传奇效果 = 165 英雄 × 6 槽，94 个唯一 effectId（跨英雄共享）
- 两种 effect key：`global_dps_multiplier_mult`（499）+ `hero_dps_multiplier_mult`（491）
- 四种组合：
  - 117 global_dps 无 per_crusader → 固定全队加成
  - 55 global_dps per_crusader 无 target_filters → 按阵型人数叠加
  - 327 global_dps per_crusader 带 target_filters → 按匹配英雄数叠加
  - 491 hero_dps 带 filter_targets → 条件定向加成
- 存档数据 `OwnedHero.legendaryBySlot[slotId] = { level, effectId, ... }`
- 等级缩放：`value = base × level`（线性，保守默认；需求文档 2^(L-1) 指数说未经验证）

## 方案

传奇效果与现有装备加成有三个本质差异：owned-aware（仅锻造槽位生效）、placement-aware（拥有者必须在阵型中）、per_crusader 计数依赖阵型组成。现有 `equipmentGlobalDpsByHero`（固定 per-hero addPercent）和 `externalHeroDpsContributions`（账号级、非 placement-aware）均无法覆盖全部场景。

新增 `LegendaryContribution` 类型，在 `computeExternalAggregate` 中做 placement-aware + count-aware 求值：

```typescript
interface LegendaryContribution {
  ownerHeroId: string           // 拥有者（必须在阵型中）
  pool: 'global' | 'hero'       // 全队池 / carry 条件池
  baseValue: number             // base × level（百分比基数）
  targetQualifier: HeroQualifier | null  // hero pool 的 buff 目标限定
  perCrusader: boolean          // 是否按阵型计数叠加
  countQualifier: HeroQualifier | null    // 叠加计数限定（null = 全体）
}
```

### 通道路由

| 类型 | per_crusader | 数量 | 处理方式 |
|------|-------------|------|---------|
| global_dps 无 per_crusader | 否 | 117 | 合入 `equipmentGlobalDpsByHero`（复用已有 placement-aware 求和） |
| global_dps per_crusader | 是 | 382 | LegendaryContribution → global 池，`baseValue × count` |
| hero_dps 带 filter | 否 | 491 | LegendaryContribution → hero 池，carry 匹配 targetQualifier |

### 评分引擎处理逻辑

在 `computeExternalAggregate` 中，对每个 LegendaryContribution：
1. 检查 ownerHeroId 是否在 placedEntries 中（placement-aware）
2. 若 perCrusader：`value = baseValue × countMatching(placedEntries, countQualifier)`
3. 否则：`value = baseValue`
4. global 池 → 并入 `globalAddPercent`；hero 池 → carry 匹配 targetQualifier 时并入 `externalHeroDpsAddPercent`

## 阶段 Checklist

- [x] 阶段 A: build 管线提取传奇效果目录 `legendary-effects-catalog.json`（94 条唯一定义） —— 验证：catalog 文件存在且条目数正确
- [x] 阶段 B: `legendaryEffects.ts` 类型 + `collectLegendaryContributions` 纯函数 + 单测 —— 验证：单测覆盖 4 种组合
- [x] 阶段 C: `scoringBonusInputs` 接入传奇目录 + `ScoringInput`/`aggregateExternalDamagePools` 集成 + 单测 —— 验证：评分含传奇贡献
- [x] 阶段 D: `usePlannerCollections` 加载目录 + `recommendationEngine` 透传 + 全量测试 —— 验证：build clean + 全测试过

## 验收

- 4 种传奇效果组合均正确接入评分
- 有存档时传奇贡献生效，无存档时空（向后兼容）
- placement-aware：拥有者不在阵型 → 贡献为零
- per_crusader 按实际匹配英雄数计数
- 全量测试通过 + build clean

## 落地后

- specs/ 更新点：
  - `docs/specs/modules/planner/architecture.md`：加成来源段补传奇装备
  - `docs/specs/modules/planner/simulator.md`：评估维度段补传奇效果
- 需求 `docs/requirements/2026-08-planner-legendary-effects.md` 移 `archives/requirements/` 标终态（阶段一已落地）
- 本 plan → 已落地 → 移 `archives/plans/`
