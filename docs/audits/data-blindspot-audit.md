# 数据真值盲区与静默丢失审计（轮 6）

度量基准日：2026-08-01（分支 `opencode/dev1`，commit `a42bab37`）。
透镜：未建模的规模与推荐影响——审「没解析的占多少、丢在哪、怎么影响推荐」，区别于轮 1 的「已建模信号是否正确」。

## 1. 总量度量

| 维度 | 数值 |
|---|---|
| 英雄数 | 164（全部含 unsupported，无零盲区英雄） |
| 已支持信号 | 10992（carry + support 合计） |
| unsupported 条目 | **1902**（占 14.8%） |
| 去重 kind 数 | 584（头部 30 kind 占 1274 条 / 67%；长尾 554 kind 散布 628 条，均值 ~1.1） |
| `shouldIgnoreUnsupportedEffectEntry` 忽略 | 仅 `effect_def` + `buff_upgrade*` wrapper（effect-helpers.ts:153） |
| 数据源 | 全 1902 条 `source=official-parsed`，来自 champion-details（升级/装备/feat/大招），**不来自外部加成集合** |

unsupported 按 kind 头部（hero-abilities.json 实测，非侦察数）：`health_add`×411、`buff_ultimate`×280、`set_ultimate_attack`×163、`do_nothing`×55、`pre_stack`×47、`pre_stack_amount`×37、`increase_health_by_source_percent`×31、`change_base_attack`×30、`stacks_data_binder_safe`×24、`expression_on_trigger`×21、`add_monster_hit_effects`×18、`add_attack_targets`×17、`favored_foe`×14、`heal`×13、`set_base_crit_chance`×10、`change_upgrade_data`×10、`buff_upgrade_effect_stacks_max_mult`×9、`broadcast_on_trigger`×8、`apply_effects_at_stacks`×8、`increase_revive_effect_post_stack`×7、`healing_add_mult`×7、`hero_dps_multiplier_mult`×6。

## 2. 关键澄清：unsupported ≠ 建模缺口

14.8% unsupported 率单独看误导。逐 kind 语义判定（对照 effect-reference.json 权威描述 + champion-details 父级游戏文本 + scoring 代码）后，绝大多数是**正确未建模**——它们不影响 BUD（Big Unit Damage，单次基本攻击对单体 Boss 的伤害，planner carry-dps 模式的优化目标）。判定分四类：

- **A. 无 BUD DPS 影响（正确未建模，~1145 条 / 60%）**：大招伤害/生存/治疗/元数据/触发 plumbing/换攻击动作——不进 BUD 计算就正确地无 parser。
- **B. 真 DPS 缺口（P1，~16 条 + 叠层 84 条）**：见 §3。
- **C. 间接/基础设施（无独立影响，~73 条）**：叠层上限扩展、target 扩展、tag-setter（favored_foe）、乌吉机制 plumbing——其 DPS 效果由另一条已支持信号或伴生 effect 承载。
- **D. 长尾英雄专属命名 effect（~628 条 / 33%）**：`mehen_grumpy_stack`/`uggie_handler`/`loy_requisition_inc_pre_stack` 等，每条多是某英雄特有机制的实现细节，DPS 相关者通常已有同英雄的 `hero_dps_multiplier_mult` 覆盖。

结论：**真盲区率约 0.8%（16/1902 明确缺口）+ 4.4%（叠层 base 默认值，体验缺口非正确性）**，远低于名义 14.8%。unsupported 清单的工程价值在于作为「待判定池」而非「未建模缺陷清单」。

## 3. 真缺口（P1）— 系统性低估证据

### 3.1 `set_base_crit_chance`（10 条 / 10 英雄）— base crit 被丢（✅ 已收口 2026-08-01）

