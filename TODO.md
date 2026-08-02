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

- userDataPage.syncFlow 测试 component 套件负载下时序 flaky <!-- auto-todo:id=atd_f1a2c3b4d5 -->
  - 记录时间: `2026-08-02T18:40:00+08:00`（2026-08-02 复审确认根因，非预存）
  - 类型: issue
  - 位置: `src/pages/user-data/userDataPage.syncFlow.test.tsx`（多测轮番：line 218「切换本地开发快照不覆盖」、line 394「同步错误不含凭证」均复现）
  - 备注: `npx vitest run --project component` 连跑 3 轮约 1 次失败，**不同 syncFlow 用例轮番 flake** = 用例内异步链时序，非共享状态泄漏。原「5503ms」是 b1472a66（fileParallelism=false / asyncUtilTimeout=5000 / testTimeout=30000）之前的陈旧观察，当前配置已不匹配。
    - 根因（已定位）：用例断言的异步链在 component 套件内存/时序压力下未在 `waitFor`（asyncUtilTimeout=5000ms）内完成。line 218 链 = `useUserSyncModel.loadProfileResolution` → `resolveLocalDevSnapshot` → `readLocalDevUserProfileSnapshot` 的**动态 import**（`await import('../user-sync/localDevPrivateSnapshot')`）+ fetch + `buildUserProfileSnapshot` + setState；line 394 链 = fetch reject → 错误渲染。源切换成功（DOM 已显「本地开发快照」）但「拥有英雄 N 个」未渲染 = profileResolution 未在窗口内更新。
    - 影响：CI 偶发红，侵蚀信任；非生产 bug（组件行为正确，仅测试时序）
    - 证据：component 套件 3 轮 1 败（line 218，getByText「拥有英雄 1 个」超时）；全量 test:run 3 轮 1 败（line 394）；失败 DOM 显示源已切换、英雄数缺失
    - 附带发现：`resetDatabase` 的 `deleteDatabase` 用 `onblocked→resolve()`（阻塞时不删却放过），与其余 3 个测试文件（plannerOverridesStore/formationStores/client 均 `onblocked→reject`）不一致；非本 flake 主因（store 层每操作 open→close 连接，阻塞概率低），但是掩盖性写法，宜择期统一为 reject
    - 处置（非本轮 planner 范围，待专项）：① 精确化——line 218 等 local-dev 用例的 `waitFor` 显式提 timeout（症状对治，低风险）；② 根治——`useUserSyncModel` 的 fetch/import 加 AbortController 于 unmount 时取消，消除跨测 in-flight op 干扰；③ 统一 resetDatabase onblocked 模式

<!-- auto-todo:end -->
