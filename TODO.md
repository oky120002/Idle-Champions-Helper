<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

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
    - 关联：expression-evaluator.md，需 profile context（装备/专长/effect 状态）
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
    - 当前死码（?? 1 默认）无运行时影响；关联 `docs/research/data/planner/equipment-and-abilities.md`（hero_dps 缺口已文档化，支持位未调整后果未显式记录）

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
    - 语义确认（2026-07-25 产品反馈）：情况甲——护送英雄是玩家可拥有、能操控的英雄；玩家千小时经验未遇「护送英雄但未拥有」，默认 force-include 合理；玩家可选开关 ROI 不划算（1 variant + 玩家基本都有），不做。
    - raw 复核（2026-07-25）：slot_escort 记录共 340 条，含 hero_id 的仅 v80（=18）；另发现 follow_hero_id（hero 141，语义待查，暂不处理）；NPC 形态含 names 无 hero_id，天然排除。
    - 实施障碍：planner scenario 来自 build-models.ts buildOfficialScenarioModel（forcedHeroes=variant.forcedHeroIds 原始字段，不含 slot_escort hero_id）；slot_escort hero_id 在 definition.game_changes，normalize-adventures 的 collectHeroRestrictions 已遍历但产物未喂 planner。要让 planner 知道护送英雄，需 build-models 接入 game_changes 数据源（数据流改造，非 auto-todo 原记的「collectHeroRestrictions 加几行」）。
    - 处置：影响面 1 variant，原标注「不优先」成立；实施需 build-models 数据流改造 + 管线重跑 + 下游验证，暂不做。

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

- 阵型预设卡片显示场景原始标识串（如 variant:v80），玩家无法识别对应关卡 <!-- auto-todo:id=atd_83d6a91777 -->
  - 记录时间: `2026-07-25T23:39:00+08:00`
  - 类型: optimization
  - 位置: `src/pages/formation/FormationPresetCard.tsx:48`
  - 备注: FormationPresetCard.tsx:48 与 PresetCard.tsx:85-86 把阵型绑定的场景标识渲染为 `${kind}:${id}` 原始串（如 variant:v80），玩家看不懂对应哪个关卡
    - 深入评估原 atd_c6d7b8b82a（validation 校验场景标识）时发现方向有误：场景标识是元数据，不参与恢复/推荐/评分任何功能逻辑；真问题是 UI 展示不友好
    - 修复方向：查 variant 集合显示场景友好名；失效场景标记「原场景已消失」
    - 处置：低优先级 UX 改进；需 FormationPresetCard/PresetCard 引入 variant 集合数据依赖

- userDataPage.syncFlow 「本地开发快照读取失败」测试偶发超时（5016ms > 5000ms 默认） <!-- auto-todo:id=atd_a4f1c2e7b8 -->
  - 记录时间: `2026-07-28T02:02:00+08:00`
  - 类型: flaky
  - 位置: `src/pages/user-data/userDataPage.syncFlow.test.tsx`
  - 备注: planner DPS 审计（A04）质量门验证时发现：`npm run test:run` 偶发 1 failed，失败用例为该 sync flow 测试（5016ms 超 vitest 默认 5000ms），与 planner/DPS 改动无关（user-data 同步流）。系统负载高时（typecheck+vitest 串行，duration 66s+）触发；轻载（62s）通过。
    - 非本次审计引入（审计未触 user-data 模块）。
    - 处置：低优先级；该测试本身是异步同步流偏慢，可考虑单独调高 timeout 或拆分；不影响 planner 评分正确性。

