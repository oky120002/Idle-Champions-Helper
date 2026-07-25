<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- formation-persistence validation 不校验 scenarioRef <!-- auto-todo:id=atd_c6d7b8b82a -->
  - 记录时间: `2026-07-20T11:43:52+08:00`
  - 类型: follow-up
  - 位置: `src/data/formation-persistence/validation.ts`
  - 备注: validation.ts 只校验 slotIds/championIds，不校验 scenarioRef.kind/id（文档已按代码事实修正）
    - 处置：若产品需识别失效场景身份，再补 scenarioRef 校验

- 9.1 escort 锁槽按 column 降序启发式，官方未标注具体槽位 <!-- auto-todo:id=atd_492b5b61bd -->
  - 记录时间: `2026-07-20T11:43:52+08:00`
  - 类型: issue
  - 位置: `scripts/data/build-models.mjs`
  - 备注: projectMechanicsToScenario 对 slot_escort* mechanic 按 column 降序锁前排首槽（启发式，官方未标注护送具体槽位）
    - 处置：精确槽位需官方 formation 元数据或人工校准后替换

- per_hero_expr 存档依赖布尔谓词 17 个被整体丢弃（数据流缺口） <!-- auto-todo:id=atd_d957df0b59 -->
  - 记录时间: `2026-07-21T10:17:41+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroPredicate.ts:114`
  - 备注: parseHeroPredicate 对 HasEffect/GetUpgradeUnlocked/GetFeatEquipped/GetUpgradePurchased/NumEffectKey/EligibleForPatron/is_alive/DefHasTag 等存档依赖布尔谓词返回 null，含它们的 per_hero_expr 整体保守丢弃。
    - 影响：这些 signal 的 formationCountQualifier 退化为 null/filterQualifier，stack 数量可能高估；raw 164 个去重 per_hero_expr 中 17 个（10.4%）受影响
    - 关联：expression-evaluator-plan.md，需 profile context（装备/专长/effect 状态），属后续 milestone
    - 处置：随 numericExpression 落地补存档依赖布尔节点 + profile context 求值

- targets.type:heroes 英雄 ID 白名单未映射（filter_targets hero_ids/exclude_heroes 已处理） <!-- auto-todo:id=atd_3f8b5d17e2 -->
  - 记录时间: `2026-07-21T16:10:00+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/signalSemantics.ts:114`
  - 备注: 英雄 ID 定位两条路径的处理状态：
    - filter_targets：exclude_heroes/hero_ids **已处理**（146c4723 normalizeTargetQualifier heroIdsToPredicate，heroId AST 节点）；wrapper 派生路径合并生效（f389586b，hero 82 等 +210 行）。
    - targets：`{type:"heroes",hero_ids:[...]}`（raw 30 处）仍未处理——normalizeObjectRelation 无 type:heroes 映射 → normalizeExplicitTargeting unsupported → 整条 effect 丢弃。当前影响小（hero_dps_multiplier_mult 仅 10 处因 targets unsupported，其中 type:heroes 1 处，余为 other/active_campaign/slot_if_expr 等，多为孤立 effect_def）。
    - affected_by_upgrade 是 upgrade_id 运行时依赖，保持丢弃合理。
    - 处置：低频，归 M2+ 目标限定精化时补（normalizeObjectRelation 映射 type:heroes→relation='any' + hero_ids 提取到 targetQualifier）。

- deleteUserProfileData 未清 heroAbilityOverrides，override 是否随 profile 删待产品决策 <!-- auto-todo:id=atd_218690060f -->
  - 记录时间: `2026-07-24T10:59:06+08:00`
  - 类型: follow-up
  - 位置: `src/data/user-profile-store/userProfileStore.ts:68`
  - 备注: deleteUserProfileData 语义是删 profile snapshot（handleDelete 后 setSyncState no-snapshot），不清 heroAbilityOverrides；override 是否随 profile 删待产品决策
    - 原 generateCoverageReport 孤学子项已于 2026-07-24 删除（simulator-data-coverage.ts + simulatorDataCoverage.test.ts，无调用方、无文档计划），本条仅剩 heroAbilityOverrides

- equipmentAdjustment 结构性局限（stage 15 接线前需重审） <!-- auto-todo:id=atd_4410248f38 -->
  - 记录时间: `2026-07-24T22:10:04+08:00`
  - 类型: follow-up
  - 位置: `src/domain/planner/steadyStateScoring.ts:335`
  - 备注: 当前 equipmentAdjustmentByHero 按 carryId 取调整比（ownedEquipMult/theoreticalLootMult）乘进整个 carryDps，但支持位 loot 贡献未调整且只收 global_dps
    - 影响①：carryDps 的 sharedPools 聚合所有英雄 global_dps loot，支持位装备贡献从不缩放
    - 影响②：theoreticalLootMult/ownedEquipMult 只收 global_dps_multiplier_mult（692 条），不收 hero_dps（160）和 buff_upgrade（2088）loot，而 M1 collectRawEffectEntries 全部进 damage pool → carry 自己的 hero_dps loot 停在 M1 理论上界
    - 处置：stage 15 UI 接线 owned 装备前决定是否重构 damage pool 按 owned loot 逐英雄裁剪（替换 per-carry 整体缩放近似）
    - 当前死码（?? 1 默认）无运行时影响；关联 milestone-3-enhancement.md §13.1/§13.4（hero_dps 缺口已部分文档化，支持位未调整后果未显式记录）

