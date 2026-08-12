<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- HasEffect/HasEffectByID 布尔谓词未解析：7 个去重表达式(~14 原始实例)，含 2 个评分关键 <!-- auto-todo:id=atd_6f71fd37c3 -->
  - 记录时间: `2026-08-08T13:27:44+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroPredicate.ts:138-238`
  - 备注: 2026-08-08 深度复核修正：TODO 原说 4 个，实际 7 个去重表达式（含 HasEffectByID 漏报）
    - 评分关键实例：Skylla(169) HasEffectByID(2474) 门控 hero_dps_multiplier_mult,400(+400% DPS)；Knox(82) HasEffect(celeste_heal) 门控 damage_reduction,25(25%减伤)
    - 其余：Cazrin(166) 复合条件含 HasEffectByID(2416)、Alyndra(77) HasEffect、Kas(153) !HasEffect、Trixie(176) do_nothing(无影响)
    - 37 unparsed 中其余 ~30 个是数值表达式(floor/min/max/属性引用)和不支持的函数(num_applied_pigments/AverageILevels)，非谓词类型

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

- 全站正则表达式深度审查：正确性、业务逻辑契合度、扩散面 <!-- auto-todo:id=atd_regex_audit_001 -->
  - 记录时间: `2026-08-09T10:30:00+08:00`
  - 类型: follow-up
  - 位置: `src/**`
  - 备注: 对全站所有正则表达式做一次系统性深度审查
    - 正确性：ReDoS 风险、贪婪/非贪婪误用、字符类遗漏、锚点缺失、转义错误
    - 业务契合度：正则是否完美服务使用处的业务意图
    - 范围：src/ 全目录 + scripts/data/ 数据管线

- restrictions-parser 复合属性门槛 STAT and STAT of N+ 只捕获最后一个属性 <!-- auto-todo:id=atd_5010068521 -->
  - 记录时间: `2026-08-09T18:25:56+08:00`
  - 类型: follow-up
  - 位置: `scripts/data/restrictions-parser.ts:213`
  - 备注: 8 个变体受影响（如 STR and CON of 14+），需语义级解析增强

- applyHealthDrain drainRate>=1 时静默跳过（返回满血而非0） <!-- auto-todo:id=atd_d2d4ed72dc -->
  - 记录时间: `2026-08-09T18:26:02+08:00`
  - 类型: follow-up
  - 位置: `src/domain/simulator/areaEstimation.ts:134`
  - 备注: drainRate=1.0 时 guard 不通过返回满血而非0；实际数据最高 0.2 不触发，属防御性隐患

- recommendationEngine warnings 未走 i18n（跨层设计问题） <!-- auto-todo:id=atd_b8b9fcd5b6 -->
  - 记录时间: `2026-08-09T18:26:05+08:00`
  - 类型: follow-up
  - 位置: `src/domain/planner/recommendationEngine.ts:776`
  - 备注: engine 产出的 warning 是中文裸字符串，UI 直接渲染不经 t()；en-US locale 下用户看到中文 warning

- PlannerDamageSlots 不展示系统解析的 damageSourcePattern 位置限制（25 变体） <!-- auto-todo:id=atd_633996a2a3 -->
  - 记录时间: `2026-08-09T19:46:48+08:00`
  - 类型: optimization
  - 位置: `src/pages/planner/PlannerDamageSlots.tsx`
  - 备注: 来源：深度审计 2026-08-09 UI 子智能体发现

- EN 递增占格模式检测覆盖不足（variant 116 等） <!-- auto-todo:id=atd_1d344ad97a -->
  - 记录时间: `2026-08-09T19:46:55+08:00`
  - 类型: issue
  - 位置: `scripts/data/restrictions-parser.ts:46`
  - 备注: 来源：深度审计 2026-08-09 数据管线子智能体发现

- schema 未钉 enemyTypes/scenarioRef/objectiveArea/scenarioWarnings 等消费字段 <!-- auto-todo:id=atd_6752294b13 -->
  - 记录时间: `2026-08-09T19:46:59+08:00`
  - 类型: optimization
  - 位置: `src/domain/types/build-product-schemas.ts:63`
  - 备注: 来源：深度审计 2026-08-09 数据管线子智能体发现

- cooldownReduction 归一化管线缺失——1860 条原始效果产出 0 信号 <!-- auto-todo:id=atd_0cb934b094 -->
  - 记录时间: `2026-08-09T21:31:56+08:00`
  - 类型: issue
  - 位置: `scripts/data`
  - 备注: 1860 条 reduce_ultimate_cooldown 原始效果（154 英雄）产出 0 信号
    - 影响：speed 维度 cooldownReduction 信号完全丢失
    - 优先级：中

- 领域层硬编码中文 UI 文本未国际化（signalMultiplier 警告 + recommendationEngine 违规信息） <!-- auto-todo:id=atd_665afea3d4 -->
  - 记录时间: `2026-08-10T09:54:41+08:00`
  - 类型: issue
  - 位置: `src/domain/planner/mechanics/signalMultiplier.ts:44`
  - 备注: signalMultiplier.ts 警告和 recommendationEngine.ts 违规信息直接返回中文字符串，需改为返回结构化数据由 UI 层翻译

- snowflake/active_campaign target type 需 amount_func_set_table/amount_expr 管线支持 <!-- auto-todo:id=atd_60e2347278 -->
  - 记录时间: `2026-08-12T12:30:17+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroTargetingRelation.ts`
  - 备注: Gazrick(98) snowflake：amount_func=set + amount_func_set_table=[100,300,1100,4700,23900] 按距离索引，effect_string amount=0 非真实值
    - Shaka(79) active_campaign：amount_expr=upgrade_amount(13416,0) 动态拼图机制，amount=0 非真实值
    - 影响：2 英雄的位置限定 DPS 信号因 amount 机制不支持而丢弃
    - 修复方向：管线层支持 amount_func=set（set_table 按距离索引）和 amount_expr（动态求值），非位置关系映射问题
    - 来源：wiki 交叉核对 P0 验证（2026-08-10）

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

<!-- auto-todo:end -->
