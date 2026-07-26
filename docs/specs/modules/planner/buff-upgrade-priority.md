# buff_upgrade wrapper 变体覆盖

> 作用：统计 buff_upgrade wrapper 变体频率、已支持范围、base 未解析根因与稀有度去重机制。
> wrapper 派生：`collectEffectEntries` 把 `buff_upgrade,SCALE,TARGET` 派生为以 TARGET base 为 `bonusScaleOfSignal` 的 derived signal。
> 实现见 `scripts/data/effect-helpers.ts`；覆盖率见 `npm run data:signal-coverage`。

## 变体频率（按 wrapper 出现数）

| 变体 | 数 | 已支持 |
|------|----|---------:|
| buff_upgrade | 445 | ✅ |
| buff_upgrades | 53 | ✅ |
| buff_upgrade_per_any_tagged_crusader_mult | 20 | ✅ |
| buff_upgrade_add_flat_amount | 8 | ✅ |
| buff_upgrade_by_tag_mult | 4 | ✅ |
| buff_upgrade_per_target_crusader | 4 | ✅ |
| buff_upgrade_per_any_attacking_monster | 4 | ❌ 复杂（attacking monster 计数，归 step simulation） |
| buff_upgrade_by_target_tag_mult | 3 | ✅ |
| buff_upgrade_effect_stacks_max_add/mult | 6 | ❌ effect_stacks 计数（归 step simulation） |
| buff_upgrade_if_tagged_monster | 3 | ❌ 条件性怪物 tag（归 targeting 精细化） |
| buff_upgrade_add_then_mult | 2 | ✅ |
| buff_upgrade_per_any_tagged_crusader | 2 | ✅ |
| buff_upgrades_per_active_upgrade_tag_mult | 2 | ❌ active upgrade 计数 |
| buff_upgrade_per_crusader | 1 | ✅ |
| 其余（effect_stacks_trigger / or_has_tracked_effect / mult_by_distance 等 ≤1） | — | 部分❌ |

已支持的变体复用 per_tagged / per_crusader / buff_upgrade seed 模式；family-unsupported 余 21 个，多为 attacking monster / effect_stacks / active upgrade 计数类。

## base 未解析根因

wrapper 总 565：resolved 370（65.5%）、base-unresolved 174、family-unsupported 21。

base-unresolved 主因（top missing base effects）：

| base effect | 数 | 性质 |
|-------------|----|------|
| expression_on_trigger | 95 | 触发器/控制流，非 stat buff |
| broadcast_on_trigger | 50 | 触发器/控制流 |
| pre_stack_amount | 48 | stack 设置，非 stat buff |
| pre_stack | 46 | stack 设置 |
| do_nothing | 42 | 字面 no-op |
| mehen_grumpy_stack | 31 | 专属 stack |
| grant_all_instant_temporary_hp | 25 | 临时 HP（触发型） |
| hero_dps_multiplier_mult | 25 | **base 名 recognized，但 targets/filter_targets 不支持**（归 targeting 精细化） |
| change_base_attack | 13 | 攻击改写 |
| heal | 12 | 扁平治疗（非倍率） |

base-unresolved 绝大多数是**非 stat 触发器/stack/no-op**（前 5 名 ~281 计数），合法不可解析——强制入 pool 会把控制流 effect 当 stat buff。少量是 base 名 recognized 但 targeting 不支持（hero_dps 25），归未来 targeting 精细化（`STRING_RELATION_MAP` / excludeSelf 等，见 `data-source-confirmations.md`）。

## 覆盖率结论

- wrapper resolved 370（65.5%）、family-unsupported 21。
- **resolved 率 65.5%，未达 80%**：天花板由 base-effect 性质决定（174 base-unresolved 多为非 stat 触发器）。强行解析非 stat base 会引入语义错误，违反「不把控制流当 buff」。
- 80% 目标在当前 base-effect 分布下不可达；正确路径是 targeting 精细化（解锁 hero_dps 等 stat base 的 unsupported targeting）+ step simulation（effect_stacks / attacking_monster 计数）。
- 稀有度去重使 recognized 总数下降（移除不同 rarity magnitude 的过度累加），是**正确性提升**而非覆盖率回退。

## 稀有度去重 + bonusScale targeting

- **稀有度取最高**：`rarityGroupKey` 按 (kind, base target, targetQualifier, formationCountQualifier, position, amountFunc, stackFunc) 分组（排除 magnitude/value），组内只保留 `|value|` 最大者。覆盖 Lucius/Regis/Halsin/Jaheira 等 wrapper 大户的稀有度高估。
- **真升级各自叠加**：`required_level<9999` 的 buff_upgrade 是各自可购的永久升级，对同一 base 的多条**全部叠加**（如 Bruenor Rally 15 条 magnitude 100~300 分布在 level 150~3130）。去重 key 追加 `upgradeId`，同 magnitude 多条也各自保留（不同 upgrade id = 独立升级）。消费侧 `evaluatePlacementFit` 的 pool `addPercent` 本就累加同 pool 信号。
- **sentinel 产物去重**：`required_level>=9999` 的 sentinel 条目是 CNE 数据展开产物（如 Jaheira 38 条 `buff_upgrades,100,...` 完全相同，只生效一次），按 `rarityGroupKey` 去重，同组不同 magnitude 取最高（保守；全库仅 3 个真实数据组为此形态，语义待 IC 源码确认）。
- **bonusScale targeting 复用**：`resolveSignalMultiplier` 解析 `bonusScaleOfSignal` 时取 base 的 multiplier 折算（`(basePercent × wrapperMag)/100`），不重新校验 base 的 `positionQualifier` / `targetQualifier`。wrapper 自身 filter_targets 已 AND 合并到 base targetQualifier（`mergeHeroQualifiers`）；base 与外层 targeting 不一致的剩余场景归未来 targeting 精细化评估（保守安全）。