> ✅ **已收口**（2026-08-01，集群 A2）：`set_base_crit_chance` build 期提取为 `hero.baseCritChancePercent`（非位置信号，不进信号池），`computeCritFactor` 接 per-hero base 参数。10 英雄 20% base crit 生效，无信号时保留 ~1.171 暴击期望增益（carry 排序感知）；移除 `if (!hasCrit) return 1` 短路，默认 base 仍归一 1.0（既有行为不变）。signal-coverage unsupported 2418→2408。下为轮 6 原始发现。

`critFactor.ts:5` 硬编码 `DEFAULT_CRIT_CHANCE_PERCENT=2.5` 作 base，`computeCritFactor` 只读 `globalCritChance`/`heroCritChance`（ADD 类）。`set_base_crit_chance,<amount>` 是 SET 语义（覆盖 base），无 parser。全 10 条均为 `set_base_crit_chance,20`。

实测（hero-abilities.json 逐英雄）——按 crit 信号数分档：

| 档 | 英雄（id/名） | crit 信号数 | 含义 |
|---|---|---|---|
| 全丢 | 128 莱埃泽尔 / 27 宾温 / 4 贾拉索 / 18 崔斯特 / 32 沃夫加 / 126 强心 / 152 鲍比 | **0** | 20% base crit 完全未建模（含 Drizzt 暴击流核心 carry） |
| 部分 | 20 瑞吉斯 | 1 | base crit 丢，仅 1 条其他 crit 信号 |
| 部分 | 149 瑞文嘉德公爵 | 2 | base crit 丢，2 条其他 crit 信号 |
| 对照 | 25 凯蒂布莉儿 | 8 | 走 heroCritChance 正常建模，base crit 丢但其他 crit 补偿足 |

影响：crit 进评估（`scoreFormation → computeCritFactor`），「全丢」7 英雄的 crit_factor 归一为 1.0（按无 crit 处理），实际应有 20% base chance 的期望增益（chance 是基线 2.5% 的 8 倍）。carry-dps 排序时系统性低估暴击流 carry（Drizzt/贾拉索/沃夫加尤甚）。

### 3.2 `hero_dps_multiplier_mult` 残留 6 条 — 位置/条件限定符被丢

该 kind 是核心已支持（全仓 6599 条），仅 6 条进 unsupported，note 全为 `unsupported targets: [...]`——限定符解析器拒收：

| 英雄 | 丢的 target | 已支持 heroDps 数 |
|---|---|---|
| 格罗玛/16 | `other` | 44 |
| 温德福尔/167 | `tallest_column`（最高纵列） | 38 |
| 拉克/170 | `middle_columns`（中纵列） | 37 |
| 加兹里克/98 | `snowflake`（雪花阵型形状） | 34 |
| 江魈/140 | `slot_if_expr`（相邻槽 ≤2 条件） | 35 |
| 沙卡/79 | `active_campaign`（战役条件） | 37 |

影响：每英雄只丢 1 条、且各有 34-44 条替代 DPS 信号，**单英雄低估幅度小**；但是一个真实类别——复杂位置/条件 DPS buff 被静默丢弃，无告警。归类 P1-low（量小但真，需决策是否扩展限定符词表）。

**调研结论（A4，2026-08-01）→ 登记不修**。逐类对照限定符解析基建（`heroTargetingRelation.ts` 的 `normalizeTargetRelation` 只产静态 `HeroPositionRelation` 或 `any`；`placementSlotRelation.ts` 的 `matchesSlotRelation` 只评估静态列差/邻接）：

- `tallest_column` / `slot_if_expr`：依赖**当前阵型填充状态**（最高列随阵型变；slot_if_expr 是槽位条件表达式），非静态关系，需在评估期加每阵型动态评估器——超出「扩位置词表」范畴。
- `snowflake`：**阵型形状**条件（是否雪花布局），属形状匹配另一维度，非位置关系。
- `active_campaign`：**战役**条件，需 scenario.campaign 匹配，另一维度。
- `middle_columns`：几何上最接近，但「中间列」定义依赖布局宽度、无现成枚举，加它要动 `HeroPositionRelation` + `matchesSlotRelation` + 映射 4 处，救 1 条信号不抵。
- `other`：语义清晰（raw 实测 =「全员除自己」，如 Nova `increase_health_by_source_percent`「提升其他所有勇士」），= relation `any` + excludeSelf；但 excludeSelf 需从 target 派生（非纯词表项），且只救回 ~1 条 hero_dps。

