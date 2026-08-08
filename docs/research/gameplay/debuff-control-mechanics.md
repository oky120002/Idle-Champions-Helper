# 减益与控制机制（debuff & control）

**数据快照**：2026-08-06（165 英雄）
**社区来源**：[Fandom Wiki — Debuffs](https://idlechampions.fandom.com/wiki/Debuffs)、[Fandom Wiki — Knockback](https://idlechampions.fandom.com/wiki/Knockback)、[Reddit Buff/Debuff 汇编](https://www.reddit.com/r/idlechampions/comments/b5097r/)、[Reddit Click-Debuff 指南](https://www.reddit.com/r/idlechampions/comments/pihlfl/)、[Reddit 锁Boss讨论](https://www.reddit.com/r/idlechampions/comments/1gpxeen/)
**可信度**：⚠️ 待确认 — 控制标签（stun/slow/knockback/root）由游戏数据 `summary.tags` 直证，但具体持续时间和数值大多无 parser，依赖社区报告（Wiki 表格最后更新 2021 年）

## 机制

控制效果通过普攻或大招施加于敌人，用图标或动画显示在敌人身前或脚下。减益分两类：**怪物减益**（由英雄施加于敌人）和**英雄减益**（由变体规则施加于英雄）。本文聚焦怪物减益。

### 核心控制类型

| 类型 | 英文 | 效果 | 典型持续 |
|---|---|---|---|
| 击退 | knockback | 将敌人推离阵型，被推回的敌人短时间内受到的伤害增加（社区报告 +100%） | ~10s 伤害增益 |
| 眩晕 | stun | 敌人完全无法行动（不移动、不攻击） | 3–10s |
| 减速 | slow | 敌人移动速度降低（常见 50%），拖延接近阵型的时间 | 10–30s |
| 定身 | root | 敌人无法向阵型移动（但已有近战位的敌人仍可攻击） | 计时器 |
| 狂怒/激怒 | berserk / enrage | 多纳尔专精「决斗」可激怒敌人迫其决斗；Boss 存活过久自动狂怒，攻击力按显示数值提升 | 持续或叠层 |
| 恐惧 | fear | 目标攻击有 50% 概率落空 | 5s |

> **粘滞性（sticky）**：部分减益在施加者被换出阵型后仍然保留（带计时器），部分会立即消失。Wiki 表格标注了每种减益是否 sticky。

## 各类型代表英雄

游戏数据通过 `summary.tags` 字段标记控制能力，格式为 `control_stun`、`control_slow`、`control_knockback`、`control_root`，另有 `control_fumble`、`control_pacify`、`control_reposition`、`control_weaken` 四种边缘类型。

### 击退（knockback）— 11 英雄（`control_knockback` tag）

多纳尔(34)、佩内洛普(71)、戴斯蒙德(96)、多比(105)、艾伯特(113)、索剌克(120)、普雷斯托(144)、戴安娜(148)、埃里克(157)、维列瑟琳(162)、汉克(163)。

社区补充（无 tag 但社区报告有击退能力）：艾拉、鲍比、艾翁、阿夫伦、科拉松、芬、盖尔、格林、诺多姆、斯凯拉。

> 多纳尔普攻命令词含击退，被击退敌人 +100% 伤害 10s（社区报告）。Prudence 和 Warden 的大招可将敌人**拉近**阵型（pull），Lazaapz 也有偶尔拉扯效果（`control_reposition` tag）。

### 眩晕（stun）— 22 英雄（`control_stun` tag）

斯托吉(14)、克朗(24)、凯蒂布莉儿(25)、沃夫加(32)、多纳尔(34)、弗拉希娜(35)、艾拉(42)、吉姆(48)、阿夫伦(51)、弗里(63)、比德尔(64)、托罗加(69)、卢修斯(72)、梅亨(80)、赛丽斯(81)、德·哈尼(89)、蔚(95)、加兹里克(98)、瓦伦汀(103)、妮茜(123)、普雷斯托(144)、雷恩(155)。

社区补充（无 tag 但社区报告有眩晕能力）：恩拉克、哨兵、维吉尔、鲍比、希拉、温德福尔、纳耶莉、伊芙琳。

> 凯蒂布莉儿的「死亡标记」充满 10 次命中槽后触发 5s 眩晕；特里克茜（Trixie）在 Trick 堆叠数超过敌人数时，多余层数转为 3s 眩晕。弗利（Freely）的「踉跄」在受击时有概率眩晕。

### 减速（slow）— 11 英雄（`control_slow` tag）

K'thriss(38)、吉姆(48)、诺娃(62)、佩内洛普(71)、卢修斯(72)、贝洛斯(73)、塔林(74)、休马恩(75)、阿琳德拉(77)、科拉松(85)、普雷斯托(144)。

社区补充（无 tag 但社区报告有减速能力）：格罗玛（北极专精）、温德福尔、特里克茜、艾莉维克。

> 特里克茜消耗 Trick 层减速随机敌人 50%（10s）；艾莉维克大招火焰卡叠 50% 减速（乘算，上限 5 层）。

### 定身（root）— 2 英雄（`control_root` tag）

| 英雄 | 说明 |
|---|---|
| 贾希拉（Jaheira, 61） | 普攻「缠绕弯刀」定身敌人，使其无法向阵型移动 |
| 约尔文（Yorven, 92） | 拥有定身能力 |

### 其他控制类型（边缘 tag）

| 类型 | 英雄 | 说明 |
|---|---|---|
| 失误（fumble, 3） | 崔斯特(18)、多纳尔(34)、比德尔(64) | 敌人攻击有概率失误 |
| 安抚（pacify, 1） | 托罗加(69) | 安抚敌人降低攻击意愿 |
| 位移（reposition, 2） | 拉萨普兹(66)、哈尔辛(156) | 改变敌人位置（含拉扯） |
| 削弱（weaken, 2） | 诺娃(62)、米莉娅(121) | 削弱敌人属性 |

### 狂暴（berserk）— 安森（Anson）

安森的 `uggie_inflict_berserk` 标记其狂暴机制。此外 Boss 存活过久自动获得狂怒（Enrage）增益，攻击力持续提升。

## 对战斗的影响

### 拖延与打断

- **减速 + 击退组合**：减速让敌人走得更慢，击退把它们推回起点。两者叠加可极大拖延敌人到达阵型的时间，减少英雄承伤
- **眩晕锁定 Boss**：多个眩晕英雄轮换可使 Boss 长时间无法行动，社区称为「锁 Boss」。配合多纳尔击退（+100% 伤害）和 Warden/Prudence 的拉扯，可在 DPS 不足时用 click-debuff 推进 200+ 层
- **定身卡位**：贾希拉定身可阻止敌人前进，但已有近战位的敌人仍可攻击，需配合坦克

### 配合特定英雄

| 配合 | 效果 |
|---|---|
| 沃夫加 × 眩晕 | 专长「掌旗手」对眩晕敌人 +200% 伤害；大招可眩晕 10s |
| 凯尔（Kyre）× 眩晕 | 对眩晕敌人增加暴击伤害（`increase_crit_damage_when_monster_stunned`） |
| 索剌克（Solaak）× 击退 | 「机动战术」每击退一个敌人增强战友效果 |
| 奇列克（Qillek）× 眩晕/减速 | 对带眩晕或减速的敌人增加金币掉落 |

### Click-Debuff 元策略

当 DPS 队到达极限后，社区开发出以减益英雄为核心的 click-debuff 阵型：全队堆叠多种敌人减益（额外伤害、减速、击退），配合点击伤害持续推进。典型英雄包括 Aila（风暴减益 + 短冷却）、Krull（龙疫三系减益）、Warden（Hex 叠层）、Havilar（减速叠层）。

## 数据源

| 数据位置 | 字段 | 说明 |
|---|---|---|
| `champion-details/<id>.json` | `summary.tags[]` | 控制标签：`control_stun`、`control_slow`、`control_knockback`、`control_root` |
| `champion-details/<id>.json` | `raw.hero.tags[]` | 原始游戏标签，同上四种 |
| `champion-details/<id>.json` | `upgrades[].effectDefinition` | 效果 ID（需反查 effect-definitions 获取具体参数） |
| `hero-abilities.json` | `roles[]` / `tags[]` | 英雄角色分类含 `control`、`debuff` |
| `hero-abilities.json` | effect_string 中的 `add_attack_stun`、`push_back_monster`、`control_stun` 等 | 具体效果标识（多数无 parser，仅标识存在） |

**角色统计**（165 英雄）：`control` 角色 46 人，`debuff` 角色 40 人。

## 提取方法

无统一字段标识具体持续时间和数值，需从以下位置按关键词扫描：

- `champion-details/<id>.json` 的 `summary.tags` 确认英雄拥有哪些控制类型
- `upgrades[].specializationDescription.original` — 专精描述（如多纳尔命令词变体）
- `upgrades[].effectDefinition` → 反查 `effect-definitions.json`
- Wiki 社区表确认持续时间和 sticky 属性

## 验证标注

| 内容 | 验证状态 | 说明 |
|---|---|---|
| 控制标签英雄列表 | 游戏数据确认 | `champion-details` 的 `summary.tags` 直接读取，165 英雄快照 2026-08-06 |
| 击退 +100% 伤害 | 社区报告 | Reddit 汇编帖报告多纳尔击退后敌人受到 100% 额外伤害 10s，游戏数据中无明确数值字段 |
| 眩晕持续时间（3–10s） | 社区报告 | Wiki 表格列出部分大招持续时间（如 Sentry 3s、Wulfgar 10s），普攻眩晕时长需逐英雄查证 |
| 减速 50% | 社区报告 | Reddit 和 Wiki 一致报告 Trixie/Ellywick/Penelope 为 50%，具体数值不在解析数据中 |
| Click-debuff 元策略 | 社区报告 | 多个 Reddit 帖子确认可推进 200+ 层，依赖具体装备和专长配置 |
| 定身仅 2 英雄 | 游戏数据确认 | 仅贾希拉（61）和约尔文（92）拥有 `control_root` 标签 |
| 安森狂暴 | 游戏数据确认 | `uggie_inflict_berserk` 效果标识存在，具体机制待补实测 |
| Boss 狂怒（Enrage） | 社区确认 | Wiki 和 Reddit 均确认 Boss 存活过久自动狂怒，叠层乘算 overwhelm |
| Wiki 表格时效 | 需核验 | Wiki Debuffs 页面标注「Last update 2021 February」，新英雄（如 Trixie 2024+）不在表格中，由社区帖和游戏数据补充 |

## 社区来源

- [Fandom Wiki — Debuffs](https://idlechampions.fandom.com/wiki/Debuffs)
- [Fandom Wiki — Knockback](https://idlechampions.fandom.com/wiki/Knockback)
- [Reddit Buff/Debuff 汇编](https://www.reddit.com/r/idlechampions/comments/b5097r/)
- [Reddit Click-Debuff 指南](https://www.reddit.com/r/idlechampions/comments/pihlfl/)
- [Reddit 锁Boss讨论](https://www.reddit.com/r/idlechampions/comments/1gpxeen/)
