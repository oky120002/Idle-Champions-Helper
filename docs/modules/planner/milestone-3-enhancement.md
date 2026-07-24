# 里程碑 3·补强

- 作用：M3 执行步骤清单；产出推荐准确 + 推图预估 + 辅助信息。架构决策、16 阶段进度勾选、文档同步硬约束见 `evolution-plan.md` 总纲。
- 状态：阶段 10-14 已完成 [x]（核心算法；UI 接入 10.3/14.2 留阶段 15，14.4 pipeline 集成 + 第八轮审计 spec/form 缺口留后续）。

---

# 阶段 10：推图层数预估（BUD/carryDps vs monster·批判①）

**目标**：预估"能推到第几层"，服务"方便推图"。
**风险**：怪物 health 数据源未确认（批判①）；BUD 机制下 DPS 近似有偏差（用 BUD 更准）。
**绝对正确性边界（第六轮审计标注）**：截至 M2，carryDps/BUD 的**逻辑链与公式结构已验证**，但**绝对值未与真实游戏对照**（第六轮审计只做了代码审计，未做数值实测）。因此：
- **相对比较可信**：阵型推荐（谁更适合 carry、阵型排序）不受影响，可正常推进。
- **绝对值未验**：推图层数预估的"第 X 层"是绝对量，**依赖 7.5 BUD 实测校准**才能采信；7.5 完成前，10.2 的预估结果仅供方向参考，必须向用户标注"未校准"。
- 阶段 7.5 拿真实游戏 BUD 对照计算值修正公式后，10.2 才算闭环。

### 10.1（数据源确认）怪物 stats 数据源 [x]

> 报告归档：`docs/modules/planner/m3-data-source-confirmations.md` §10.1。
- **改动**：确认 `monster_base_stats` 的 health 字段（若有）或 monster properties；确认 `dps_growth_rate_curve` 用法。
- **测试**：数据源确认报告归档。
- **验证**：`jq monster_base_stats` 确认 health/血量字段。
- **commit**：`docs(data): 10.1 怪物 stats 数据源确认`。

### 10.2 推图预估算法 [x]

> 实现：`src/domain/planner/areaEstimation.ts` + `src/domain/simulator/monsterStats.ts`（怪物 stats 缩放）。
> 已知精度缺口：survival kind 映射只收 `health_mult`（百分比），未收 `health_add`（flat，~413 条）——effectiveHealth 的 flat 加成未纳入 pool（pool 模型当前纯百分比）。flat health 相对指数级 levelCurve 贡献极小，且整体绝对值本就未校准（7.5 边界），留作后续精度增强（需 pool 模型支持 flat-to-base 加法）。
- **改动**：新建 `src/domain/planner/areaEstimation.ts`：二分查找 `max area where BUD（或 carryDps）>= monster_stat(area)`（stat 按 10.1 确认）；结合 survival 约束（阶段 5）——`effectiveHealth=(baseHealth+Σhealth_add flat)×health_pool`（`health_add` 413 条 flat 在 5.1 留到本阶段聚合），不足 monster_damage 时限制推图层数；**boss vulnerability 匹配**（第八轮审计：3 个 `monsterTags:['boss']` 的 vulnerability 因 `scenario.enemyTypes` 不含 boss 静默失效，需 scenario/adventure 标记 boss 怪后接通 `is_boss` 判断）。
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

### 11.1（数据源确认）blessings 调查 [x]

> 报告：`m3-data-source-confirmations.md` §11.1。结论：不可做（definitions 无 blessing 效果定义 + snapshot 丢弃 favor/blessings）。阶段 11 只做 patron-perks。
- **改动**：检查 `UserProfileSnapshot` 有无 blessings；campaign/adventure 有无 favor；`blessings.json` 缺失确认。
- **测试**：调查报告归档。
- **验证**：`jq UserProfileSnapshot` + campaign 数据。
- **commit**：`docs(data): 11.1 blessings 数据源调查`。

### 11.2（数据源确认）patron-perks effect 结构 [x]

