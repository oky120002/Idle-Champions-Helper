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
- `(!good^!evil^!chaotic^!lawful)|dragonborn` → `[{forbidden:["good","evil","chaotic","lawful"]}, {required:["dragonborn"]}]`

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

- 来源：restriction 文本全局正则匹配 `(CON|INT|CHA|STR|DEX|WIS) (score )?of N or (higher|lower)`；按句拆分，**白名单提取**——仅从含使用门槛标记（`can/may be used`、`only use`、`take part`）的句子提取，排除伤害修饰（deal）、伤害免疫（take no damage）、邻接位限制（placed adjacent）等条件效果句；多属性门槛（v187 STR+DEX+CON 等 8 变体）一次性提取
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

## 审计修复·第二轮（2026-08-08，`52025cb`）

提交 `c1372871` 后深度审计发现并修复：

- **属性门槛误提取——条件效果句被当使用门槛**（v865/v1984）：黑名单（排除 `deal`）漏了「take no damage」（v865 夺心魔 INT 15+ 免疫伤害）和「placed adjacent」（v1984 宝藏猎人 INT 12- 邻接位限制），误提为硬性候选过滤。改用**白名单**：仅从含 `can/may be used`、`only use`、`take part` 的句子提取。全量验证 104→102 变体（排除 2 误报），0 漏报。
- **复合对齐标记零匹配**（v1740）：游戏 `by_tags.tags` 用 `lawful_good` 等复合标记，英雄标签是对齐轴独立的（`lawful` + `good`），不展开则 0 英雄匹配。`parseAtom` 展开全部 9 种复合对齐为 AND 分量；patch variants.json 同步存量数据。v1740 候选池 0→78 英雄。
- **死代码清理**：`isTrivialRestriction` 的 `text.length === 0` 恒 false（拼接含空格），移除。

## 审计修复·第三轮（2026-08-08）

提交 `09778734` 后深度审计发现并修复：

- **P2 `addedAttr` 条目级警告全抑制**（65 变体丢 warning）：属性门槛提取成功后完全抑制该条目的 warning，即使同时含敌人刷新/伤害调整等特殊机制句。改为句级分析 `hasResidualMechanics`——仅当全部非平凡句均被属性/trivial/占格覆盖时才抑制。同时修复重复属性门槛产生虚假 warning 的 bug（`addedAttr` → `extractedAttrs.length > 0`）。TODO atd_ed67350994 已删。
