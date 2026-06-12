# 官方基座数据归一化审计

- 日期：2026-06-09
- 目标：回答当前 `data:official` 流水线是否已经把官方基座数据完整归一化保存，以及是否存在“未涉及就不归一化”的问题。

## 结论

1. 当前官方 definitions 接口返回格式仍与现有脚本匹配，没有出现“接口一变，流水线立刻吃不下”的问题。
2. 但官方基座数据并没有被“完整归一化保存”。
3. 现在实际存在 4 层状态：
   - 已提升为共享归一化集合；
   - 已提升为详情结构化字段；
   - 只作为 `properties` / `raw.*` 明细保存，尚未提升成共享契约；
   - 完全未进入当前产物。
4. 所以“`不涉及，就不归一化`”这个担心是成立的，但要分层说：
   - 对“官方原始明细是否完全丢了”这个问题，不成立。很多英雄相关原始数据已经保存在 `champion-details/<id>.json`。
   - 对“是否所有官方稳定事实都被提升成公共可复用契约”这个问题，成立。当前共享层明显偏薄。

## 2026-06-04 第一批补齐

本次审计后的第一批提升已经落地到共享层：

- `champions.json` 新增 `patronEligibility`
- 新增 `adventures.json`
- 新增 `patrons.json`
- `variants.json` 新增 `ruleContextId`、`scenarioKind`、`repeatable`、`patronObjectiveTiers`、`modeTags`
- `enums.json` 新增 `patrons`、`modes`

这意味着“基础 Patron 资格”和“基础场景身份 / 模式标签”已经不再只停留在 detail / raw 层。
但这仍然只是第一批，尚未覆盖全部可复用规则事实。

## 2026-06-09 第二批补齐

继续沿着“共享规则事实提升”这条线，本次又新增了第二批公共集合：

- 新增 `game-rules.json`
- 新增 `patron-perks.json`
- 新增 `trials.json`

其中：

- `game-rules.json` 归一化保存官方 `game_rule_defines`
- `patron-perks.json` 归一化保存 `patron_perk_tier_defines` 与 `patron_perk_defines`
- `trials.json` 归一化保存 `trials_role_defines` 与 `trials_difficulty_defines`

这意味着后续阵型模拟、Patron Perk 语义解释、Trials 规则接入，已经不需要再回到原始 definitions 整包里找这些稳定事实。

## 2026-06-09 第三批补齐

同一天继续沿着“共享规则 / 效果参考字典提升”这条线，又新增了一层公共参考集合：

- 新增 `effect-reference.json`

其中：

- `effect-reference.json` 归一化保存 `stat_defines`
- `effect-reference.json` 归一化保存 `buff_defines`
- `effect-reference.json` 归一化保存 `effect_key_defines`

这意味着和数值条件、buff 字典、effect key 描述直接相关的稳定官方事实，已经不再散落在 definitions 原包里，也不需要后续流程各自重复抽取。

## 本次核对方式

本次没有只看仓库静态代码，而是重新拉了实时官方数据并现场过了一次 normalize：

```bash
node scripts/fetch-idle-champions-definitions.mjs \
  --outDir tmp/idle-champions-audit-live \
  --languageId 1 \
  --fileLabel audit-source

node scripts/fetch-idle-champions-definitions.mjs \
  --outDir tmp/idle-champions-audit-live \
  --languageId 7 \
  --fileLabel audit-zh

node scripts/normalize-idle-champions-definitions.mjs \
  --input tmp/idle-champions-audit-live/definitions-...-audit-source.json \
  --localizedInput tmp/idle-champions-audit-live/definitions-...-audit-zh.json \
  --outputDir tmp/idle-champions-audit-normalized \
  --versionFile tmp/idle-champions-audit-normalized/version.json
```

实时拉取结果：

- source play server：`https://ps29.idlechampions.com/~idledragons/`
- zh play server：`https://ps27.idlechampions.com/~idledragons/`
- 顶层返回包含 `51` 组 `_defines` 表，以及 `current_time`、`checksum`、`apc_stats`、`db_stats` 等元信息。
- 现场 normalize 成功，生成：
  - `champions=163`
  - `championVisuals=163`
  - `championDetails=163`
  - `adventures=516`
  - `patrons=5`
  - `variants=1393`
  - `formations=159`
  - `enums=5`

