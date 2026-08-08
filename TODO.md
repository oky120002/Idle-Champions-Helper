<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- HasEffect 布尔谓词未解析，含它的 per_hero_expr 整体保守丢弃（数据流缺口） <!-- auto-todo:id=atd_d957df0b59 -->
  - 记录时间: `2026-07-21T10:17:41+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroPredicate.ts:123`
  - 备注: 当前唯一未解析的存档依赖**布尔**谓词 = HasEffect（NumEffectKey/DefHasTag 真实数据 0 实例）。A①②③（`53ad9a6b`/`5ac32e4f`/`ea117797`）已落地 GetUpgradeUnlocked/GetUpgradePurchased/GetFeatEquipped/is_alive/EligibleForPatron 五族。
    - 证据：signal-coverage 实测 85 个去重 per_hero_expr，50 已解析、35 未解析；35 中仅 HasEffect 约 4 实例（`!HasEffect(vampire_spawn)`×2、`HasEffect(alyndra_portented_v2)`、`HasEffect(celeste_heal)&&hero_id==82`）属布尔谓词丢弃，其余全为数值表达式（stage 7 叠层计算，本不解析为谓词）
    - 影响：含 HasEffect 的 per_hero_expr 整体 null → formationCountQualifier 退化为 null/filterQualifier，stack 数量可能高估（仅 4 实例，影响面小）
    - 关联：expression-evaluator.md；HasEffect 属阵型运行时另案（effect 跨英雄共享，count qualifier 对全阵型求值致 cross，需 effect 作用图 + 迭代求值）
    - 处置：effect 作用图基建后补 HasEffect 节点 + profile context 求值

- buff_upgrade wrapper per_hero_expr 是否需传播到 base qualifier（B 域 wrapper 语义） <!-- auto-todo:id=atd_36c2b3111c -->
  - 记录时间: `2026-08-02T16:45:10+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/equipmentBuffSignals.ts:64`
  - 备注: A①②③ 期间发现：hero 119 (buff_upgrade,25,19676 is_alive) / hero 175 (buff_upgrades 英雄之兰) 的 per_hero_expr 已可解析，但 buff_upgrade wrapper 设计上 formationCountQualifier=null（buildEquipmentBuffWrapper + build 期 preset effect-helpers.ts:777-792），wrapper 放大 base 时继承 base targeting、自身不携带 count qualifier。
    - 处置：需确认 wrapper 自身 per_hero_expr 是否应覆盖/扩展 base targeting（base upgrade 19676/19356 的 targeting 是否充分）。属 B 域 wrapper 语义，非谓词解析问题。

- planner 筛选限制审计——确认模拟器不内嵌 patron/拥有状态等限制 <!-- auto-todo:id=atd_3a104afb9d -->
  - 记录时间: `2026-08-06T15:18:43+08:00`
  - 类型: follow-up
  - 备注: Patron 过滤功能开发中确立的架构原则
    - 原则：planner 是纯计算引擎，入参什么算什么，不内嵌筛选/限制逻辑
    - 任务：审计 planner 是否有不该有的限制（patron 资格、英雄拥有状态等），如有则移到外部入参构建
    - 背景：champion filter 层做限制，planner 不碰；用户在 Patron 过滤功能中明确要求

- userProfileSnapshotSchema 嵌套字段覆盖不足：equipment/feats/lootBySlot 等经 .loose() 透传无校验，腐蚀可静默进入 scoreFormation <!-- auto-todo:id=atd_6a92065be3 -->
  - 记录时间: `2026-08-08T10:03:21+08:00`
  - 类型: issue
  - 位置: `src/domain/types/stored-record-schemas.ts:18-32`
  - 备注: 与 #4 level=NaN 同类问题，仅 level 被堵住 - 影响：非 level 字段腐蚀仍静默进入消费方 - 证据：stored-record-schemas.ts ownedHeroItemSchema 只钉 heroId/level/isOwned

- fetchUserProfilePayloads 吞掉所有 per-mirror 错误：用户无法区分凭证错误与网络故障 <!-- auto-todo:id=atd_24227ab5ba -->
  - 记录时间: `2026-08-08T10:03:25+08:00`
  - 类型: issue
  - 位置: `src/data/user-sync/officialClient.ts:241-260`
  - 备注: 内层 catch 无条件吞掉 401/403/500/网络断开，外层统一替换为通用失败消息 - 影响：一次凭证错误同步发 5x3=15 个请求才失败，延迟长且无诊断价值

- readCredentialVault/saveCredentialVault 为死代码，可删除 <!-- auto-todo:id=atd_ef7c668e14 -->
  - 记录时间: `2026-08-08T10:03:29+08:00`
  - 类型: cleanup
  - 位置: `src/data/user-profile-store/userProfileStore.ts:37-67`
  - 备注: rg 确认仅 index.ts re-export 和测试引用，无生产代码调用 - 影响：维护负担

- memoryCache 缓存结果而非 Promise：并发请求 thundering herd <!-- auto-todo:id=atd_499454962a -->
  - 记录时间: `2026-08-08T10:03:33+08:00`
  - 类型: optimization
  - 位置: `src/data/client.ts:6,107-125`
  - 备注: loadCollectionAtVersion 在 fetchJson 返回前不设缓存，两个并发请求各自 fetch+parse+写IDB - 影响：collection 可达 17.8MB 解析，并发浪费 CPU/带宽 - 修法：缓存 Promise 而非结果

- plannerOverridesStore 整表校验有连坐风险：一条腐蚀 override 阻塞全部 <!-- auto-todo:id=atd_fef1aab544 -->
  - 记录时间: `2026-08-08T10:03:40+08:00`
  - 类型: issue
  - 位置: `src/data/plannerOverridesStore.ts:17`
  - 备注: 与 formationPresetStore 已修的 P1-2 同模式 - 影响：planner override 读取可能因单条坏数据整体失败 - 修法：参照 preset store 改为逐条校验跳过

- PendingResultsTransition.reason 字段被写入但从未被读取（死逻辑） <!-- auto-todo:id=atd_05a192d986 -->
  - 记录时间: `2026-08-08T10:03:43+08:00`
  - 类型: cleanup
  - 位置: `src/components/workbench/useWorkbenchResultsMotion.ts:21-24`
  - 备注: prepareResultsViewportTransition 传入 reason 但消费方只读 shouldRelocate - 影响：ResultsTransitionReason 类型和 reason 参数是死代码

- useUserHeroesPageModel visibleCount 传全库总数而非筛选后数量：筛选态下返回顶部按钮可能不显示 <!-- auto-todo:id=atd_18ddf7e4ca -->
  - 记录时间: `2026-08-08T10:03:49+08:00`
  - 类型: issue
  - 位置: `src/pages/user-heroes/useUserHeroesPageModel.ts:55`
  - 备注: visibleCount 应为 derived.filteredChampions.length 而非 state.champions.length - 影响：仅 UX，筛选态下浮动返回顶部按钮可能不出现

<!-- auto-todo:end -->
