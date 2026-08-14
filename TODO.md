<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- Modron 管道 buff 数值未进 planner 评分 <!-- auto-todo:id=atd_4ca7841bda -->
  - 记录时间: `2026-08-08T12:56:14+08:00`
  - 类型: optimization
  - 位置: `src/domain/simulator/modronInfo.ts`
  - 备注: modronInfo.ts/ultUptime.ts/blessingGlobalBuff.ts 三处消费 modron 数据，但管道(齿轮)的伤害/金币/速度 buff 数值未建模。
    - 影响：planner 推荐不反映 modron 管道加成
    - 证据：modron-automation.md 调研，effect-reference.json 中 16 个 modron_* 谓词均 serverOnly

- 取反复合对齐标记（!lawful_good）不展开 De Morgan——forbidden 位置保持字面量 <!-- auto-todo:id=atd_f24a57fc7f -->
  - 记录时间: `2026-08-08T22:05:12+08:00`
  - 类型: issue
  - 位置: `scripts/data/normalize-adventures.ts:816`
  - 备注: 取反复合对齐标记（如 !lawful_good）不展开 De Morgan。当前全库 0 实例触发，仅理论边界。
    - 影响：!lawful_good 应排除守序善良英雄，当前不排除任何人
    - 优先级：低（0 实例触发）

- cooldownReduction 装备源无 owned-aware 通道（非管线 bug，已查明设计缺口） <!-- auto-todo:id=atd_0cb934b094 -->
  - 记录时间: `2026-08-09T21:31:56+08:00`
  - 类型: follow-up
  - 位置: `src/domain/buffs/equipmentMult.ts（装备五通道缺 speed/cooldown kind）`
  - 备注: 2026-08-09 深度排查根因：624 条 reduce_ultimate_cooldown effect_string（非原记 1860）分两路——12 条专精源正确进 specialization-catalog.json（cooldownReduction 12 条已验证）；612 条装备源被 buildHeroModels loot 过滤丢弃（防双重计数，正确行为），但装备五通道（SIMPLE_VALUE_KINDS）不含 reduce_ultimate_cooldown/reduce_attack_cooldown，无 owned-aware 通道接手。speedResolver 接线正确，pipeline 无 bug。此缺口随 speed 维度需求（2026-08-planner-speed-dimension）一并解决——在装备通道扩展 speed kind 或在 speed 评分实现时统一处理。
    - 影响：装备源 cooldown 缩减信号未建模（speed 维度未消费，当前无评分影响）
    - 证据：npx tsx 实跑 collectEffectEntries + specialization-catalog.json 验证 + Python 逐源分类（loot 612 / upgrade_ek 12 全专精）
    - 优先级：中（随 speed 维度推进时解决）

- computeCarryDps:33 Number.isFinite guard 静默吞掉 NaN/非正 damageAggregate <!-- auto-todo:id=atd_600a5e8368 -->
  - 记录时间: `2026-08-10T09:50:08+08:00`
  - 类型: issue
  - 位置: `src/domain/simulator/baseDps.ts:33`
  - 备注: globalBuffMultiplier=NaN 等上游损坏时加成被静默替换为 1，carryDps 有合法值但无 warning 诊断（集成契约审计发现，锁现状）

- Vin Ursa(127) + 4 英雄 vulnerability 数据源缺失——favored_foe 数值 API 不暴露 <!-- auto-todo:id=atd_06da25def9 -->
  - 记录时间: `2026-08-12T12:30:28+08:00`
  - 类型: follow-up
  - 位置: `public/data/v1/champion-details`
  - 备注: Vin Ursa(127) increase_monster_damage_if_favored_foe_from_hero_id,400,127：hero 127 在 API 中无 favored_foe 标签，无法确定对哪种敌人生效
    - 4 英雄仅 favored_foe 标签无伤害量：Turiel(49,fiend)/Jaheira(61,beast)/Laezel(128,aberration)/Van Richten(177,undead) — 引擎内置偏好敌人加成，API 不暴露数值
    - Zorbu(22) zorbu_lifelong_enemies,0.01 per-kill 动态堆叠，依赖存档击杀数（需用户输入）
    - 影响：5 英雄的偏好敌人易伤加成无法建模
    - 修复方向：需游戏内实测/社区数据补充，或 Zorbu 接 manualStackCount 同构用户假设入参
    - 来源：wiki 交叉核对 P2 验证（2026-08-10）

- 普通 Epic 可升 Golden Epic 的升级效果数据 API 不提供 <!-- auto-todo:id=atd_31e017c03e -->
  - 记录时间: `2026-08-12T12:30:39+08:00`
  - 类型: follow-up
  - 位置: `scripts/data/normalize-champions.ts`
  - 备注: 2478 条 allowGoldenEpic=true 的普通装备可升级为 GE，但升级后的效果值不在 CNE API 数据中
    - 140 条原生 isGoldenEpic=true 已正确进 loot-catalog（rarity=4 的 effectString 即 GE 值）
    - 每个槽位要么是 GE 要么是普通 Epic（不存在同一槽位两者并存），catalog 正确反映可用装备
    - 影响：有 GE 升级装备的玩家评分可能被低估（普通 Epic 值 < GE 升级值）
    - 修复方向：需从游戏内实测/社区数据补充 GE 升级效果值
    - 来源：wiki 交叉核对 P3 验证（2026-08-10）

- Gazrick snowflake 位置形状与 set table 语义待建模 <!-- auto-todo:id=atd_63ac39de96 -->
  - 记录时间: `2026-08-15T01:04:02+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroTargetingRelation.ts`
  - 备注: 当前公开数据有 snowflake target、amount_func=set、amount_func_set_table 和 direct_distance_from_source，但阵型产物没有雪花形状判定器，距离和 table 越界语义也未冻结。
    - 影响：不能安全把信号映射为全队或普通拓扑距离，否则会高估 DPS。
    - 后续：先定义雪花形状匹配、direct distance 语义和 set table 下标/越界规则，再贯通 signal、build、planner 与回归测试。

- Shaka active_campaign 动态拼图机制待建模 <!-- auto-todo:id=atd_ef116b9822 -->
  - 记录时间: `2026-08-15T01:04:02+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroTargetingRelation.ts`
  - 备注: amount_expr=upgrade_amount 的跨升级取值已有通用基础，但 active_campaign、has_effect_key、per_slot 与动态拼图匹配状态仍未进入 planner 求值。
    - 影响：不能把静态 upgrade amount 当作真实 DPS 加成。
    - 后续：单独定义拼图状态、slot/tag 匹配与 per_slot 计数，再实现运行时求值和测试。

<!-- auto-todo:end -->