这说明当前脚本与官方接口的顶层格式仍然匹配。

另一个独立事实是：这次归一化已经直接把仓库内 `public/data/version.json` 刷到了 `2026-06-09`，并新增了第二、三批共享集合。

所以眼下更明显的问题不再是“仓库快照滞后”，而是“归一化覆盖面仍然有限”，不是“实时官方接口已经换格式导致脚本失效”。

## 当前已经归一化保存到哪里

### 1. 共享集合层

`data:official` 当前会产出这些公共集合：

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
- `public/data/v1/planner-heroes.json`
- `public/data/v1/planner-scenarios.json`
- `public/data/v1/planner-semantic-overrides.json`

### 2. 顶层共享英雄合同目前很薄

`champions.json` 的单个英雄目前至少有：

- `id`
- `name`
- `seat`
- `roles`
- `affiliations`
- `tags`
- `patronEligibility`
- `portrait`

这已经足够支持基础 roster / seat / role / tag 查询，以及基线 Patron 资格过滤；但对更高阶的模式例外、英雄特许规则和跨场景规则复用来说仍然偏薄。

### 3. 英雄详情层保存得更厚

`champion-details/<id>.json` 目前已经结构化保存：

- `summary`
- `availability`
- `characterSheet`
- `attacks`
- `upgrades`
- `feats`
- `skins`
- `loot`
- `legendaryEffects`
- `properties`
- `adventureIds`
- `defaultFeatSlotUnlocks`
- `costCurves`
- `healthCurves`

同时还保留原始快照片段：

- `raw.hero`
- `raw.attacks`
- `raw.upgrades`
- `raw.feats`
- `raw.skins`
- `raw.loot`
- `raw.legendaryEffects`

这意味着很多当前页面或 planner 还没消费到的英雄事实，并没有丢，只是停留在 detail / raw 层，没有继续提升成更稳定、更薄的共享合同。

## 当前官方 definitions 的消费覆盖面

本次基于实时拉取的 definitions 顶层键做了脚本扫描。当前 `data:official` 整体链路里，真正直接引用到的官方表已有 `26` 项（含 `current_time`）：

- `adventure_defines`
- `affiliation_defines`
- `attack_defines`
- `campaign_defines`
- `current_time`
- `effect_defines`
- `effect_key_defines`
- `familiar_defines`
- `graphic_defines`
- `hero_defines`
- `hero_feat_defines`
- `hero_skin_defines`
- `legendary_effect_defines`
- `loot_defines`
- `monster_defines`
- `patron_defines`
- `patron_perk_defines`
- `patron_perk_tier_defines`
- `patron_shop_item_defines`
- `premium_item_defines`
- `stat_defines`
- `buff_defines`
- `game_rule_defines`
- `trials_difficulty_defines`
- `trials_role_defines`
- `upgrade_defines`

其中可以再分成两类：

- 进入核心归一化集合的主线表：
  `hero_defines`、`attack_defines`、`upgrade_defines`、`effect_defines`、`hero_feat_defines`、`hero_skin_defines`、`loot_defines`、`legendary_effect_defines`、`adventure_defines`、`campaign_defines`、`affiliation_defines`、`monster_defines`
- 主要给资源和宠物链路使用的表：
  `graphic_defines`、`familiar_defines`、`premium_item_defines`、`patron_defines`、`patron_shop_item_defines`
- 已提升为共享规则层的新表：
  `game_rule_defines`、`patron_perk_defines`、`patron_perk_tier_defines`、`trials_role_defines`、`trials_difficulty_defines`
- 已提升为共享效果参考层的新表：
  `stat_defines`、`buff_defines`、`effect_key_defines`

## 还没有被归一化保存的官方基座数据

实时 definitions 顶层共有 `51` 组 `_defines`。按当前脚本扫描，仍有 `26` 组完全没有进入现行 `data:official` 产物链路：

