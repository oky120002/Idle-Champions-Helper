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

- planner.css 剩余交织块未完全拆分（scenario-selection + result-card + save-preset） <!-- auto-todo:id=atd_7a3f1c9d2e -->
  - 记录时间: `2026-07-30T15:40:00+08:00`
  - 类型: optimization
  - 位置: `src/styles/pages/planner.css`
  - 备注: 双主题 CSS 审计（ff92e425..69323cad）发现 planner.css 633 行超 pages 体量预算「>520 必须拆」。本次已拆出自包含的 breakdown / scoring-mode / stack-count 到 pages/planner/{breakdown,controls}.css，planner.css 降到 445 行（仍处「应拆」381-520）。
    - 剩余 scenario-selection + result-card + save-preset 三块约 400 行，经 13 组跨块共享逗号选择器深度交织，且有 8 个跨范围重复选择器（如 .planner-result-card__placement 在 67/181/367），级联顺序敏感，强拆会改级联。
    - 处置：低优先级，当前 445 行可接受；待 scenario-selection 或 result-card 单块演进显著时，先抽 12 组跨块共享原语（panel 背景、muted 文本、label/pill/list 样式）到 pages/planner/panels.css，再按块拆 scenario-selection.css / result-card.css / save-preset.css。

- 颜色可读性守护缺对比度检查（check-colors 只查硬编码） <!-- auto-todo:id=atd_9c4e7f2a1b -->
  - 记录时间: `2026-07-30T17:30:00+08:00`
  - 类型: follow-up
  - 位置: `scripts/check-colors.ts`
  - 备注: 双主题深度审计（854c8ff1）发现 `check-colors.ts` 只扫描硬编码颜色字面量（rgb/#hex），不校验「文字 vs 背景」对比度。前序 b0e03936 自称「技术可读性（L 差 >65%）已自动保证」是过度承诺——铜/钢/金/rarity/cat 作文字在浅底实测 ratio 1.08–1.47（不可读），靠人工 oklch 实测才发现。eyebrow 类装饰标签 <4.5 仍存（planner/result-card__secondary spot 3.72、tag-pill--muted cat 色 4.48）。
    - （守护），补强方法见 [[theme-color-readability-audit]]
    - 处置：中优先级；补一个 puppeteer/playwright 跑双主题各页、按 oklch→线性亮度→WCAG ratio 校验文字（含前景 alpha 合成、背景向上追溯），低于阈值（正文 4.5 / 大字 3）即报。可作为 npm run lint:contrast 接入 pre-push（参考 [[test-chain-lint-strategy]] 勿拖慢日常 TDD）。

- 专精选择面板对级联型专精树不尊重依赖链（hero 165/55/81 what-if 可能产生游戏不可能组合） <!-- auto-todo:id=atd_7c4a2e9b01 -->
  - 记录时间: `2026-07-30T13:30:00+08:00`
  - 类型: follow-up
  - 位置: `src/pages/planner/specializationSelection.ts:groupSpecializationsByTier`
  - 备注: ADR 0017 UI 输入层按 requiredLevel 分层、每层单选，假设「同 requiredLevel = 同互斥组」。hero 165/55/81 是级联型专精树：依赖层（如 165 lvl=150 的 24 选项）各自 requiredUpgradeId 指向上层某个选择，UI 把依赖层全平铺成单选、且改上层后 applyTierSelection 不重置下层 → what-if override 可能保留游戏不可能的组合（如 lvl70=Tyr 但 lvl150 选了要求 Moradin 的项）。仅影响面板 override 探索（3 英雄）；核心推荐用存档 specialization_choices（游戏保证合法），不受影响。
    - （按 requiredLevel 分层，无 requiredUpgradeId 依赖链）
    - 处置：低优先级；依赖感知 UI 需 catalog 带 requiredUpgradeId + 渲染时禁用/过滤未满足前置的依赖层选项（或改上层时清孤立的下游选择）。YAGNI：仅 3 英雄 what-if 探索场景，暂不展开。

- equipmentAdjustment 支持位 loot 未调整 + hero_dps/buff_upgrade loot 不收（UI 已接线，近似仍存） <!-- auto-todo:id=atd_3cb8df390e -->
  - 记录时间: `2026-07-31T22:11:10+08:00`
  - 类型: follow-up
  - 位置: `src/domain/planner/steadyStateScoring.ts:335`
  - 备注: 原 atd_4410248f38 备注「stage 15 UI 接线前需重审」已部分过期——UI 已接线（PlannerEvaluatePage.tsx:90 + usePlannerPageModel.ts:61 计算 equipmentAdjustmentByHero 并传入）。结构性局限仍然成立：
    - 影响①：carryDps 的 sharedPools 聚合所有英雄 global_dps loot，支持位装备贡献从不缩放
    - 影响②：theoreticalLootMult/ownedEquipMult 只收 global_dps_multiplier_mult（692 条），不收 hero_dps（160）和 buff_upgrade（2088）loot；equipmentMult.ts:13-17 注释明确 MVP 范围只接 hero_dps_multiplier_mult
    - 当前死码（?? 1 默认）已活，非阻塞；近似后果（支持位 loot 未调整）未在 docs/research/data/planner/equipment-and-abilities.md 显式记录
    - 处置：待 owned 装备精化时再评估是否重构 damage pool 按 owned loot 逐英雄裁剪（替换 per-carry 整体缩放近似）；当前降低优先级

<!-- auto-todo:end -->
