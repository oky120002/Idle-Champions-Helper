# 赛季、试炼与时空门（Seasons, Trials & Time Gates）

**数据快照**：2026-08-08（trials.json 2026-08-06 更新，10 难度 × 5 地形）
**可信度**：✅ 已确认 — 试炼数据直接验证；赛季/时空门为社区来源但 Wiki + Reddit + 开发者帖交叉印证一致。赛季已停办（2024-02），时空门与试炼仍在运行。

**社区来源**：
- [Fandom Wiki - Seasons](https://idlechampions.fandom.com/wiki/Seasons)
- [Fandom Wiki - Time Gates](https://idlechampions.fandom.com/wiki/Time_Gates)
- [Fandom Wiki - Trials of Mount Tiamat](https://idlechampions.fandom.com/wiki/Trials_of_Mount_Tiamat)

## 机制

### 赛季（Seasons）— 已停办

赛季是持续约 10 周的限时活动（2022-09 至 2024-02，共 7 赛季）。每个赛季聚焦 5 名已有英雄，他们可能在赛季开始时获得平衡性调整。

- **任务体系**：每日、每周和赛季长线任务，完成后获得赛季经验（推进通行证等级）和赛季临时恩宠（赛季结束后可转换为所有已解锁战役的永久恩宠）。
- **通行证奖励**：免费线 + 付费赛季通行证线。主要奖励通常在 60 级，之后每级给 2 个奖励代币（Bonus Token），用于赛季英雄宝箱。
- **赛季货币**：第 1–3 赛季使用 Season Currency（在奖励商店消费）；第 4–7 赛季取消商店，改为赛季代币直接解锁等级奖励。
- **赛季英雄**：赛季聚焦的英雄本身不是新英雄，但赛季期间他们的时空门开启成本从 6 件降至 3 件。
- **额外任务**：赛季期间可触发赛季奖励任务（Season Bonus Quests），提供额外赛季经验以加速通行证或赚取更多代币。
- **停办原因**：CNE 团队规模不足以同时开发赛季和全面改造活动系统。2024-03 活动 2.0 上线后赛季暂停，至今未恢复。活动 2.0 的弹性槽位（Flex Slot）系统部分取代了赛季的"补完老英雄"职能。

### 试炼（Trials of Mount Tiamat）— 运行中

提亚马特山峰试炼是异步多人协作迷你战役（2021-09 上线），解锁前置为完成阿弗纳斯战役的"艾尔图尔最后之战"。

- **流程**：加入或创建试炼战役 → 派遣 1 名英雄加入 5 人突击队 → 为期 7 天，其余英雄每天完成日常区域任务以贡献 DPS 加成给突击队 → 击败提亚马特。
- **五个地形**（对应五场冒险，游戏数据 `trials.json` 已验证）：
  - 森林（Balance the Forest）、沼泽（Cut the Music）、山脉（Unannounced Visit）、平原（Prep the Portal）、地下（Explode a Volcano）
- **10 个难度档**（数据验证，`trials.json` `difficulties[]`）：

  | 档位 | 缩写 | Tiamat 生命值 | 血瓶成本/人 |
  |---|---|---|---|
  | Normal | N | 4.0e8 | 免费 |
  | Heroic | H | 7.5e8 | 1 |
  | Master | M | 1.3e9 | 1 |
  | Legend | L | 2.0e9 | 2 |
  | Torment | T | 2.9e9 | 3 |
  | Grand Master | GM | 4.3e9 | 4 |
  | Grand Legend | GL | 6.1e9 | 6 |
  | Grand Torment | GT | 8.6e9 | 8 |
  | Exalted Master | EM | 1.2e10 | 11 |
  | Exalted Legend | EL | 1.6e10 | 14 |

  每档的日常区域目标逐日递增（如 Normal Day1=z100 → Day7=z250），DPS 加成也随之提高。失败退还 25% 成本（至少 1 瓶）。
- **奖励**：
  - 提亚马特鳞片（Scales of Tiamat）— 用于熔炉锻造传奇装备，首次击败某难度给 3 倍鳞片
  - Wyrmspeaker 皮肤 — 每个地形有 2 个皮肤（共 10 个），需完成该地形两次
  - 巴哈姆特荣光宝箱 — 含突击卷轴（DPS 加成）和提亚马特之血（开高难度用）
- **传奇锻造关联**：详见 [legendary-forge.md](legendary-forge.md)。

### 时空门（Time Gates）— 运行中

时空门允许玩家重玩过去活动的冒险，以解锁或强化已过期活动英雄。

- **开启方式**：
  - 自然时空门：无活动周末自动开启，从 3 名随机英雄中选 1 名免费开启。优先包含 1 名未解锁英雄。持续 72 小时。
  - 手动开启：集齐 6 个时空门碎片（Time Gate Pieces，Boss 掉落，约 5 天冷却）可随时为任意英雄开启。赛季英雄仅需 3 件。
- **奖励（首次选择某英雄）**：3 次跑图收集主奖励 — 区域 50 解锁英雄 + 金箱、区域 75 第二个金箱、随机变体第三个金箱。自由模式每 100 层（100/200/300…）首次到达给该英雄银箱。
- **重复选择递增**：同一英雄再次选中时，目标区域各 +25（如 50/75 → 100/125），但跳过一次再选则各 -25（最低回 50/75）。
- **碎片补偿**：用 6 碎片开启但未领完奖励，每个未领奖励退 1 碎片。
- **恩宠**：获得密斯翠恩宠（Mystra's Favor），时空门关闭后强制转换，转换率低于正常活动。
- **活动 2.0 影响**：弹性槽位（Flex Slot）允许在活动期间以 3 碎片/槽直接体验老英雄的全部 3 变体 × 4 档 = 最多 12 个金箱，比手动开时空门（3 金箱）更划算。时空门仍适合活动间隔期的补完。

## 数据源

| 文件 | 字段 | 说明 |
|---|---|---|
| `public/data/v1/trials.json` | `difficulties[]` | 10 难度档：`id`/`shortName`/`name.display`/`tiamatHealth`/`costs[]`（`difficultyTokenId` + `amount`） |
| `public/data/v1/trials.json` | `roles[]` | 5 个地形角色：`adventureId`（907–911）、`campaign.id`（25 = 提亚马特战役）、`name.display` |
| `public/data/v1/variants.json` | `items[]` | 含 `modeTags`（`free_play`/`variant`/`patron`），无 timeGate 专属标记；时空门变体复用活动变体数据 |
| 无 | — | 赛季无独立数据文件（已停办）；时空门碎片/英雄池为服务端动态状态，不在静态 JSON 中 |

## 社区来源

| URL | 来源 | 状态 |
|---|---|---|
| https://idlechampions.fandom.com/wiki/Seasons | Wiki | ✅ |
| https://idlechampions.fandom.com/wiki/Time_Gates | Wiki | ✅ |
| https://idlechampions.fandom.com/wiki/Trials_of_Mount_Tiamat | Wiki | ✅ |
| https://www.reddit.com/r/idlechampions/comments/1c9srei/season_passbattlepass/ | Reddit | ✅ |
| https://www.reddit.com/r/idlechampions/comments/1c0gnz1/removing_seasons_has_killed_the_game_for_me/ | Reddit | ✅ |
| https://www.reddit.com/r/idlechampions/comments/1abrd7q/time_gate_thread/ | Reddit | ✅ |
| https://www.reddit.com/r/idlechampions/comments/1049itm/gaarawarrs_guide_to_the_trials_of_mount_tiamat/ | Reddit | ✅ |
