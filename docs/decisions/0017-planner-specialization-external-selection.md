# 0017. 专精外部选择（build catalog + runtime 按玩家选择注入）

**Status**: Accepted
**Decided**: 2026-07-30

## 背景

专精（specialization）是英雄在互斥选项里选一个（或多个专精层各选一个）的 upgrade 节点（`champion-details` upgrades 里 `specializationName != null`）。照 feat（专长，ADR 隐含 `0008` 的「外面构建哪些加成」）应做「外部选择」——build 期提取选项成 catalog，runtime 按玩家实际选择注入对应 signal。

但专精此前被 `collectRawEffectEntries`（`scripts/data/effect-helpers.ts` 遍历 `detail.upgrades`）**全量烘进 `hero-abilities.json` base signal**——所有互斥专精同时 active。典型高估：明斯克（hero_id=7）5 个偏好敌人专精（upgrade 108-112，各 `enemyVulnerability +300%` 对一类怪物 tag）同时生效，而游戏里玩家只能选 1 个。

与 feat 的关键差异：feat 源于独立 `hero_feat_defines`（从未进 base）；**专精源于 champion-details upgrade 树，已在 base**。故专精外部化比 feat 侵入大：须从 base 剔除 + 输出 catalog + runtime 注入选中的。

玩家选择存在 `userDetails.details.heroes[].specialization_choices`（账号级 per-hero，upgrade id 列表，如明斯克 `[109]`；一英雄可多个，对应多个专精层）。

## 决策

**build 侧**：`collectRawEffectEntries` 按 `specializationName != null` 把专精 upgrade 的 effect entry 分流到 `specializationEntries`（复用 `buildEffectEntry`，与 base 同源同解析），并**从 base `effectEntries`/`upgradeEffectEntriesById` 剔除**（专精不再 always-active）。`specialization-catalog.ts` 按 `upgradeId` 归一化专精 signal（`splitEffectString`+`normalizeEffectSignal`+`attachSignalSemantics`，与 `buildOfficialHeroModel` 逐字相同，保证 catalog signal 与原 base 等价）→ `public/data/v1/specialization-catalog.json`（`{catalog: Record<heroId, SpecializationEntry[]>, updatedAt}`，47 hero / 115 专精选项）。

**类型/提取**：`OwnedHero` 加 `specializations: string[]`；`userProfileNormalizer` 从 `details.heroes[].specialization_choices` 提取。

**runtime**：`applySpecializationsToProfile` 注入玩家选中 `upgradeId`（`OwnedHero.specializations`）的全部 scoring signal。**不做 scoringMode 维度过滤**——专精是全局互斥选择，scoring 按模式自取所需维度，与外部化前 base 行为对称；若照 feat 按 `damage`/`gold` 过滤会漏掉 `vulnerability` 维度（明斯克偏好敌人 `enemyVulnerability`）。

## 后果

- 正面：专精不再全 active，按玩家选择生效（修正明斯克等 5 选 1 高估）。受控实验：`hero-abilities.json` 全局 **0 新增信号**，纯减法（174 信号移除：专精自身 + buff_upgrade 派生）。
- 已知**下界偏差**（均为低估、保守方向，非过冲；根因是约束「不动 buff_upgrade 展开 / HeroAbilitySignal 字段」，见替代方案）：
  1. **ability/loot/feat 源 buff_upgrade wrapper 增益专精时**，派生信号随专精离开 base（专精不再是其 target，wrapper 展开无目标），chosen 专精损失该 wrapper 增益。如明斯克 `buff_upgrades,25,108-112`（每 tag +25%）随专精离开 → chosen 偏好敌人保留 +300、丢失 +25（原 +325）。影响约 47 英雄。
  2. **专精自身效果为复杂 buff_upgrade wrapper**（`buff_upgrade_mult_by_distance` / `buff_upgrade_add_flat_amount` 等需展开解析）的约 4 英雄，catalog 走原始 `normalizeEffectSignal`（无展开）解析不出 → 省略，chosen 专精该效果丢失。
- 明斯克 golden（`damageReferenceVerification`，ADR 0015）level1 不受影响（专精 `requiredLevel=50` 未解锁），level722 度量值随专精离开 base 偏移（符合 0015「回归守护非精度标尺」，测试度量不断言）。

## 替代方案

- **给 buff_upgrade 展开加「派生信号靶向专精时挂到 catalog」**：否决——违反「不动 `collectEffectEntries` buff_upgrade 展开核心逻辑」约束；且派生 entry 的 `upgradeId` 是 wrapper 源（非 target），不携带 target upgradeId 难溯源到具体专精。
- **HeroAbilitySignal 加 upgradeId 字段，runtime 按「未选则剔除」**（不移除 base）：否决——违反「不动 HeroAbilitySignal 字段」约束。
- **catalog 按 scoringMode 维度过滤（照 feat）**：否决——漏 `vulnerability` 维度，明斯克偏好敌人永不注入。
- **专精 catalog 走 `feat-catalog` 同款独立解析（不共用 `collectRawEffectEntries`）**：否决——专精 effect 含 effect_keys/effectReference/复杂 wrapper，独立解析会与 base 发散；共用 `buildEffectEntry` 保证等价。

## 关联

- 依据：`docs/research/gameplay/feat-and-specialization.md`（feat/specialization 现状与差异）
- 影响：`docs/specs/modules/planner/mechanic-isolation.md`、`docs/research/gameplay/feat-and-specialization.md`
- 关联：`0008`（否决统一接口，专精按自然形态独立落地）、`0015`（明斯克 golden 回归守护口径）
