# 里程碑 3·补强

- 作用：M3 执行步骤清单；产出推荐准确 + 推图预估 + 辅助信息。架构决策、16 阶段进度勾选、文档同步硬约束见 `evolution-plan.md` 总纲。
- 状态：阶段 10-14 待做 [ ]。

---

# 阶段 10：推图层数预估（BUD/carryDps vs monster·批判①）

**目标**：预估"能推到第几层"，服务"方便推图"。
**风险**：怪物 health 数据源未确认（批判①）；BUD 机制下 DPS 近似有偏差（用 BUD 更准）。

### 10.1（数据源确认）怪物 stats 数据源
- **改动**：确认 `monster_base_stats` 的 health 字段（若有）或 monster properties；确认 `dps_growth_rate_curve` 用法。
- **测试**：数据源确认报告归档。
- **验证**：`jq monster_base_stats` 确认 health/血量字段。
- **commit**：`docs(data): 10.1 怪物 stats 数据源确认`。

### 10.2 推图预估算法
- **改动**：新建 `src/domain/planner/areaEstimation.ts`：二分查找 `max area where BUD（或 carryDps）>= monster_stat(area)`（stat 按 10.1 确认）；结合 survival 约束（阶段 5）。
- **测试（先写）**：高 BUD 阵型预估层数 > 低 BUD；survival 不足时受限。
- **标注**：基于 BUD（7.4）预估更准；若 BUD 未做完用 DPS 近似（标注偏差）。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 10.2 推图层数预估算法`。

### 10.3 UI 展示 + 测试
- **改动**：阶段 15 UI 展示"预估可推到第 X 层"。
- **测试**：UI 显示预估层数。
- **验证**：`npm run test:run` + 浏览器（阶段 15 联动）。
- **commit**：`feat(planner): 10.3 推图预估 UI 接入`（阶段 15 执行）。

---

# 阶段 11：全局加成（blessings + patron-perks·批判①）

**目标**：全局 pool 进 DPS。
**风险**：blessings 数据可能缺失（批判①）；patron-perks effect 结构未确认。

### 11.1（数据源确认）blessings 调查
- **改动**：检查 `UserProfileSnapshot` 有无 blessings；campaign/adventure 有无 favor；`blessings.json` 缺失确认。
- **测试**：调查报告归档。
- **验证**：`jq UserProfileSnapshot` + campaign 数据。
- **commit**：`docs(data): 11.1 blessings 数据源调查`。

### 11.2（数据源确认）patron-perks effect 结构
- **改动**：确认 patron-perks 的 effect 结构（perk 怎么给 DPS 加成？看 `patron-perks.json` 的 effect 字段）。
- **测试**：结构确认报告。
- **验证**：`jq patron-perks` 确认 effect。
- **commit**：`docs(data): 11.2 patron-perks effect 结构确认`。

### 11.3 扩 kind + 解析
- **改动**：`HeroAbilityKind` 加 `blessingMult`/`patronPerkMult`；dimension `global-buff`；解析 patron-perks（+ blessings 若 11.1 可行）。
- **测试（先写）**：解析正确。
- **验证**：`npm run test:run`；coverage 显示 global-buff。
- **commit**：`feat(data): 11.3 解析 patron-perks/blessings effect`。

### 11.4 全局 pool 进 DPS
- **改动**：`final_dps × global_buff_pool`；接入 pool 链。
- **测试**：含全局加成的 carryDps > 不含。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 11.4 全局 pool 进 DPS`。
- **条件**：若 11.1 确认 blessings 不可做，只做 patron-perks。

---

# 阶段 12：restrictions 文本解析（手工模板·批判③）

**目标**：restrictions 文本规则结构化（mechanics 之外的补充）。
**风险**：中英自由文本 NLP 不可靠（批判③），用关键词模板。

### 12.1 评估高频模式
- **改动**：jq 统计 restrictions 文本高频模式（escort/cursed/banned/occupied/stunned 等）。
- **测试**：统计报告归档。
- **验证**：jq 统计完成。
- **commit**：`docs(data): 12.1 restrictions 高频模式评估`。

