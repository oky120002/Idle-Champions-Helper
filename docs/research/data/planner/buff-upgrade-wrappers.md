# 加成升级包装效果核实

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

base-unresolved 绝大多数是**非 stat 触发器/stack/no-op**（前 5 名 ~281 计数），合法不可解析——强制入 pool 会把控制流 effect 当 stat buff。少量是 base 名 recognized 但 targeting 不支持（hero_dps 25）；当前统一进入 warning，相关目标限定格式见 `docs/research/data/game-data-source/format-quirks.md`。

## 覆盖率结论

> 统计快照；排除 ability 源静态 buff_upgrade 后 resolved 数与分布已变，重跑 `npm run data:signal-coverage` 可得新值。结论由 base-effect 性质决定的天花板仍有效。

- wrapper resolved 370（65.5%）、family-unsupported 21。
- **resolved 率 65.5%，未达 80%**：天花板由 base-effect 性质决定（174 base-unresolved 多为非 stat 触发器）。强行解析非 stat base 会引入语义错误，违反「不把控制流当 buff」。
- 80% 目标在当前 base-effect 分布下不可达；正确路径是 targeting 精细化（解锁 hero_dps 等 stat base 的 unsupported targeting）+ step simulation（effect_stacks / attacking_monster 计数）。

## ability 源静态 buff_upgrade 排除

IC effect_def `effect_string` 是满级 snapshot 计算值，已含 ability 自身 upgrade 树的全部静态 buff_upgrade 贡献。`collectEffectEntries` 派生循环跳过 **ability 源（`sourceBucket ∈ {upgrade, upgrade-effect-key}`）+ plain kind（`buff_upgrade`/`buff_upgrades`）+ 非 `stacks_multiply`** 的 wrapper——否则每条叠 `base.value×X/100` 进 addPercent 会产生数十倍级 pool 高估（蔚 damage:hero pool 6.4e8 vs 游戏 2.92e7，影响绝大多数英雄）。

证据：蔚善良榜样 `effect_string=300` 含 20 条 ranked `buff_upgrade,100,12312` + 劝人向善 `buff_upgrade,200,12312`，游戏显示 per-stack 恰好 +300%（4^7=16384）。

保留三类运行时 wrapper（仍派生）：

- `stacks_multiply` 动态（area 依赖，如蔚出言不逊）
- 复杂 wrapper（`buff_upgrade_per_tagged_crusader_mult` / `buff_upgrade_mult_by_distance_*` 等，阵型依赖）
- 外部源 loot/feat/legendary（装备/专长/feat，不在 ability snapshot 内）

> plain `buff_upgrade`/`buff_upgrades` 的 ability 源静态部分不派生，外部源部分继续派生；`npm run data:signal-coverage` 输出当前分布。

## 派生去重 + bonusScale targeting

- **派生去重**：`rarityGroupKey` 按 (kind, base target, targetQualifier, formationCountQualifier, position, amountFunc, stackFunc) 分组（排除 magnitude/value），key 追加 `@upgradeId`，同 key 首条保留。不同 upgrade 的 wrapper 各自独立。
- **loot rarity 选择局限**：loot 来源 `upgradeId=null`，同槽多 rarity tier 共享 key `rarityGroupKey@?` → 首条（低 rarity）保留，非最高 rarity。IC 装备每槽只装备一件（最高 rarity），当前去重保留首条与游戏装备选择不一致（低 rarity 而非最高），是已知量级低估来源。
- **bonusScale targeting 复用**：`resolveSignalMultiplier` 解析 `bonusScaleOfSignal` 时取 base 的 multiplier 折算（`(basePercent × wrapperMag)/100`），不重新校验 base 的 `positionQualifier` / `targetQualifier`。wrapper 自身 filter_targets 已 AND 合并到 base targetQualifier（`mergeHeroQualifiers`）；base 与外层 targeting 不一致的场景当前进入 warning（保守安全）。