5/6 超出位置关系词表扩展范畴、需新基建；`other` 可行但 ROI 低（1 条信号，34-44 条替代）。planner 是推荐引擎（非精确模拟），丢 1/N DPS 信号对排序影响可忽略，且缺口已在 unsupported 有 note 追踪（非 C1 式静默零分）。**全类登记不修**；若未来生存/其它维度也受益于 `other`=excludeSelf 语义（ broader recovery），可单点 reopen。

### 3.3 `favored_foe`（14 条）— 重新定性：tag-setter，非伤害缺口

初判曾怀疑「偏好敌人伤害未建模」，逐证后推翻。事实链：

- `favored_foe,<tag>`（owner=area）**无 amount**，是纯 tag-setter（标记哪些敌人类型算「偏好」）。14 条 unsupported 散布 11 英雄（Zorbu/22 占 4，余各 1），**Minsc/7 不在其中**——Minsc 的偏好敌人升级走 `effectReference='effect_def,1326..'`（模板引用），不产 favored_foe unsupported。
- 偏好敌人的**伤害源是伴生 effect**：Minsc 模板内为 `monster_with_tag_more_damage,300,<tag>`，Zorbu 则依赖独立的叠层机制（`favored_foe` 仅标记）。
- `vulnerabilityResolver.ts` 处理的伤害 kind 是 `'n'` 与 `'increase_damage_against_monster_tag'`（→ enemyVulnerability + monsterTags），**不含** `monster_with_tag_more_damage`。
- 全仓仅 **1 条信号**带 monsterTags（hero 86 `increase_damage_against_monster_tag,400,fiend`）；Minsc 0 条 enemyVulnerability、0 monsterTags，且 `monster_with_tag_more_damage` 既不在 unsupported 也不在任何 signal rawEffect。

结论：`favored_foe` 本身是 plumbing，**直接 DPS 影响=0**，从真缺口降级。但暴露一个**更深的待查问题**：enemy-type-conditional 伤害（Minsc 类的 `monster_with_tag_more_damage` 走 effect_def 模板）在模板解析层被静默消化，tag 未进 signal —— 可能被剥成无条件 heroDps（过度应用）或静默丢弃，二者的推荐偏差方向相反，无法仅凭 unsupported 清单判定，须单独审计 effect_def 模板解析路径（effect-definition-templates / effectDefinitionDps）。登记为 P1-low 观察项，不影响本审计的 unsupported 定性。

### 3.4 `pre_stack` / `pre_stack_amount`（84 条）— 叠层 base 默认值缺口

两者设某叠层机制的初始层数/base 值（如 Krond `pre_stack_amount,400` = 邪恶勇士叠层 base 400）。模型不读它们：`steadyStateScoring.ts:69` 的 `manualStackCount`（缺省走 `placementFit` 的 `DEFAULT_MANUAL_STACK_COUNT=1000`）是用户手动旋钮，统一覆盖所有 `stacksMultiply` 信号。

判定：**机制未缺失**（叠层乘算已建模），缺的是「每英雄每机制的合理默认 stack 值」。用户已知可手调（UI 按「当前冒险最高区域」设）。归类 P1-low（体验/默认值缺口，非正确性缺口）。

✅ **维持现状登记不修**（A5，2026-08-01 用户决策）：默认 1000 + UI 按冒险区域手调；per-hero 默认值登记在 `docs/requirements/2026-08-per-hero-stack-defaults.md`，优先级待评。

## 4. 逐 kind 语义判定表（头部 + 代表性长尾）