> 报告：`m3-data-source-confirmations.md` §11.2。effect_string + per_level + $replace；全局 DPS 直接进 globalDpsMultiplier pool，tag 限定 effect_def 引用按需扩展。
- **改动**：确认 patron-perks 的 effect 结构（perk 怎么给 DPS 加成？看 `patron-perks.json` 的 effect 字段）。
- **测试**：结构确认报告。
- **验证**：`jq patron-perks` 确认 effect。
- **commit**：`docs(data): 11.2 patron-perks effect 结构确认`。

### 11.3 扩 kind + 解析 [x]

> 实现：`HeroAbilityKind` 加 `patronPerkMult`（dimension `global-buff`、scope `global`）；`scripts/data/patron-perk-signals.ts` 解析 `global_dps_multiplier_mult,$replace` → per-patron `patronPerkMult` signals（value=perLevel×maxLevels）；build-models 产 `public/data/v1/global-buffs.json`。MVP 范围：无条件全局 DPS（13 perks）；area_tags / effect_def tag 限定版留后续。
- **改动**：`HeroAbilityKind` 加 `blessingMult`/`patronPerkMult`；dimension `global-buff`；解析 patron-perks（+ blessings 若 11.1 可行）。
- **测试（先写）**：解析正确。
- **验证**：`npm run test:run`；coverage 显示 global-buff。
- **commit**：`feat(data): 11.3 解析 patron-perks/blessings effect`。

### 11.4 全局 pool 进 DPS [x]

