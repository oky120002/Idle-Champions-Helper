# Planner 数据与隐私设计

## 数据流

生产私人数据流：

```text
用户粘贴 Support URL / User ID + Hash / 日志
  -> 前端本地解析并脱敏预览
  -> 用户点击手动同步
  -> official read-only client 调用 allowlist 接口
  -> normalizer 生成 UserProfileSnapshot
  -> IndexedDB 保存 snapshot
  -> planner 只读 snapshot + public/data/v1
```

开发私有数据流：

```text
IC_PRIVATE_USER_ID + IC_PRIVATE_HASH、显式 .local 文件，或仓库内仅供本地使用的私有 mock/token 输入
  -> scripts/private-user-data env loader
  -> 一次性抓取只读用户数据
  -> tmp/private-user-data/<timestamp>/
  -> 脱敏 manifest
  -> Vite serve 专用 dev endpoint（仅本地开发）
  -> 浏览器复用正常 normalizer 解析为开发态画像来源
  -> 显式来源选择切到 local-dev-snapshot
  -> privacy scanner 防止提交或构建泄漏
```

生产和开发两条流不能复用存储位置。开发凭证变量不得以 `VITE_` 开头，防止进入前端构建环境。本地私有 mock/token 允许驱动本地 preview 或本地 planner 验证，但不得被生产构建读取或打包；同时也不得覆盖浏览器真实同步快照。

## 核心数据契约

`UserProfileSnapshot`（`src/domain/user-profile/types.ts`）：

- `schemaVersion`、`updatedAt`、`warnings`
- `ownedHeroes`：`OwnedHero[]`（每英雄 `heroId` / `level` / `equipment` / `feats` / `legendaryEffects` / `unlockedFeats` / `lootBySlot`）
- `importedFormationSaves`：`ImportedFormationSave[]`（layout id、slot placements、specializations、feats、familiars、scenario relation）
- `campaigns?`：各战役 favor / blessings
- `patronPerks?`：patron perk 已购等级（perk_id → level）
- `blessings?`：`{ catalog, levels }`（blessing 定义 + 已购等级）
- `activeContext?`：`{ patronId, deity }`（active instance 的赞助者 / 战役上下文，patron type1 / 地图 blessing 过滤用）
- `legendaryLevelCap`

旧 snapshot 缺 `campaigns` / `patronPerks` / `blessings` / `activeContext` 字段时，消费侧以 `?? []` / `?? {}` / `?` 兼容。

`OwnedHeroLootSlot`：`slotId` / `rarity` / `gild` / `enchant` / `pigment` / `found`（enchant = item level，装备加成缩放用）。

`ResolvedHeroAbilityProfile`（`src/domain/abilities/abilityModel.ts`）：

- `heroId`、`name`、`seat`、`roles`、`tags`、`abilityScores`、`baseAttackDamageTypes`、`baseAttackCooldown`、`age`
- `baseDamage`、`costCurves`、`baseHealth`、`healthCurves`（DPS / 生存计算输入）
- `carrySignals`、`supportSignals`、`unsupportedSignals`、`sourceBreakdown`（能力信号与来源）

`ResolvedPlannerScenarioModel`（`src/domain/planner/plannerModel.ts`）：

- `variantId`、`scenarioRef`、`name`、`formationLayoutId`、`objectiveArea`
- `slotTopology`（槽位 id / row / column / adjacentSlotIds）、`forcedHeroes`、`lockedSlots`、`occupiedSlotCount`
- `allowedHeroes` / `allowedTagExpression`（白名单）、`enemyTypes`（vulnerability 条件匹配）、`scenarioWarnings`

`PlannerResult`（`src/domain/planner/recommendationTypes.ts`）：

- `objectiveValue`（游戏记数法字符串；模式目标量：carry-dps=carryDps / team-gold=teamGoldFind）
- `carryHeroId`、`placements`、`placementEntries`
- `explanations`（`PlannerNarrativeLine[]` 叙述行）、`warnings`
- `areaEstimate`（推图预估）、`breakdown`（`SimulationBreakdown` 结构化加成拆解）

## 官方只读 client

allowlist 只允许用户数据读取接口，例如 `getuserdetails`、`getcampaigndetails`、`getallformationsaves`。任何名字包含 claim、purchase、save、redeem、consume、set、update 语义的调用默认拒绝；放开写操作必须另作产品与安全决策。

fetch 参数必须固定：

- `credentials: "omit"`
- `cache: "no-store"`
- `referrerPolicy: "no-referrer"`

错误对象只允许包含接口名、状态码、脱敏 message 和 retry hint，不允许包含完整 user id / hash。

## IndexedDB 设计

数据库版本升级时新增：

- `userProfileSnapshots`：固定 key `'current'`，保留最近一份同步快照（单快照覆盖写）。
- `credentialVault`：仅在显式 opt-in 时保存；默认为空。
- `heroAbilityOverrides`：浏览器本地能力语义覆盖（按英雄全局存储）。

下游读用户画像须经显式数据源选择层（`userProfileSourceResolver`）：生产只走 `browser-sync`（读 IndexedDB `'current'` 快照）；本地开发可切 `local-dev-snapshot`（从 `tmp/private-user-data/` 实时构建，`persisted: false`，不写 IndexedDB、不覆盖生产 current key）。删除私人数据必须同时清理 snapshot、vault、sync status cache 和 planner 派生状态。页面应显示「当前私人数据存在 X 天」，不自动刷新。

## 隐私测试

- scanner 命中 fake secret 和 `tmp/private-user-data` 引用。
- scanner 不因 `user_id` / `hash` 普通占位符误报。
- env loader 缺失凭证时不打印 secret。
- manifest 只输出脱敏 user id / hash。
- `dist` 存在时也纳入 `privacy:scan`。
