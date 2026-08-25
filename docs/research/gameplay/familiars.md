# 魔宠（Familiars）

**数据快照**：2026-08-08（pets.json 345 只魔宠 / 数据版本 2026-08-06）
**可信度**：⚠️ 待确认 — 魔宠列表与获取方式由 `pets.json` 直接可证（345 只、11 宝石可购、5 位赞助者可购）；点击速率、槽位行为等运行时机制仅来自社区，游戏数据无法验证

**社区来源**：
- [Fandom Wiki — Familiars](https://idlechampions.fandom.com/wiki/Familiars)
- [Reddit — Have I been using familiars wrong?](https://www.reddit.com/r/idlechampions/comments/1hf5gy3/have_i_been_using_familiars_wrong)
- [Reddit — Saving Gems for Familiars: Is it worth it?](https://www.reddit.com/r/idlechampions/comments/9ntn8m/saving_gems_for_familiars_is_it_worth_it)

## 机制

魔宠是可分配到战场不同位置的小型生物，用于自动化手动操作。在任意战役到达区域 66 后解锁。

### 分配槽位与行为

| 槽位 | 上限 | 速率（游戏内秒） | 行为 |
|---|---|---|---|
| 点击怪物 | 6 | 5 次/秒 | 持续点击最前方敌人，造成点击伤害 |
| 升级英雄 | 每英雄 1 只 | 1 次/秒 | 自动升级英雄；设为「购买升级」模式时只买得起的升级 |
| 随机杀招 | 4 | 1 次/30 秒 | 随机点击杀招栏 |
| 指定杀招 | 每杀招 1 只 | 1 次/秒 | 自动激活特定杀招 |
| 自动推进开关 | 1 | 1 次/秒 | 队伍团灭后重新进入当前区域 |
| 药水管理 | 每种类/稀有度 1 只 | 药水到期时 1 次 | 自动续杯（每次消耗 1 瓶） |

> **速率注**：上表的「秒」是游戏内秒，使用加速药水或速度技能时实际点击频率等比增加。

### 点击怪物槽位的阶梯效果

场上点击槽的魔宠数量决定额外自动化行为：

| 数量 | 额外效果 |
|---|---|
| ≥1 | 自动造成点击伤害（无需手动点击） |
| ≥3 | 自动拾取金币、任务物品、活动物品和宝石袋内容物 |
| ≥5 | 自动打开 boss 掉落的宝石袋 |
| 6 | 自动点击屏幕上的分心物（distractions），获得额外金币 |

对于分段敌人和护甲敌人，场上魔宠大约每 5 秒打掉 1 段；护甲敌人只在点击伤害高于其生命值时才生效。

### 背景队伍

背景队伍只需 1 只魔宠点击场上即可运转，多放不会提速。

### 获取方式

| 方式 | 数量 | 说明 |
|---|---|---|
| 宝石购买 | 11 | 价格 250 – 250,000 宝石（法师之手最便宜） |
| 赞助者商店 | 5 | 需要对应赞助者影响力和货币（如艾尔明斯特 5×10^4 印记） |
| 付费/主题包 | 317 | 主题包、创始人包、魔宠包、限时 Wild Offers（$4.99 – $24.99） |
| 赛季奖励 | 含于上述 | 部分赛季通行证特定等级赠送 |
| 活动/促销 | 含于上述 | 平台限免、ICP 奖励等 |

### 社区经验：数量优先级

社区共识的魔宠配置优先级（从少到多）：

1. 1 只放场上 → 自动点击
2. 1 只升级点击伤害 → 解放手动升级
3. 补到 5 只场上 → 自动开宝石袋（宝石刷场最关键）
4. 6 只场上 + 1 只点击伤害 → 最大化场上自动化
5. 逐个放到英雄身上 → 自动升级
6. 放杀招栏、自动推进、药水管理 → 全面挂机

约 18 只可实现基本无人值守；27 只（6 场上 + 10 英雄 + 10 杀招 + 1 自动推进）为高自动化配置。

## 数据源

| 文件 | 字段 | 说明 |
|---|---|---|
| `public/data/v1/pets.json` | `items[].acquisition.kind` | 获取类型：`gems` / `premium` / `patron` / `not-yet-available` |
| 同上 | `items[].acquisition.gemCost` | 宝石价格（仅 `kind=gems` 有值） |
| 同上 | `items[].acquisition.patronName` / `patronCost` / `patronCurrency` | 赞助者购买信息 |
| `public/data/v1/game-rules.json` | `click_damage_settings` | 点击伤害基础参数：`base_power:1, power_curve:2.031` |
| 同上 | `bg_familiar_rate_multipliers` | 背景队伍魔宠倍率（当前快照仅 `seat:5`） |
| 同上 | `auto_progress_familiar_slot` | 自动推进槽位开关：`global:true` |
| `src/domain/user-profile/types.ts` | `familiars: Record<string,string>` | 用户存档中已拥有的魔宠 ID 映射 |
| `src/domain/simulator/clickDamage.ts` | `computeClickDamage()` | 点击伤害 = BUD × click_seconds（项目 MVP 近似） |

> **缺口**：点击速率（5 次/秒等）、阶梯效果触发数（3/5/6）、杀招/药水速率等运行时常量不在公开游戏数据中，仅社区记载。

## 社区来源

- [Fandom Wiki — Familiars](https://idlechampions.fandom.com/wiki/Familiars)
- [Reddit — Have I been using familiars wrong?](https://www.reddit.com/r/idlechampions/comments/1hf5gy3/have_i_been_using_familiars_wrong)
- [Reddit — Saving Gems for Familiars: Is it worth it?](https://www.reddit.com/r/idlechampions/comments/9ntn8m/saving_gems_for_familiars_is_it_worth_it)
- [Reddit — Automatically populate familiars on new adventure?](https://www.reddit.com/r/idlechampions/comments/1ickb8s/automatically_populate_familiars_on_new_adventure)
- [Reddit — Help with gem farming strategy](https://www.reddit.com/r/idlechampions/comments/1ccnpoi/help_with_gem_farming_strategy)
