# 官方基座数据归一化审计

- 目标：回答当前 `data:official` 流水线是否把官方基座数据完整归一化保存，以及是否存在“未涉及就不归一化”的问题。

## 结论

1. 当前官方 definitions 接口返回格式仍与现有脚本匹配，没有出现“接口一变，流水线立刻吃不下”的问题。
2. 但官方基座数据并没有被“完整归一化保存”。
3. 现在实际存在 4 层状态：已提升为共享归一化集合；已提升为详情结构化字段；只作为 `properties` / `raw.*` 明细保存；完全未进入当前产物。
4. “不涉及，就不归一化”这个担心分层成立：对“官方原始明细是否完全丢了”，不成立（很多已保存在 `champion-details/<id>.json`）；对“是否所有官方稳定事实都被提升成公共可复用契约”，成立（当前共享层明显偏薄）。

## 核对方式

重新拉实时官方数据现场过一次 normalize（英文 `language_id=1` + 中文 `language_id=7`），确认当前脚本与官方接口顶层格式仍匹配：

```bash
node scripts/fetch-idle-champions-definitions.ts --outDir tmp/idle-champions-audit-live --languageId 1 --fileLabel audit-source
node scripts/fetch-idle-champions-definitions.ts --outDir tmp/idle-champions-audit-live --languageId 7 --fileLabel audit-zh
node scripts/normalize-idle-champions-definitions.ts \
  --input tmp/idle-champions-audit-live/definitions-...-audit-source.json \
  --localizedInput tmp/idle-champions-audit-live/definitions-...-audit-zh.json \
  --outputDir tmp/idle-champions-audit-normalized \
  --versionFile tmp/idle-champions-audit-normalized/version.json
```

现场 normalize 成功生成 `champions=164 / championVisuals=164 / championDetails=164 / adventures=521 / patrons=5 / variants=1405 / formations=160 / enums=5`。顶层返回包含 `51` 组 `_defines` 表。眼下更明显的问题不是“仓库快照滞后”或“接口换格式导致脚本失效”，而是“归一化覆盖面仍然有限”。

## 当前归一化保存到哪里

### 共享集合层

`data:official` 当前产出这些公共集合：

- `public/data/v1/champions.json`
- `public/data/v1/champion-details/<id>.json`
- `public/data/v1/champion-visuals.json`
- `public/data/v1/adventures.json`
- `public/data/v1/variants.json`
- `public/data/v1/game-rules.json`
- `public/data/v1/effect-reference.json`
- `public/data/v1/patron-perks.json`
- `public/data/v1/trials.json`
- `public/data/v1/formations.json`
- `public/data/v1/enums.json`
- `public/data/v1/patrons.json`
- `public/data/v1/pets.json`
- `public/data/v1/hero-abilities.json`
- `public/data/v1/scenarios.json`
- `public/data/v1/semantic-overrides.json`

### 顶层共享英雄合同偏薄

`champions.json` 单个英雄当前至少有 `id / name / seat / roles / affiliations / tags / patronEligibility / portrait`，足够基础 roster / seat / role / tag 查询与基线 Patron 资格过滤；但对高阶模式例外、英雄特许规则和跨场景规则复用仍偏薄。

### 英雄详情层保存较厚

`champion-details/<id>.json` 已结构化保存（非完整列表）：`summary / availability / characterSheet / attacks / upgrades / feats / skins / loot / legendaryEffects / properties / adventureIds / defaultFeatSlotUnlocks / costCurves / healthCurves / englishName / eventName / dateAvailable / lastReworkDate / popularity / baseCost / baseDamage / baseHealth / graphicId / portraitGraphicId / updatedAt`，并保留原始快照片段 `raw.hero / raw.attacks / raw.upgrades / raw.feats / raw.skins / raw.loot / raw.legendaryEffects`。

很多当前页面或 planner 还没消费到的英雄事实没有丢，只是停留在 detail / raw 层，未提升成更稳定、更薄的共享合同。

## 官方 definitions 的消费覆盖面

当前 `data:official` 整体链路直接引用到的官方表已有 `26` 项（含 `current_time`）：