判定栏：A=无 BUD 影响（正确未建模）/ B=真缺口 / C=间接基础设施 / D=英雄专属命名。

| kind | 数 | 判定 | 游戏效果（effect-reference 描述） | 影响 | 处置 |
|---|---|---|---|---|---|
| `health_add` | 411 | A | flat +生命 | survival 维度约束（非优化目标）；baseHealth 未含升级 flat 血 | P2 记账 |
| `buff_ultimate` | 280 | A | +大招伤害% | 大招不进 BUD；全部来自装备槽 | 不动 |
| `set_ultimate_attack` | 163 | A | 解锁/选择大招 | 纯元数据（选哪个大招） | 不动 |
| `do_nothing` | 55 | A | 占位（desc=空） | 无效果 | **P2：进忽略清单降噪** |
| `pre_stack`/`pre_stack_amount` | 84 | B | 叠层初始值 | §3.4 | ✅ 维持现状（A5） |
| `increase_health_by_source_percent` | 31 | A | 按源英雄最大生命%加血 | survival 约束 | P2 记账 |
| `change_base_attack` | 30 | A | 换基本攻击动作 | baseDamage 不变；AoE 改命中目标数非 BUD | 不动 |
| `stacks_data_binder_safe` | 24 | C | 绑定命名叠层变量 | plumbing；DPS 由引用它的信号承载 | 不动 |
| `expression_on_trigger` | 21 | C | 触发时算表达式 | 触发 plumbing | 不动 |
| `add_monster_hit_effects` | 18 | A | 命中附加减伤/debuff | 非 BUD（Gromma 占大头） | 不动 |
| `add_attack_targets` | 17 | A | 基本攻击多打 N 个附近敌人 | 多目标=清怪，非单体 BUD | 不动 |
| `favored_foe` | 14 | C | tag 敌人成偏好敌人（无 amount，tag-setter） | §3.3，直接 DPS=0；深层 tag 保留问题待查 | 观察/P1-low |
| `heal` | 13 | A | 每秒回血 | survival sustain | 不动 |
| `set_base_crit_chance` | 10 | B | SET base 暴击% | §3.1（✅ 已收口） | ✅ |
| `change_upgrade_data` | 10 | C | 改另一 upgrade 数据 | 跨 upgrade 元数据 | 不动 |
| `buff_upgrade_effect_stacks_max_mult` | 9 | C | +另一 buff 叠层上限% | 间接；manualStackCount 不卡上限 | 不动 |
| `broadcast_on_trigger`/`apply_effects_at_stacks` | 16 | C | 触发/条件 plumbing | 其效果由被触发信号承载 | 不动 |
| `hero_dps_multiplier_mult` | 6 | B | 位置/条件 DPS buff | §3.2 | P1-low |
| `healing_add_mult`/`increase_revive_effect_post_stack` | 14 | A/C | 治疗增效/叠层后增益 | survival/间接 | 不动 |
| `mehen_grumpy_stack`/`uggie_handler`/`loy_requisition_inc_pre_stack` 等 | ~628 | D | 英雄专属机制实现细节 | 多已被同英雄 hero_dps 覆盖 | 不动（逐英雄按需） |

## 5. 与轮 1 §2 / memory「10^31 欠估」的关系

memory 记 planner 计算器观测值比理论大 ~10^31，大头来自**外部加成源**（vulnerability/modron/成就/药水/gem/feat/legendary），这些不在 hero-abilities.json 内，由独立集合（global-buffs/patron-perks/feat-catalog/loot-catalog/legendary）经 `scoringBonusInputs.ts` 装配。

本审计 1902 条 unsupported 全部 `source=official-parsed`，来自 **champion-details 英雄自身能力**（升级 effect_keys + 装备 + feat + 大招），是**内部盲区**。

