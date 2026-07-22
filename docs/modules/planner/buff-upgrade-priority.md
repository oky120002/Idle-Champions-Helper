# buff_upgrade wrapper 变体优先级与覆盖率（阶段 8.1/8.3/8.4）

> 作用：统计 buff_upgrade wrapper 变体频率、评估 top N 支持范围、记录 base 未解析根因。
> wrapper 派生机制：`collectEffectEntries` 把 `buff_upgrade,SCALE,TARGET` 派生为以 TARGET base 为 `bonusScaleOfSignal` 的 derived signal。
> 实现见 `scripts/data/effect-helpers.mjs`；覆盖率见 `npm run data:signal-coverage`。

## 变体频率（top，按 wrapper 出现数）

| 变体 | 数 | 8.2 支持 |
|------|----|---------:|
| buff_upgrade | 445 | ✅ 既有 |
| buff_upgrades | 53 | ✅ 既有 |
| buff_upgrade_per_any_tagged_crusader_mult | 20 | ✅ 既有 |
| buff_upgrade_add_flat_amount | 8 | ✅ 8.2 |
| buff_upgrade_by_tag_mult | 4 | ✅ 8.2 |
| buff_upgrade_per_target_crusader | 4 | ✅ 既有 |
| buff_upgrade_per_unique_attacking_monster | 4 | ❌ 复杂（attacking monster 计数，归 step simulation） |
| buff_upgrade_by_target_tag_mult | 3 | ✅ 8.2 |
| buff_upgrade_effect_stacks_max_add/mult | 6 | ❌ effect_stacks 计数（归 step simulation） |
| buff_upgrade_if_tagged_monster | 3 | ❌ 条件性怪物 tag（归 targeting 精细） |
| buff_upgrade_add_then_mult | 2 | ✅ 8.2 |
| buff_upgrade_per_any_tagged_crusader | 2 | ✅ 8.2 |
| buff_upgrades_per_active_upgrade_tag_mult | 2 | ❌ active upgrade 计数 |
| buff_upgrade_per_crusader | 1 | ✅ 8.2 |
| 其余（effect_stacks_trigger / or_has_tracked_effect / mult_by_distance 等 ≤1） | — | 部分❌ |

8.2 新增 6 个变体（复用既有 per_tagged / per_crusader / buff_upgrade seed 模式），family-unsupported 41 → 21。

## base 未解析根因（8.3）

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

**结论（8.3）**：base-unresolved 绝大多数是**非 stat 触发器/stack/no-op**（前 5 名 ~281 计数），合法不可解析——强制入 pool 会把控制流 effect 当 stat buff，错误。少量是 base 名 recognized 但 targeting 不支持（hero_dps 25），归未来 targeting 精细化（STRING_RELATION_MAP / excludeSelf 等，见 milestone-2 末尾关注点）。

## 覆盖率结论（8.4）

- 8.2 后 wrapper resolved 364 → 370（family-unsupported 41 → 21）。
- **resolved 率 65.5%，未达 80% 目标**：天花板由 base-effect 性质决定（174 base-unresolved 多为非 stat 触发器）。强行解析非 stat base 会引入语义错误，违反「不把控制流当 buff」。
- 80% 目标在当前 base-effect 分布下不可达；正确路径是 targeting 精细化（解锁 hero_dps 等 stat base 的 unsupported targeting）+ step simulation（effect_stacks / attacking_monster 计数），归 M3+。
- 8.5 稀有度去重使 recognized 总数下降（移除不同 rarity magnitude 的过度累加），这是**正确性提升**而非覆盖率回退。

## 8.5 稀有度去重 + bonusScale targeting

- **稀有度取最高（已实现）**：`rarityGroupKey` 按 (kind, base target, targetQualifier, formationCountQualifier, position, amountFunc, stackFunc) 分组（排除 magnitude/value），组内只保留 `|value|` 最大者。覆盖 Lucius/Regis/Halsin/Jaheira 等 wrapper 大户的稀有度高估。
- **bonusScale targeting 复用（评估）**：`resolveSignalMultiplier` 解析 `bonusScaleOfSignal` 时只取 base 的 multiplier，不重新校验 base 的 positionQualifier/targetQualifier。当前 wrapper 派生已 AND 合并 wrapper 自身 filter_targets 到 targetQualifier（f389586b）；base 与外层 targeting 不一致的剩余场景归未来 targeting 精细化评估，本里程碑不强行处理（保守安全）。