### 12.2 模板匹配解析器（不 NLP）
- **改动**：新建 `scripts/data/restrictions-parser.mjs`：高频关键词模板匹配（中英）→ forced/banned/locked；**不用 NLP**。
- **测试（先写）**：高频模式（如"四格被小鸡占据"→ lockedSlots 4）匹配正确；无法匹配的进 warning。
- **验证**：`npm run test:run`。
- **commit**：`feat(data): 12.2 restrictions 模板匹配解析器`。

### 12.3 高频变体校验 + 手工补
- **改动**：高频变体 rules 手工校验；低频的记录但手工补到 `semantic-overrides.json`。
- **测试**：校验通过。
- **验证**：`npm run test:run`。
- **commit**：`feat(data): 12.3 restrictions 校验与手工补`。

---

# 阶段 13：装备/feat/传奇精细乘数（批判①）

**目标**：用真实装备替换 hypotheticalBaseline 近似。
**风险**：equipment 曲线数据源未确认（批判①）。

> **基线澄清（第三轮审计 2026-07-21）**：`loot`/`legendary`/`feat` 三类效果**已在 M1 进入理论最大基线**——`collectEffectEntries` 遍历 `detail.loot`/`detail.legendaryEffects`/`detail.feats`，所有 global/hero_dps 加成已进 `hero-abilities.json`（feat 由 commit 4bca0459 补齐）。本阶段 13 不是"让 feat 进基线"，而是**按玩家实际拥有的装备/选择的 feat/传奇等级精算**（替换"全 loot/全 feat/全 legendary 都生效"的理论近似）。即 M1 = 理论上界，阶段 13 = 按存档裁剪到真实值。

### 13.1（数据源确认）equipment 曲线
- **改动**：确认 ilvl/rarity 乘数曲线数据源（loot 数据？game-rules？effect-reference？）。
- **测试**：确认报告。
- **验证**：jq loot/game-rules 找曲线。
- **commit**：`docs(data): 13.1 equipment 曲线数据源确认`。

### 13.2 提取真实 equipment/feat/legendary
- **改动**：从 `UserProfileSnapshot.ownedChampions` 提取 equipment（slot/rarity/ilvl）/feats/legendaryLevels。
- **测试（先写）**：提取字段完整。
- **验证**：`npm run test:run`。
- **commit**：`feat(data): 13.2 提取真实装备数据`。

### 13.3 multiplier 计算
- **改动**：新建 `src/domain/simulator/equipmentMult.ts`：equipment/feat/legendary multiplier（按 13.1 曲线）。
- **测试（先写）**：multiplier 计算正确（高 ilvl > 低 ilvl）。
- **验证**：`npm run test:run`。
- **commit**：`feat(simulator): 13.3 装备/feat/传奇 multiplier 计算`。

### 13.4 接入 carryDps
- **改动**：`carryDps = baseDamage × levelCurve × equipment_mult × feat_mult × legendary_mult × pool`；替换 hypotheticalBaseline 近似。
- **测试**：真实装备的 carryDps ≠ 中位近似。
- **验证**：`npm run test:run` + 对照真实游戏（用户配合）。
- **commit**：`feat(planner): 13.4 装备乘数接入 carryDps`。

---

# 阶段 14：click 辅助 + modron（click 不纳入计算·用户明确）

**目标**：click damage 作辅助参考值展示；modron 辅助信息。
**边界**：click 不参与阵型模拟计算。

### 14.1 click damage 计算
- **改动**：新建 `src/domain/simulator/clickDamage.ts`：`click_damage = BUD × click_seconds`（派生自 BUD/DPS，`click_damage_seconds_global_dps`）。
- **测试（先写）**：click damage 计算正确。
- **验证**：`npm run test:run`。
- **commit**：`feat(simulator): 14.1 click damage 计算`。

### 14.2 click 辅助展示（不纳入模拟）
- **改动**：阶段 15 UI 展示 click damage（辅助参考值，尽可能准确）；**不参与阵型评分/排序**。
- **测试**：UI 显示 click damage；click 不影响推荐排序。
- **验证**：`npm run test:run` + 浏览器（阶段 15）。
- **commit**：`feat(planner): 14.2 click damage 辅助展示`（阶段 15 执行）。

### 14.3 modron 辅助信息
- **改动**：从 `game-rules.max_modron_auto_reset_area` 评估 modron reset 节奏；UI 展示"建议 modron reset 第 X 层"（辅助）。
- **测试**：modron 信息展示。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 14.3 modron 辅助信息展示`（阶段 15 执行）。
