# 成就与战役奖励（Achievements & Campaign Rewards）

**数据快照**：2026-08-08（165 英雄，adventures.json 2026-08-06，26 战役 / 523 冒险）
**可信度**：⚠️ 待确认 — 成就伤害加成的 1%/5% 规则和加法叠加来自社区多源交叉印证（Wiki + Reddit + Steam），但游戏数据不含成就定义表（服务端追踪），无法直接验证总加成数值；战役/冒险结构从 `adventures.json` 直接验证。

**社区来源**：
- [Fandom Wiki - Achievements](https://idlechampions.fandom.com/wiki/Achievements)
- [开发者 FAQ](https://www.codenameentertainment.com/?page=idle_champions&post_id=1518)
- [Reddit - 成就伤害加成讨论](https://www.reddit.com/r/idlechampions/comments/zfjws7/whats_the_current_achievement_bonus_damage_youre/)
- [Steam 讨论 - 成就数量与加成](https://steamcommunity.com/app/627690/discussions/0/5002914669823492057)

## 机制

### 成就伤害加成（全局）

每个成就完成后给予全队伤害加成，分为两档：

- **1% 加成**：大多数成就（招募英雄、获取装备、完成区域等）
- **5% 加成**：里程碑成就（如传奇锻造系列：12/60/240/600 件）

加成为**加法叠加**（非乘法），累计后乘到全队伤害。社区数据点：437/470 成就约得 15,400%，644/659 成就约得 252,000%。成就数量随版本更新持续增长（每 3 周左右新增内容）。

### 成就类型

| 类型 | 典型目标 | 示例 |
|------|---------|------|
| 英雄招募 | 通过冒险/事件/时空门解锁英雄 | Recruit Nahara |
| 装备收集 | 集齐某英雄 6 件装备 | Hero of the People（Sergeant Knox） |
| 区域完成 | 在特定冒险中达到指定区域 | What City is This?（Knox 冒险区域 250） |
| 英雄配合 | 特定英雄相邻通关 1000 区域 | Neverwinter Strong（Knox+Celeste+Makos） |
| 传奇锻造 | 用提亚马特鳞片锻造传奇装备 | Journeyman Forger（12 件） |
| 事件成就 | 每个限时事件独有，含英雄解锁/装备收集/Boss 击败 | 各事件区域 |
| 英雄专属成就 | 理解英雄阵型技能后可在任意时间完成 | 劳拉娜 15 项成就（魔冢长征） |

### 战役（Campaigns）

战役是一组讲述同一故事的关联冒险。游戏数据中有 **26 个战役**（含常驻战役 + 限时事件战役），主要常驻战役：

- **剑湾之旅**（id=1, 47 冒险）：基础战役，解锁核心英雄
- **湮灭之墓**（id=2, 16 冒险）
- **深水城：龙金之劫**（id=15, 19 冒险）
- **博德之门：坠入阿弗纳斯**（id=22, 20 冒险）
- **冰风谷：冰霜少女的白霜**（id=24, 20 冒险）
- 时空门（id=17, 143 冒险）：聚合各事件冒险的入口

每个战役的冒险分为**基础冒险**（解锁英雄/推进剧情）、**变体**（限制条件重玩）和**自由模式**（刷宝箱和恩宠）。

### 战役完成奖励

- **英雄解锁**：完成基础冒险首次解锁对应英雄（常驻战役解锁常驻英雄，事件解锁事件英雄）
- **宝箱**：冒险中击败 Boss 获得宝石，偶尔获得银/金宝箱
- **神圣恩宠**（Divine Favor）：冒险结束时金币转化为恩宠，仅在该战役内生效
- **事件专属**：事件结束后事件恩宠可转换为其他战役的永久恩宠

### 英雄专属成就触发

部分英雄有能力与成就统计直接挂钩：

- **Kent**（id=114）：专精「喧闹成就」将当前成就伤害加成转化为全队 DPS 加成（`stackFunc: achievement_global_dps`）
- **劳拉娜**（Laurana）：15 项专属成就分布在魔冢长征战役中，完成后增强能力（`laurana_achievement_handler`）
- **Grimm / Beadle**：搭档成就统计（`grimm_tag_team_max` / `beadle_tag_team_max`）
- **Van Richten**（id=177）：成就统计 `richten_always_among_monsters`
- **Rust**（id=94）：成就统计 `rust_whats_lost_is_found_again`

### 与 planner 的关系

成就全局伤害加成是**服务端外部乘数**，不在 `hero-abilities.json` 的可解析信号中建模：

- `adventures.json` 的 `rewards` 字段全部为空——奖励逻辑在服务端
- `effect-reference.json` 的 stats 数组中仅有 8 个成就相关状态变量（服务端追踪，其中 4 个 `serverOnly: true`）
- Kent 的 `achievement_global_dps` stackFunc 虽然在 `hero-abilities.json` 中有记录，但成就加成的实际数值不在游戏数据中，planner 无法建模
- 英雄专属成就触发（`achievement_stat_name`、`laurana_achievement_handler` 等）均为 unsupported signals，当前不进目标值

## 数据源

| 字段 | 文件 | 说明 |
|------|------|------|
| `campaign.id` / `campaign.original` / `campaign.display` | `adventures.json` | 战役标识与名称 |
| `scenarioKind` | `adventures.json` | 冒险类型（当前全部为 `adventure`） |
| `objectiveArea` | `adventures.json` | 目标区域编号（如 250/400/525） |
| stats `*_achievement` | `effect-reference.json` → `stats[]` | 成就状态变量（8 个） |
| `stackFunc: achievement_global_dps` | `hero-abilities.json` | Kent 专精引用成就加成 |
| `achievement_stat_name` | `champion-details/{id}.json` | 英雄能力关联的成就统计名 |

## 社区来源

- [Fandom Wiki - Achievements](https://idlechampions.fandom.com/wiki/Achievements) — 成就分类、奖励百分比、完整列表
- [开发者 FAQ](https://www.codenameentertainment.com/?page=idle_champions&post_id=1518) — 官方说明成就给予「compounding power bonus」
- [Reddit - 成就伤害加成讨论](https://www.reddit.com/r/idlechampions/comments/zfjws7/whats_the_current_achievement_bonus_damage_youre/) — 玩家分享 644/659 成就 = 252,000% 加成
- [Steam 讨论](https://steamcommunity.com/app/627690/discussions/0/5002914669823492057) — 437/470 成就 = 15,400%，确认每成就 1% 或 5%
- [Reddit - 通过冒险解锁英雄](https://www.reddit.com/r/idlechampions/comments/xlp7ek/champions_unlocked_by_adventure_not_time_gate/) — 冒险解锁英雄清单
- [Reddit - 战役解锁英雄](https://www.reddit.com/r/idlechampions/comments/g20d31/what_champions_can_be_earned_from_campaign/) — 常驻英雄与常驻战役关系
