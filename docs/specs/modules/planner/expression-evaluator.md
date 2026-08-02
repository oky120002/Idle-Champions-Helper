# 表达式求值器

IC 的 `per_hero_expr` 字段承载两类语义，求值域不同，分别处理：

| 类别 | 语法 | 返回 | 求值域 | 现状 |
|------|------|------|--------|------|
| 布尔谓词 | `\|\|`/`&&`/`HasTag`/`GetStat` 比较/`age`/`hero_id`/`HasAttackDamageType` | boolean | 单个英雄 | ✅ 已统一到 `parseHeroPredicate('functional')` + `evalHeroPredicate` |
| 数值表达式 | `min`/`max`/`floor`/`as_int`/`GetUpgradeAmount`/`levels_past_softcap`/`get_num_most_common_*` | number | 英雄 + 存档 + 阵型 + 游戏常量 | ❌ `parseHeroPredicate` 返回 null 丢弃；stack 数量靠 `STACK_COUNT_RESOLVERS` 查表，数值 per_hero_expr 未精确求值 |

数值表达式用于 **stack 数量计算**（如 `min(floor(levels_past_softcap/num_levels_per_stack), floor(highest_available_area/num_areas_per_stack))` = 这英雄算几层）。当前这些 signal 的 stack 数量没有精确算，降级为 warning。

## 布尔谓词（已实现）

`src/domain/abilities/heroPredicate.ts`：一个 parser 解析到 AST，一个 evaluator 求值；解析一次可缓存，多对象求值复用 AST。覆盖 `||`/`&&`/`HasTag`/`GetStat` 比较/`age`/`hero_id`/`HasAttackDamageType` 等布尔语法。

`parseHeroPredicate` 对数值表达式与运行时状态表达式统一返回 `null`——当前与「解析失败」不可区分，覆盖率统计因此把"故意不处理"和"应处理但漏了"混算未解析。

### 存档依赖谓词

部分布尔谓词依赖玩家存档状态（非英雄静态属性），需 runtime 上下文求值。`HeroAbilityProfile.ownedSaveContext`（runtime 注入，build 期 undefined）承载存档派生数据；`attachOwnedSaveContext`（recommendationEngine 两入口对称调用）从 `OwnedHero.level` 派生 `ownedLevels: Map<heroId, number>`，formation-global（所有 profile 共享同一 ref）。

已实现：

- **`GetUpgradeUnlocked(N)`**——global 谓词：upgrade N 属唯一 owner 英雄，解锁 = owner 等级 ≥ `requiredLevel`。build 期 `enrichUpgradePredicateNodes`（buildHeroModels）从 champion-details upgrades 解析 `ownerHeroId`(=self，布尔引用均 self-ref) + `requiredLevel` 烘进 AST 节点；runtime `evalHeroPredicate` 按 `ownerHeroId` 查 `ownedLevels`。点亮 hero 165（巴尔德里克阵营）/66（Lazaapz 小体型）等纯 GetUpgradeUnlocked 表达式的 formationCountQualifier。
- **`GetUpgradePurchased(N)`**——global 谓词：N 是否购买。build 期解析 `ownerHeroId` + `requiredLevel` + `isSpecialization`（`specializationName` 非空）。specialization → `N ∈ owner.specializations`（玩家手选专精）；regular → owner 等级 ≥ reqLvl（同 GetUpgradeUnlocked，owned 英雄升级即自动购买）。点亮 hero 119（乌利亚修士黑骰髅会成员资格 `hero_dps_multiplier_mult,1000`）。
- **`GetFeatEquipped(N)`**——per-hero 谓词：被评估英雄是否装备 feat N（feat hero-specific，N 属唯一英雄）。runtime 查 `equippedFeatIds`（OwnedHero.feats）。与 GetUpgradePurchased 同落解锁 hero 119 BDS 共存式。

仍未实现（`parseHeroPredicate` 返回 null，含它们的复合式整体丢弃）：

- `HasEffect(name)` / `HasEffectByID(N)`——effect 是否激活，依赖阵型 effect 作用图（可能由他英雄施加，如 `celeste_heal`/`alyndra_portented`），属阵型运行时状态。真 buff 样本：hero 77/169/153/166/82/176。
- `is_alive`——runtime 战斗状态；`EligibleForPatron`——patron 进度（存档另一域）。

`HeroAbilityProfile.ownedSaveContext`（runtime 注入，build 期 undefined）混合 global + per-hero 数据：`ownedLevels`/`ownedSpecializations`（formation-global，按 ownerHeroId 查，所有 profile 共享同一 ref）、`equippedFeatIds`（per-hero，被评估英雄的 feats）。`attachOwnedSaveContext`（recommendationEngine 两入口对称）从 OwnedHero 派生。

## 数值表达式散落点

数值表达式当前散落在多处，未统一求值：

- `parseHeroPredicate`（`heroPredicate.ts`）：数值 per_hero_expr 返回 null。
- `scripts/data/official-rule-helpers.ts`：`TimeAvailable(\`days\`) > N*365` 单独正则（patron 时间规则）。
- `src/domain/planner/placementFit.ts` 的 `STACK_COUNT_RESOLVERS`：stack 数量按 stackFunc 查表（`per_crusader` 数英雄 / `per_col_behind` 数列），不解析数值 per_hero_expr。
- `src/domain/effects/effect-string.ts` 的 `resolveSimpleAmountExpr`：只匹配单一 `upgrade_amount(N,i)`；复合 amount_expr（`upgrade_amount(N,0)+...` 纯求和、`max_upgrade_amount` / `mult_stack` / `feat_amount` / `upgrade_amount(N,dps_update)` 等）回退得 effect value=0（低估）。`upgrade_amount` 与 `GetUpgradeAmount` 同类。

## requirements / condition / effect_string args 审计

这三个字段「长得像谓词」，但求值域与英雄布尔谓词不同，**不强求合一**。

### requirements（用户存档解锁条件）

- 结构：`LocalizedText[]`（显示文本）+ patron 条件（`condition: complete_area` / `patron_perks_purchased` / `patron_total_influence`）。
- 求值域：用户存档（是否完成 area、购买 perk、积累 influence）。
- 现状：`official-rule-helpers.ts` 各 condition 类型单独逻辑（`extractPurchasedPerkRequirementCount` 等）。
- 结论：requirements 与英雄谓词求值域不同，当前保持独立处理，不共用求值器。

### condition

与 requirements 同域（用户存档），`normalize` 阶段处理 `complete_area`/`area`，`official-rule-helpers` 处理 patron 条件。不强制合一。

### effect_string args（位置参数）

`parseEffectPayload`（`src/domain/effects/effect-string.ts`）把 effect_string 解析为 `{ kind, args[] }`，args 是位置约定（第 0 位 effect_def id、第 1 位 target id、第 2 位 tag 等）。**已抽象**，不需进一步统一——args 是位置约定，不是表达式语法，与布尔/数值表达式不同类。
