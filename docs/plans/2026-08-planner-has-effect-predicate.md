# HasEffect/HasEffectByID 阵型运行时谓词实现计划

**状态**: 已确认

## 背景

7 个去重 HasEffect/HasEffectByID 表达式未解析，per_hero_expr / hero_expr 含此谓词时整体丢弃，导致 count qualifier 或 target qualifier 消失。当前行为是**过度计数**（谓词丢弃 → 限制条件消失 → 全员计数）。

## 数据驱动分析（2026-08-10）

### 7 个实例

| 英雄 | 表达式 | 所在效果 | 评分影响 | effect 来源 |
|---|---|---|---|---|
| Skylla(169) | `HasEffectByID(2474)` | hero_dps_mult,400 @next_col | **关键** | ed 2474 = 自身 upgrade 17845，targets next_col |
| Knox(82) | `HasEffect(\`celeste_heal\`)&&hero_id==82` | damage_reduction,25 @self | **关键** | Celeste(2) upgrade 26，targets next_col |
| Cazrin(166) | `HasTag(\`tanking\`)&&HasEffectByID(2416)&&GetUpgradeUnlocked(17676)` | buff_upgrade,400 | **有** | ed 2416 = 自身 upgrade 17676（法师护甲），targets self_slot |
| Alyndra(77) | `HasEffect(\`alyndra_portented_v2\`)` | buff_upgrade,100 | **有** | changing_effect_keys 产出（无 targets → 全队） |
| Kas(153) | `!HasEffect(\`vampire_spawn\`)` | mortalpawns_stackcount | 无（unsupported） | 自身 ed 2113 |
| Trixie(176) | `HasEffect(\`trixie_shrinking_dust\`)` | do_nothing | 无（unsupported） | 自身，targets adj_behind_propagate_species |
| Flint(178) | `HasEffectByID(2797)` (hero_expr filter) | increase_damage_against_monster_armor_and_hits | 无（unsupported） | 自身 ed 2797 = upgrade 20130，targets col_and_prev_col |

### 关键结论

- **无需迭代求值**：所有 effect 都是单向依赖（授予英雄在场 + targeting 匹配），无循环依赖。
- 4/7 影响评分，但所有都应正确解析（后 3 个目前 unsupported，但解析正确后未来新增 resolver 可自动受益）。

## 实现步骤

### A. 数据提取：effectGrants（build 管线）

**新增类型** `EffectGrant`（`abilityModel.ts`）：

```typescript
interface EffectGrant {
  effectDefId: string         // upgrade.effectDefinition.id
  effectKeys: string[]        // 产出的 effect 名（bare kind + changing_effect_keys）
  relation: HeroPositionRelation  // 解析后的位置关系（targets null → 'any'）
  excludeSelf: boolean        // targets 含 'other' 时 true
  requiredLevel: number       // upgrade.requiredLevel
}
```

**提取逻辑**（`buildHeroModels.ts`）：

扫描每个 upgrade 的 effect_keys，对每个 effect_key：
1. 收集 effectKeys：
   - effect_string 无逗号 → 裸名 kind（如 `celeste_heal`）
   - `changing_effect_keys` 数组 → 逐项加入（如 `alyndra_portented_v2`）
2. 收集 targeting：targets 数组 → 经 STRING_RELATION_MAP 解析为 HeroPositionRelation
3. 仅当 effectKeys 非空 OR targets 非空时产出 grant（过滤纯数值 effect_key 如 pre_stack）
4. effectDefId、requiredLevel 从 upgrade 元数据提取

**STRING_RELATION_MAP 补充**：`self_slot → 'self'`

存储到 `HeroAbilityProfile.effectGrants`。

### B. 谓词解析器（heroPredicate.ts）

1. `HeroPredicateAST` 新增：
   - `{ op: 'hasEffect'; effectName: string }`
   - `{ op: 'hasEffectById'; effectId: string }`

2. `matchFunctionalLeaf` 新增两个正则：
   - `HasEffect(\`name\`)` → `{ op: 'hasEffect', effectName: 'name' }`
   - `HasEffectByID(N)` → `{ op: 'hasEffectById', effectId: 'N' }`

### C. 阵型运行时 effect 激活计算

**新增函数** `computeEffectActivation`（`placementSlotRelation.ts` 或新文件）：

```
输入：placements、heroesById、scenario、supportLevelByHero
输出：Map<heroId, Set<string>>（heroId → 激活的 effect key 集合）

算法：
for each (grantingSlotId, grantingHeroId) in placements:
  grantingHero = heroesById[grantingHeroId]
  grantingLevel = supportLevelByHero[grantingHeroId]
  for each grant in grantingHero.effectGrants:
    if grant.requiredLevel > grantingLevel: continue
    for each (targetSlotId, targetHeroId) in placements:
      if grant.excludeSelf && targetHeroId == grantingHeroId: continue
      if matchesSlotRelation(scenario, grantingSlotId, targetSlotId, grant.relation):
        result[targetHeroId].addAll(grant.effectKeys)
        result[targetHeroId].add('#' + grant.effectDefId)
```

### D. 评价链路接线

1. `evalNode` / `evalHeroPredicate` 新增 `activeEffectKeys?: Set<string>` 参数
2. `hasEffect` case：`activeEffectKeys?.has(effectName) ?? false`
3. `hasEffectById` case：`activeEffectKeys?.has('#' + effectId) ?? false`
4. `matchesHeroQualifier` 新增 `activeEffectKeys` 参数并透传
5. `evaluatePlacementFit`：在循环前 `computeEffectActivation`，每次 `matchesHeroQualifier` 传入对应英雄的 effectKeys
6. `countQualifiedHeroes`：同上透传

### E. 测试 + 文档 + 收口

- TDD：先写测试（parser、activation、integration）
- rebuild hero-abilities.json
- signal-coverage baseline 更新
- specs 更新 + plan 归档

## 风险与边界

- `alyndra_portented_v2` 是 derived effect，靠 `changing_effect_keys` 提取，不是直接 effect_string。验证提取正确。
- `self_slot` target 需新增 STRING_RELATION_MAP 条目。
- `other` target 需 excludeSelf 标记。
- Kas `!HasEffect(vampire_spawn)` 中的 `vampire_spawn` 是 Kas 自身 ed 2113 的 effect_string，targets 未定（vampire_spawn_effect 元数据结构）。但 Kas 的信号是 unsupported，无评分影响。