- `ability_defines`
- `achievement_defines`
- `card_sleeve_defines`
- `changelog_defines`
- `chest_type_defines`
- `click_skin_defines`
- `collection_quest_defines`
- `collection_quest_set_defines`
- `corrupted_gem_shop_item_defines`
- `external_achievement_defines`
- `familiar_skin_defines`
- `language_defines`
- `mastery_shop_item_defines`
- `modron_core_defines`
- `modron_tile_defines`
- `music_album_defines`
- `music_track_defines`
- `news_defines`
- `pigment_effect_defines`
- `shop_category_defines`
- `shop_display_defines`
- `social_link_defines`
- `sound_defines`
- `text_defines`
- `tutorial_state_defines`
- `twitch_benefit_defines`

这里面有一部分现在确实不该优先做，比如 `music_*`、`sound_defines`、`social_link_defines`。而和阵型计算最直接相关的那批顶层稳定字典，这次已经基本补上了。

所以现在更准确的说法是：`未消费顶层表` 仍然不少，但下一步的主战场，已经不再是这三张顶层效果字典，而是“已消费但尚未共享提升”的 effect / detail 事实。

## “未涉及就不归一化”具体体现在哪里

### 1. 共享事实层仍然没有完整承接稳定事实

当前文档和代码里已经明确暴露出几类缺口：

- `modeEligibilityTags`
- 更细的英雄限制 / 规则键映射
- 可复用的 effect definition / effect formula 合同
- planner 可直接消费的稳定限制投影

其中一部分第一到第三批已经补上，例如：

- `patronEligibility`
- `patrons`
- `modes`
- 稳定 `ruleContextId`
- `game-rules.json`
- `effect-reference.json`
- `patron-perks.json`
- `trials.json`

但这仍不等于“共享事实层已经够厚”。真正靠近阵型计算核心的 effect definitions、本体升级效果投影、以及 planner 直接消费的稳定条件投影，今天还没有被统一提升出来。

### 2. 详情层存在“保存了，但没抽象成共享事实”的情况

例如英雄本体的很多系统字段今天仍停留在：

- `properties`
- `raw.hero`
- `raw.upgrades`

它们能给详情页或后续研究提供依据，但不能直接作为轻量稳定合同复用。

### 3. 动态语义不能硬塞成静态归一化事实

不是所有缺口都该补成静态字段。

例如 `EligibleForPatron(aeon_current_patron_id)` 这种表达式，依赖当前 Patron 上下文；它不只是“官方漏归一化”，而是本身就需要运行时场景输入。这个应该留在 planner 场景模型或规则上下文层，不应该硬编码成英雄静态事实。

## 对自动化阵型模拟的实际影响

如果继续只在“某个表达式缺了就临时补一点”的模式下推进，会有两个问题：

1. 解析器会越来越懂局部表达式，但共享事实层仍然稀薄，导致每次扩展都要回到明细 JSON 或原始语义。
2. 稳态模拟、候选筛选、Patron / 模式限制、场景规则判断，会长期缺少一个统一、薄、稳定的事实输入层。

所以对自动化阵型模拟更有价值的下一步，不是继续盲目扩表达式，而是先把“稳定、可复用、非运行时”的规则事实提升出来。

## 建议的下一步

优先级建议如下：

1. 继续提升“稳定、可复用、非运行时”的规则事实，但下一刀不再是补顶层 stat / buff / effect-key 字典，而是补更贴近 effect 实体与 planner 输入层的共享合同。
2. 当前更值得继续审计和提升的方向：
   - 从已消费的 `effect_defines` 提升一层薄共享 effect 合同
   - 从 `champion-details/<id>.json` / `raw.upgrades` 提升 planner 会反复用到的稳定条件投影
   - 继续补 `modeEligibilityTags` 这类静态限制事实
3. 继续把信息分成两类：
   - 静态稳定事实：归一化进共享数据
   - 运行时上下文事实：放进 planner scenario / evaluation context
4. 如果某条信息已经稳定存在于 `champion-details/<id>.json` 或原始 definitions 中，就优先考虑“提升成薄共享合同”，而不是继续把解析复杂度压进 planner parser。
