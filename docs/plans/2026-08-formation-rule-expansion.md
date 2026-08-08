# 阵型编辑规则扩展——标签表达式 + 属性门槛

**Status**: Accepted
**Type**: change
**Scope**: planner
**Created**: 2026-08-08
**需求**：`docs/requirements/formation-rule-expansion.md`（子项 4 标签资格限制 + TODO `atd_77cdaabdd1` / `atd_83446e06cd`）

## 问题

两个正确性缺陷导致 planner 为变体推荐不合格英雄：

1. **标签表达式 `^`（AND）未解析**（11 个变体）：`collectHeroRestrictions` 仅按 `|`（OR）拆分 `by_tags.tags`，忽略 `^`（AND）、`!`（取反）、括号。`lawful^good` 被当作单个 tag 字面量，永远无法匹配任何英雄。
2. **属性门槛完全未结构化**（~31 个变体）：restriction 文本中的「CON score of 13 or higher」等条件仅存为人类可读文本，planner 不消费。

## 方案

### Phase 1：标签表达式解析

**数据模型**：DNF（OR of ANDs）

```typescript
export interface TagClause {
  required: string[]   // 正向 tag，英雄须全部拥有
  forbidden: string[]  // 取反 tag（! 前缀），英雄须全部不拥有
}
export type TagExpression = TagClause[]  // 英雄匹配任一 clause 即合格
```

- `dwarf|gnome` → `[{required:["dwarf"]}, {required:["gnome"]}]`
- `lawful^good` → `[{required:["lawful","good"]}]`
- `!small^!dwarf^!gnome` → `[{forbidden:["small","dwarf","gnome"]}]`
- `(!good^!evil)|dragonborn` → `[{forbidden:["good","evil","chaotic","lawful"]}, {required:["dragonborn"]}]`

**改动范围**：

| 文件 | 改动 |
|---|---|
| `src/domain/types/formation.ts` | `Variant.allowedTags: string[]` → `allowedTagExpression: TagExpression`；定义 `TagClause` |
| `scripts/data/normalize-adventures.ts` | `collectHeroRestrictions` 解析 `^`/`!`/`()` → `TagClause[]`；`HeroRestrictions`/`VariantMetadata`/`NormalizedVariant` 类型同步 |
| `scripts/data/buildScenarioModels.ts` | `ScenarioModel.allowedTags` → `allowedTagExpression: TagClause[]` |
| `src/domain/planner/plannerModel.ts` | `OfficialPlannerScenarioModel.allowedTags` → `allowedTagExpression` |
| `src/domain/planner/recommendationEngine.ts` | `filterAndSortCandidateHeroes` + `collectEvaluationRestrictionWarnings` 消费结构化表达式 |

### Phase 2：属性门槛解析

**数据模型**：

```typescript
export interface AttributeRequirement {
  stat: AbilityScoreKey  // 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
  operator: '>=' | '<='
  value: number
}
```

- 来源：restriction 文本全局正则匹配 `(CON|INT|CHA|STR|DEX|WIS) (score )?of N or (higher|lower)`；按句拆分排除伤害修饰句（v319 "deal 400% additional damage" 中的 INT 非 usage restriction）；多属性门槛（v187 STR+DEX+CON 等 8 变体）一次性提取
- 英雄 abilityScores 已在 `HeroAbilityProfile.abilityScores`（build 期从 `champion-details` 投影），planner 直接可用

**改动范围**：

| 文件 | 改动 |
|---|---|
| `src/domain/types/formation.ts` | 定义 `AttributeRequirement` 类型 |
| `scripts/data/restrictions-parser.ts` | `parseRestrictions` 新增属性门槛提取（全局正则 + 伤害修饰句排除） |
| `scripts/data/buildScenarioModels.ts` | `ScenarioModel` 新增字段（从 `parseRestrictions` 结果直接取） |
| `src/domain/planner/plannerModel.ts` | `OfficialPlannerScenarioModel` 新增字段 |
| `src/domain/planner/recommendationEngine.ts` | 候选过滤消费属性门槛 |

### Phase 3：候选评估函数

提取 `matchesTagExpression` + `meetsAttributeRequirements` 纯函数（可复用、可测试），在 `filterAndSortCandidateHeroes` 和 `collectEvaluationRestrictionWarnings` 中调用。

### Phase 4：测试

- `scripts/data/restrictions-parser.test.ts` — 标签表达式 + 属性门槛解析
- `src/domain/planner/` 下新增或扩展 planner 候选过滤测试

### Phase 5：文档同步

- 更新 `docs/requirements/formation-rule-expansion.md`（标记完成项）
- 更新 `docs/research/gameplay/variant-restriction-catalog.md`（覆盖现状）
- 更新 `docs/specs/modules/formation/rules.md`（当前规则）
- 归档已完成 TODO 条目

## Checklist

- [x] P1: 定义 `TagClause` / `TagExpression` 类型
- [x] P1: 实现标签表达式解析器 + 测试（`tag-expression.test.ts` 17 tests）
- [x] P1: 数据管线传递结构化表达式
- [x] P1: planner 消费表达式（`matchesTagExpression`）
- [x] P2: 定义 `AttributeRequirement` 类型
- [x] P2: 实现属性门槛文本解析 + 测试（`restrictions-parser.test.ts` +9 tests）
- [x] P2: 数据管线传递属性门槛
- [x] P2: planner 消费属性门槛（`meetsAttributeRequirements`）
- [x] P3: 提取 `matchesTagExpression` + `meetsAttributeRequirements` 纯函数
- [x] P4: 全量测试通过（1501/1501）
- [x] P5: 文档同步 + TODO 清理（atd_77cdaabdd1 + atd_83446e06cd 已删）

## 审计修复（2026-08-08）

提交 `c3b3b442` 后深度审计发现并修复：

- **P1 多属性门槛只提取第一个**（8 变体丢属性）：`parseAttributeRequirement` 非全局正则 `.exec()` 仅返回首个匹配。改为 `matchAll` 全局提取。
- **P1 属性门槛产生虚假"未解析"警告**（104 场景）：`parseRestrictions` 在属性提取成功后仍走 warning 分支。增加 `addedAttr` 标记跳过。
- **P2 伤害修饰句误提取**（v319）：全局提取后 "deal ... damage" 中的 INT 被误当 usage restriction。按句拆分排除含 `deal` 的句子。
- **P2 测试夹具缩进错位**（6 文件 8 处）：`attributeRequirements` 迁移时 sed 式插入缩进不一致。统一修正。