- pipelineHash 不覆盖 src/domain/abilities build 依赖（改归一化须手动 FORCE_DATA_REBUILD） <!-- auto-todo:id=atd_b7e2d9f1c4 -->
  - 记录时间: `2026-07-28T02:32:00+08:00`
  - 类型: enhancement
  - 位置: `scripts/data/resource-sync-policy.ts:181`（PIPELINE_HASH_DIRS = ['scripts/data']）
  - 备注: planner DPS 审计（A11 runbooks 可执行性）发现：pipelineHash 仅哈希 scripts/data + normalize/fetch/build 三入口；effect-helpers（scripts/data）导入 src/domain/abilities（signalSemantics/heroPredicate/abilityModel）与 src/domain/effects（effect-string）为 build 依赖，但这些文件不在哈希覆盖内。改这些文件后若不 FORCE_DATA_REBUILD=1，hero-abilities.json 保持旧逻辑（静默 stale build）。
    - runbook（verify-formation-simulator.md「归一化改动注意」）+ AGENTS.md §1.2 + resource-sync-policy.test.ts 注释均已诚实标注此局限与 workaround（A11 修正了原过宽自述）。
    - 根因修复选项：PIPELINE_HASH_DIRS 加 `src/domain/abilities` + `src/domain/effects`（粗粒度，保守不漏，但 abilities 运行时改动也触发数据重建 ~10-30s，over-trigger）；或精确列 build 依赖文件（脆弱，transitive deps 易漏）。权衡未定，暂不做。
    - 处置：低优先级；当前 workaround（FORCE_DATA_REBUILD）已文档化且可执行；扩展覆盖待 over-trigger 代价 vs stale-build 风险的产品权衡。

- heroDpsMultiplier legacy filter→count 潜在 target 丢失（119 signal target=null） <!-- auto-todo:id=atd_c8f3a2b1d9 -->
  - 记录时间: `2026-07-28T08:28:00+08:00`
  - 类型: investigation
  - 位置: `src/domain/abilities/signalSemantics.ts:246`（attachSignalSemantics useFormationCountQualifier 分支）
  - 备注: planner DPS 审计 RV-A01-1 切入点 2 发现：FQ=true TQ=false（filter→count，无显式 count 源）的 signal 中，329 globalDpsMultiplier（全局 buff，target=null 正确）+ 7 globalGoldMultiplier，但 **119 heroDpsMultiplier + 3 heroHealthMultiplier** target=null。hero 作用域 buff target=null 意味着 buff 任意 carry（按 filter 计数）；若游戏语义是「filter 英雄吃 buff」（如 Bruenor Rally 仅 buff dwarf），则 filter 被误作 count、target 丢失 → 过度 buff。
    - 蔚善良榜样（有 stack_func_data.tag）已由 937e68c4 hasExplicitCountQualifier 正确分离；此 119 是**无 stack_func_data** 的 legacy 路径（filter→count，signalSemantics.ts:246 注释明确记载为设计近似）。
    - 确认需 per-effect 游戏语义核查（filter 是 count 源还是 target）——当前审计未逐一确认，不视为已确认缺陷。
    - 处置：低优先级；需对 119 heroDpsMultiplier 抽样核对 raw effect_string + 游戏描述；若确认反例，扩 hasExplicitCountQualifier 逻辑或补 target 推断。

- 专长/feat 修饰信号未进 built hero-abilities（蔚道德规范 +20% 缺失） <!-- auto-todo:id=atd_9a1b2c3d4e -->
  - 记录时间: `2026-07-28T13:10:00+08:00`
  - 类型: follow-up
  - 位置: `scripts/data/effect-helpers.ts:collectRawEffectEntries`（specialization 源未采集）
  - 备注: buff_upgrade progression 审计修复后，蔚 damage:hero pool 从 6.4e8（22× 高估）降到 1.66e7（0.57× 游戏，欠估 1.75×）。欠估主因之一：专长修饰（蔚「道德规范」对善良榜样 +20%）未进 built signals——`collectRawEffectEntries` 采集 upgrades/loot/legendaryEffects/feats/ability 五源，但 specialization（专长选择）不在其中。修 progression 后此缺口暴露（原被 progression 噪声掩盖）。
    - 影响所有有专长 buff_upgrade 的英雄（蔚等），carryDps 欠估专长修饰倍率。
    - 处置：中优先级；需在 collectRawEffectEntries 加 specialization 源采集（专长互斥选择 → 仅取选中项，需 profile context 或理论最大假设）。关联 vi-95.md 修复记录 #3。