- scoreFormation 三重 evaluatePlacementFit 调用（实际冗余小，非 3× position 检查） <!-- auto-todo:id=atd_d71dd2a7d8 -->
  - 记录时间: `2026-07-25T00:05:30+08:00`
  - 类型: optimization
  - 位置: `src/domain/planner/steadyStateScoring.ts:260`
  - 备注: 第十二轮审计复核修正原描述：dimension filter 在 matchesPositionQualifier/matchesHeroQualifier 之前（placementFit.ts:218-223），每个信号只在自己维度的调用里做 position/hero 检查一次——原「position/hero 检查 3×」是事实错误。
    - 实际冗余：collectSignals 跑 3 次（廉价 array spread）+ for-loop 3 次（每信号 dimension check 跑 3 次但 position/hero/pool 只 1 次）；crit/vuln 维度的 pool 聚合已由 evaluatePlacementFit 的 aggregatePools:false 跳过（原 atd_6badc71012 已解决），剩余冗余仅 collectSignals 与 dimension filter 重复。
    - 量级：crit/vuln 活跃信号通常 0-2 个，pool 聚合是廉价 Map op；整体浪费可忽略（H² 对 × 少量 op）。
    - 处置：不优先优化（ponytail：无实测性能需求不重构热路径；scoring core 改动风险 > 收益）。若 profiling 显示 scoreFormation 是瓶颈再统一调用 + 按 dimension 分区。

- slot_escort 英雄占格：仅 v80 有干净 hero_id，v232 需 name 解析，v181/v186 是 NPC <!-- auto-todo:id=atd_aca5040e39 -->
  - 记录时间: `2026-07-25T00:05:44+08:00`
  - 类型: issue
  - 位置: `scripts/data/normalize-adventures.ts:706`
  - 备注: 第十二轮审计复核修正原范围：全库仅 1 个 slot_escort 带 hero_id（v80 Drizzt=hero 18，确认为可玩英雄）；auto-todo 原列的 v181/v186 Azaka 实为 slot_escort_by_area + names:["Azaka's Corpse"]（NPC 尸体，非英雄，正确不进 forcedHeroIds）；v232 Nordom 是 {name:"Nordom"}（英雄但无 hero_id，需 name→hero 解析）。
    - 三种数据形态：① v80 hero_id（干净，可直接提取）；② v181/v186 NPC names（非英雄）；③ v232 hero by name（脆弱，本地化敏感）。
    - 语义疑点：slot_escort hero_id 是「force-include（玩家须含该英雄）」还是「slot-occupied-by-hero（预占特定槽位）」？forcedHeroes 是 slot 无关的，不捕捉 slot_id=4 的槽位锁定。
    - 处置：影响面极小（1 variant 干净 + 1 variant 需 name 解析），语义需确认；不优先。若修，hero_id 路径在 collectHeroRestrictions 加 slot_escort.hero_id → forcedHeroIds（NPC 天然排除）。

- StatusMessage 单语 string，英文 locale 下状态条全中文（系统性 i18n 缺口） <!-- auto-todo:id=atd_ad52385c59 -->
  - 记录时间: `2026-07-25T16:37:17+08:00`
  - 类型: bug
  - 位置: `src/components/statusMessage.ts`
  - 备注: StatusMessage.title/detail 是单语 string，create*StatusMessage 全部调用方传中文硬编码；StatusMessageBanner 直接渲染不经 i18n，英文 locale 下状态条全中文。
    - 影响面：formation（formation-board-actions/formation-draft-prompt-actions/formation-preset-actions/formation-bootstrap-operations/useFormationDraftPersistence）+ presets（usePresetsPageModel），约 10 文件 30 调用点
    - M1-M3 既有，非 M4 引入；M4 第3轮审计发现
    - 处置：StatusMessage 改持 zh/en 双语字段，create*StatusMessage 改传 {zh,en}，StatusMessageBanner 经 t() 渲染；跨模块重构

- Planner 可编辑阵型棋盘（exact-formation 评估 UI） <!-- auto-todo:id=atd_147941fa1e -->
  - 记录时间: `2026-07-25T21:03:14+08:00`
  - 类型: follow-up
  - 位置: `src/pages/planner/`
  - 备注: evaluateFormation 纯入口已就绪（评估指定阵型不搜索，CLI 已证明），planner UI 尚无可编辑棋盘触发它
    - 需 UX 设计桌面拖拽 / 移动 HeroPicker 的 exact-formation 评估面板
    - 区别于现有 lockedSlots 重搜：lockedSlots 仍搜索最优排列，evaluateFormation 评估用户指定阵型
    - 当前调整→重算闭环由 lockedSlots 承担，exact-formation 评估是下一步

<!-- auto-todo:end -->