二者**无重合**：外部源的未建模（10^31 大头）与内部 unsupported（本审计）是两条独立缺口。轮 1 §2 登记的「外部加成池分裂」（globalBuff/heroDpsPool 与 ability 池相乘应加法）是外部源**已接入部分**的池归属 bug，与本审计的「内部 kind 无 parser」也不同。

补注：feat/legendary/loot 虽是外部加成源，但其 effect 若用 unsupported kind（如装备里的 `buff_ultimate`），已计入本审计 1902；其加成**用已支持 kind**（hero_dps/global_dps）的部分走 `scoringBonusInputs` 正常计入，不在本审计范围。

## 6. 处置

### P1（登记，不当轮动手——跨 resolver/需 amount 个案核定）

> ✅ `set_base_crit_chance` base crit 丢失已收口（2026-08-01，集群 A2，详见 §3.1）——原行移出本表。

| 项 | 动作 | ROI | 影响面 | 决策点 |
|---|---|---|---|---|
| ~~`set_base_crit_chance` base crit 丢失~~ | ✅ 已收口：critFactor 接 per-hero base（build 提取 `set_base_crit_chance` → `hero.baseCritChancePercent`），采「直接读 base」方案（非 SET→ADD 转换） | 中-高（10 英雄 20% base crit 生效，carry 排序修正） | critFactor.ts + buildHeroModels + effect-helpers + abilityModel | ✅ 已决：直接读 base |
| ✅ enemy-type-conditional 伤害 tag 保留（A3，2026-08-01 并入 A1 劣后） | 用户决策：种族/年龄/性别/小队等条件攻击加成劣后——主体加成正确性收敛后再做；当前 effect_def 带 filter 未解析已保守丢弃（`externalHeroDpsMult.ts:50`，宁可不算不错算）。机制全貌调研见 `docs/research/data/planner/damage-bonus-sources.md` §5 |
| ✅ `hero_dps` 位置/条件限定符 6 类（A4，2026-08-01 登记不修） | 调研结论见 §3.2：5/6（tallest_column/middle_columns/snowflake/slot_if_expr/active_campaign）需位置关系模型之外的新基建（动态阵型评估/形状匹配/战役匹配），`other`=excludeSelf+any 可行但 ROI 低。全类登记不修；planner 为推荐引擎丢 1/N 信号影响可忽略，缺口已 unsupported 有 note 追踪 |

### P2（顺手）

- `do_nothing`（55 条）字面无效果，加入 `shouldIgnoreUnsupportedEffectEntry` 忽略清单降噪（与 `effect_def`/`buff_upgrade*` 同列）。判据：effect-reference 描述为空、effect_string 无 amount 或仅占位。需排除 `do_nothing,<amount>` 中带非零 amount 的少数条目（如 Beadle `do_nothing,200`）——逐条确认 amount 是否真无效果后再决定全忽略还是仅忽略无 amount 变体。
- survival 维度 flat 血量（health_add 411 + increase_health_by_source_percent 31，~442 条）是否应折进 effectiveHealth——survival 是约束非目标，优先级低，记入 TODO 待 survival 维度细化时一并处置。

### 无需处置（健康）

- A/C/D 类（~1800 条 / 95%）正确无 parser 或属基础设施，保持现状。`shouldIgnoreUnsupportedEffectEntry` 现有忽略范围（effect_def + buff_upgrade wrapper）准确，无过度忽略导致的真缺口遗漏。

## 7. 度量复现

`unsupported` 计数：`jq -r '.items[].unsupportedSignals[].rawEffect' public/data/v1/hero-abilities.json | sed 's/,.*//' | sort | uniq -c | sort -rn`。
kind→游戏描述：`effect-reference.json` 的 `effectKeys[].descriptions.desc`。
kind→effect 宿主路径：`champion-details/<id>.json` 的 `upgrades[].effectDefinition.snapshots.{original,display}.effect_keys[].effect_string` 与 `loot[].effects[].effect_string`（注意 loot effects 为对象非字符串）。