- loot buff_upgrade rarity 选择取首条而非最高（蔚时髦披肩 rarity1 +25% 而非 +157.8%） <!-- auto-todo:id=atd_5f6e7d8c9b -->
  - 记录时间: `2026-07-28T13:10:00+08:00`
  - 类型: follow-up
  - 位置: `scripts/data/effect-helpers.ts:collectEffectEntries`（loot 多 rarity 同槽去重）
  - 备注: buff_upgrade progression 审计发现：蔚「时髦披肩」（loot slot2）有 rarity1(+25%)/2(+?)/.../+4(+157.8%) 多 tier，代码 collectEffectEntries 对同信号位（rarityGroupKey@upgradeId，loot upgradeId=null→'?'）按首条保留 → 取 rarity1 +25% 而非最高 +157.8%。IC 装备每槽只装备一件（最高 rarity），应取最高。
    - 影响所有有 multi-rarity loot buff_upgrade 的英雄；与 atd_9a1b2c3d4e 共同构成 pool 欠估来源。
    - 处置：中优先级；collectEffectEntries 对 loot 源同信号位多 magnitude 应取最高（保守上界），而非首条。需区分 loot（rarity 互斥取最高）vs 其它来源语义。关联 vi-95.md「pool 对照现状」。

- plannerPage.route component 测试 jsdom 下持续超时（baseline 隔离跑亦 4/6 失败） <!-- auto-todo:id=atd_3a8b1c5d2e -->
  - 记录时间: `2026-07-29T21:08:00+08:00`
  - 类型: flaky
  - 位置: `src/pages/planner/plannerPage.route.test.tsx:298`（推荐结果卡片 findByRole）
  - 备注: 加成机制隔离子任务4 验证时发现：mock 数据已加载（本地开发快照渲染成功），推荐结果卡在 beam search 完成前超时（~20s）。干净 baseline（818e9f5f，stash 本子任务改动后）隔离单跑同样 4/6 失败——非本子任务回归（buff 装配忠实提取，tsc + test:simulator 307 全绿 + 明斯克 golden 通过）。与「单独跑通过」既有认知矛盾，疑机器/负载相关（jsdom Sync beam search 接近超时阈值）。
    - 非 buff 装配隔离（子任务4）引入；test:simulator 闸门不含该 component 测试。
    - 处置：低优先级；jsdom Sync 推荐计算偏慢，可单独调高 timeout 或拆分重计算断言；不影响 planner 评分正确性。

- 专精选择面板对级联型专精树不尊重依赖链（hero 165/55/81 what-if 可能产生游戏不可能组合） <!-- auto-todo:id=atd_7c4a2e9b01 -->
  - 记录时间: `2026-07-30T13:30:00+08:00`
  - 类型: follow-up
  - 位置: `src/pages/planner/specializationSelection.ts:groupSpecializationsByTier`（按 requiredLevel 分层，无 requiredUpgradeId 依赖链）
  - 备注: ADR 0017 UI 输入层按 requiredLevel 分层、每层单选，假设「同 requiredLevel = 同互斥组」。hero 165/55/81 是级联型专精树：依赖层（如 165 lvl=150 的 24 选项）各自 requiredUpgradeId 指向上层某个选择，UI 把依赖层全平铺成单选、且改上层后 applyTierSelection 不重置下层 → what-if override 可能保留游戏不可能的组合（如 lvl70=Tyr 但 lvl150 选了要求 Moradin 的项）。仅影响面板 override 探索（3 英雄）；核心推荐用存档 specialization_choices（游戏保证合法），不受影响。
    - 处置：低优先级；依赖感知 UI 需 catalog 带 requiredUpgradeId + 渲染时禁用/过滤未满足前置的依赖层选项（或改上层时清孤立的下游选择）。YAGNI：仅 3 英雄 what-if 探索场景，暂不展开。

- planner 路由集成测试（plannerPage/plannerEvaluate.route.test）长期失败（11 用例，HEAD 即失败） <!-- auto-todo:id=atd_8f3a1c0d2e -->
  - 记录时间: `2026-07-30T14:10:00+08:00`
  - 类型: issue
  - 位置: `src/pages/planner/plannerPage.route.test.tsx`、`src/pages/planner/plannerEvaluate.route.test.tsx`
  - 备注: 测试只 mock `loadCollection`，但 `usePlannerCollections` 还调 `loadVersion()` + 3 个 `fetchJson`（patron-perks / feat-catalog / specialization-catalog）走原生 fetch；jsdom 无服务器 → Promise.all reject → loadError → 无「推荐结果」→ 用例 5s 超时。fetchJson/loadVersion 在范围起点（1f4cb65d）已存在，非本审计引入，但属长期红区（非本次 P0 修复回归）。
    - 处置：路由测试 beforeEach 须补 fetch mock（version.json + patron-perks + feat-catalog + specialization-catalog 返回空/夹具），或改用 MSW 拦截 data fetches。

<!-- auto-todo:end -->