> 实现：`ScoringInput` 加 `globalBuffMultiplier`，`carryDps = baseDps × levelCurve × damagePool × crit × vuln × globalBuff`；`PlannerRecommendationOptions` 透传。调用方按玩家选择 patron 从 `global-buffs.json` 经 `computeGlobalBuffMultiplier` 解析后传入（UI patron 选择在阶段 15）。
- **改动**：`final_dps × global_buff_pool`；接入 pool 链。
- **测试**：含全局加成的 carryDps > 不含。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 11.4 全局 pool 进 DPS`。
- **条件**：若 11.1 确认 blessings 不可做，只做 patron-perks。

---

# 阶段 12：restrictions 文本解析（手工模板·批判③）

**目标**：restrictions 文本规则结构化（mechanics 之外的补充）。
**风险**：中英自由文本 NLP 不可靠（批判③），用关键词模板。

### 12.1 评估高频模式 [x]

> 报告：`m3-data-source-confirmations.md` §12.1。结论：restrictions 高度离散，可模板化的高频模式仅 slot-occupying（5 条 EN + ZH 对应）；champion-tag 已被 mechanics 覆盖；flavor 文本不解析。
- **改动**：jq 统计 restrictions 文本高频模式（escort/cursed/banned/occupied/stunned 等）。
- **测试**：统计报告归档。
- **验证**：jq 统计完成。
- **commit**：`docs(data): 12.1 restrictions 高频模式评估`。

### 12.2 模板匹配解析器（不 NLP）
- **改动**：新建 `scripts/data/restrictions-parser.ts`：高频关键词模板匹配（中英）→ forced/banned/locked；**不用 NLP**。
- **测试（先写）**：高频模式（如"四格被小鸡占据"→ lockedSlots 4）匹配正确；无法匹配的进 warning。
- **验证**：`npm run test:run`。
- **commit**：`feat(data): 12.2 restrictions 模板匹配解析器`。

### 12.3 高频变体校验 + 手工补 [x]

> 全量校验（1405 variant）：62 slot-occupying 模板匹配 + 3 手工补 override（具名列表 / "of the" 间隔）= 65 scenario 产 `occupiedSlotCount`；其余 flavor 文本进 warning。`RESTRICTION_OVERRIDES` 提供手工补机制（`restrictions-parser.ts`）。wired 进 `buildOfficialScenarioModel` → `scenario.occupiedSlotCount` + 具体 warning 替代原「自由文本未解析」。
- **改动**：高频变体 rules 手工校验；低频的记录但手工补到 `semantic-overrides.json`。
- **测试**：校验通过。
- **验证**：`npm run test:run`。
- **commit**：`feat(data): 12.3 restrictions 校验与手工补`。

---

# 阶段 13：装备/feat/传奇精细乘数（批判①）

**目标**：用真实装备替换 hypotheticalBaseline 近似。
**风险**：equipment 曲线数据源未确认（批判①）。

> **基线澄清（第三轮审计 2026-07-21）**：`loot`/`legendary`/`feat` 三类效果**已在 M1 进入理论最大基线**——`collectEffectEntries` 遍历 `detail.loot`/`detail.legendaryEffects`/`detail.feats`，所有 global/hero_dps 加成已进 `hero-abilities.json`（feat 由 commit 4bca0459 补齐）。本阶段 13 不是"让 feat 进基线"，而是**按玩家实际拥有的装备/选择的 feat/传奇等级精算**（替换"全 loot/全 feat/全 legendary 都生效"的理论近似）。即 M1 = 理论上界，阶段 13 = 按存档裁剪到真实值。

### 13.1（数据源确认）equipment 曲线 [x]

> 报告：`m3-data-source-confirmations.md` §13.1。结论：无独立 ilvl 曲线，效果按 (hero,slot,rarity) 直接编码在 loot_defines；M1 全 rarity 累加 = 理论上界高估；13 精细化 = 按 owned rarity 选取。
- **改动**：确认 ilvl/rarity 乘数曲线数据源（loot 数据？game-rules？effect-reference？）。
- **测试**：确认报告。
- **验证**：jq loot/game-rules 找曲线。
- **commit**：`docs(data): 13.1 equipment 曲线数据源确认`。

### 13.2 提取真实 equipment/feat/legendary/specialization/form [x]

> 实现：normalize 新增 `loot-catalog.json`（从 raw loot_defines 保留 slot_id，3968 条），供按 owned rarity 选取装备效果（补 champion-details.loot slot_id 丢失缺口）。owned 装备数据已在 `UserProfileSnapshot.ownedHeroes[].lootBySlot`（slotId→rarity/gild/enchant）。
> **已知缺口（第八轮审计，需更深管线工作，本轮记留）**：① spec 裁剪——specialization 用 `required_upgrade_id:9999` sentinel + name 模式（"Spec N"），无干净 spec tag，需 upgrade DAG 分析；② `permanent_effects` 形态 effects（73 hero，如 Nahara `form_of_dread`）——collectRawEffectEntries 不收 properties，需 normalize 补 + 按激活形态裁剪；③ feat/legendary 按 `activeFeats`/`legendaryBySlot.level` 裁剪。三者均需 upgrade/properties 层工作，风险高，本轮聚焦 equipment multiplier 主干。
- **改动**：从 `UserProfileSnapshot.ownedChampions` 提取 equipment（slot/rarity/ilvl）/feats/legendaryLevels；**按 `UserProfileSnapshot.specializations[heroId]` 裁剪专精**（第八轮审计：M1 理论基线把所有 spec upgrade 都算入，实际只生效玩家选的一个 spec；只保留该 spec 的 upgrade effects，其余 spec 降级）；**纳入 `champion-details.properties.permanent_effects` 的形态 effects**（第八轮审计：73 hero 含 `<形态>_effets`，如 Nahara `form_of_dread_effets` / Egbert `la_vache_mauve_effets` 的 `hero_dps_multiplier_mult,1000`，选形态后生效；当前 `collectRawEffectEntries` 不收 properties → 形态 buff 缺失），按玩家激活形态裁剪纳入。
- **测试（先写）**：提取字段完整；选 spec A 时只保留 spec A 的 upgrade effects。
- **验证**：`npm run test:run`。
- **commit**：`feat(data): 13.2 提取真实装备数据 + 专精裁剪`。

### 13.3 装备/feat/传奇 multiplier 计算 [x]

> 实现：`src/domain/simulator/equipmentMult.ts`——`computeEquipmentMult`（owned rarity 选取，`1+Σ(DPS effect)/100`）+ `computeTheoreticalLootMult`（M1 全 rarity 累加）+ `computeEquipmentAdjustment`（owned/theoretical 比）。MVP 只算 DPS 类 effect（`global_dps_multiplier_mult`）；非 DPS（cooldown/buff_upgrade）与 gild/enchant（无曲线）留缺口。9 测试。
- **改动**：新建 `src/domain/simulator/equipmentMult.ts`：equipment/feat/legendary multiplier（按 13.1 曲线）。
- **测试（先写）**：multiplier 计算正确（高 ilvl > 低 ilvl）。
- **验证**：`npm run test:run`。
- **commit**：`feat(simulator): 13.3 装备/feat/传奇 multiplier 计算`。

### 13.4 装备乘数接入 carryDps [x]

> 实现：`ScoringInput.equipmentAdjustmentByHero`（carryId→调整比），`carryDps × equipmentAdjustment`。采用非侵入调整比（`ownedEquipMult / theoreticalLootMult`）缩放 M1 理论基线到玩家实际装备，避免重构 damage pool。测试：调整比 0.5 → carryDps 减半。调用方从 loot-catalog.json + owned loot 解析（UI 阶段 15）。
- **改动**：`carryDps = baseDamage × levelCurve × equipment_mult × feat_mult × legendary_mult × pool`；替换 hypotheticalBaseline 近似。
- **测试**：真实装备的 carryDps ≠ 中位近似。
- **验证**：`npm run test:run` + 对照真实游戏（用户配合）。
- **commit**：`feat(planner): 13.4 装备乘数接入 carryDps`。

---

# 阶段 14：click 辅助 + modron + ult buff（click 不纳入计算·用户明确）

**目标**：click damage 作辅助参考值展示；modron 辅助信息；ult/主动技能 buff（ability_defines）按 modron uptime 折算进 pool。
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

### 14.4 ult/主动技能 buff（ability_defines）提取 + uptime 折算 [部分]

> **uptime 核心已实现**：`src/domain/simulator/ultUptime.ts`（`computeUltUptime` duration/base_cooldown modron 折算 + `foldUltBuffValue`，7 测试）。
> **pipeline 集成待执行**（方案见 `m3-data-source-confirmations.md` §14.4）：normalize 提取 ability_defines[id]→champion-details.ability + collectRawEffectEntries 第五源 'ability' + build 层 uptime 折算进 pool + modron gating。三层数据流改动风险高，本轮聚焦 uptime 核心，pipeline 集成留后续。
> **数据源已确认**：ability_defines 10 条，id===hero_id 对齐，effect 双形态（裸 string / JSON 串），DPS 信号经 effect_def 展开。

**背景**：第五轮数据流审计（2026-07-21）发现 `ability_defines`（10 英雄 ult/主动技能，id===hero_id）含 carryDps signal（Commander `global_dps_multiplier_mult,100` 全队 DPS x2、Pact Weapon `hero_dps_multiplier_mult,100`、Cunning Action `attack_speed_mult,100`、Channel Divinity `buff_upgrades` 等），但 normalize 层未提取到 champion-details，消费层无数据。raw 无字段引用 ability_defines，关联纯靠 id 对齐。详见 `docs/research/data/official-data-normalization-audit.md`「ability_defines」。

- **改动**：
  - normalize 层按 id 对齐 hero 提取 `ability_defines` 到 `champion-details.<id>.ability`（含 effect/base_cooldown/duration）。
  - `collectRawEffectEntries` 新增第五源（sourceBucket='ability'）收集 `detail.ability.effects`。
  - 按 modron 自动施放节奏折算 uptime：`uptime = duration / base_cooldown`（modron 满级自动施放）；ult buff 有效值 = `value × uptime`，进对应 pool（global_dps→globalDpsMultiplier、hero_dps→heroDpsMultiplier、attack_speed→阶段 7 speed pool）。
  - 无 modron 或未满级时降级（ult 不自动施放 → uptime=0，ult buff 不进 pool，保守不计）。
- **测试（先写）**：ability_defines 按 id 提取到 champion-details；ult buff 按 uptime 折算；modron 满级 vs 未满级差异；Commander 全队 DPS 加成正确。
- **验证**：`npm run test:run`；`data:signal-coverage` 显示 ability 源 signal；Bruenor/Makos/Tyril/Jarlaxle 等 carryDps 含 ult buff。
- **commit**：`feat(data): 14.4 ability_defines ult buff 提取 + modron uptime 折算`。