- 进入核心归一化集合的主线表：`hero_defines / attack_defines / upgrade_defines / effect_defines / hero_feat_defines / hero_skin_defines / loot_defines / legendary_effect_defines / adventure_defines / campaign_defines / affiliation_defines / monster_defines`
- 主要给资源和宠物链路使用：`graphic_defines / familiar_defines / premium_item_defines / patron_defines / patron_shop_item_defines`
- 已提升为共享规则层：`game_rule_defines / patron_perk_defines / patron_perk_tier_defines / trials_role_defines / trials_difficulty_defines`
- 已提升为共享效果参考层：`stat_defines / buff_defines / effect_key_defines`

## 还没归一化保存的官方基座数据

实时 definitions 顶层共 `51` 组 `_defines`，仍有 `26` 组完全未进入 `data:official` 产物链路：

`ability_defines / achievement_defines / card_sleeve_defines / changelog_defines / chest_type_defines / click_skin_defines / collection_quest_defines / collection_quest_set_defines / corrupted_gem_shop_item_defines / external_achievement_defines / familiar_skin_defines / language_defines / mastery_shop_item_defines / modron_core_defines / modron_tile_defines / music_album_defines / music_track_defines / news_defines / pigment_effect_defines / shop_category_defines / shop_display_defines / social_link_defines / sound_defines / text_defines / tutorial_state_defines / twitch_benefit_defines`

其中 `music_*` / `sound_defines` / `social_link_defines` 等当前不该优先做。

其余和阵型计算相关的顶层稳定字典已基本补上。下一步主战场不再是顶层效果字典，而是"已消费但尚未共享提升"的 effect / detail 事实。

## “未涉及就不归一化”体现在哪里

### 共享事实层未完整承接稳定事实

已暴露的缺口：`modeEligibilityTags`、更细的英雄限制 / 规则键映射、可复用的 effect definition / effect formula 合同、planner 可直接消费的稳定限制投影。

已提升的稳定事实包括 `patronEligibility / patrons / modes / 稳定 ruleContextId / game-rules.json / effect-reference.json / patron-perks.json / trials.json`，但不等于“共享事实层够厚”。靠近阵型计算核心的 effect definitions、本体升级效果投影、planner 直接消费的稳定条件投影，尚未统一提升。

### 详情层“保存了但没抽象成共享事实”

英雄本体很多系统字段仍停留在 `properties / raw.hero / raw.upgrades`，能给详情页或研究提供依据，但不能直接作为轻量稳定合同复用。

### 动态语义不能硬塞成静态归一化事实

`EligibleForPatron(aeon_current_patron_id)` 这类表达式依赖当前 Patron 上下文，不只是“官方漏归一化”，而是本身需要运行时场景输入。应留在 planner 场景模型或规则上下文层，不硬编码成英雄静态事实。

## 对自动化阵型模拟的实际影响

如果继续只在“某个表达式缺了就临时补一点”的模式下推进：解析器会越来越懂局部表达式，但共享事实层仍稀薄，每次扩展都要回到明细 JSON 或原始语义；稳态模拟、候选筛选、Patron / 模式限制、场景规则判断会长期缺少统一、薄、稳定的事实输入层。更有价值的下一步不是继续盲目扩表达式，而是先把“稳定、可复用、非运行时”的规则事实提升出来。

## 建议的下一步

1. 继续提升“稳定、可复用、非运行时”的规则事实，下一步不再是补顶层 stat / buff / effect-key 字典，而是补更贴近 effect 实体与 planner 输入层的共享合同。
2. 当前更值得继续审计和提升的方向：从已消费的 `effect_defines` 提升一层薄共享 effect 合同；从 `champion-details/<id>.json` / `raw.upgrades` 提升 planner 反复用到的稳定条件投影；继续补 `modeEligibilityTags` 这类静态限制事实。
3. 信息分两类：静态稳定事实归一化进共享数据；运行时上下文事实放进 planner scenario / evaluation context。
4. 已稳定存在于 `champion-details/<id>.json` 或原始 definitions 的信息，优先“提升成薄共享合同”，而不是继续把解析复杂度压进 planner parser。
