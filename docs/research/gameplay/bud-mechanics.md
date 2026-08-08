# BUD（基础杀招伤害，Base Ultimate Damage）

**数据快照**：2026-08-08（165 英雄）
**社区来源**：[Steam 讨论（含开发博客原文）](https://steamcommunity.com/app/627690/discussions/0/4522261213603379633/)、[Reddit r/idlechampions](https://www.reddit.com/r/idlechampions/comments/fnoaal/bud_base_ultimate_damage_101_an_introduction/)、[Fandom Wiki](https://idlechampions.fandom.com/wiki/Base_Ultimate_Damage)

## 机制说明

BUD（Base Ultimate Damage，社区俗称 Biggest Unique Damage）是决定大招伤害、火龙息药水和点击伤害的核心基准值。游戏持续追踪阵型中每个英雄的普通攻击，记录其中**单次命中对单个敌人造成的最高伤害**。✅ 社区+数据确认

### 追踪规则 ✅

- BUD 取的是**单英雄对单一目标**的命中伤害，而非全阵型 DPS 或 AOE 总伤害
- AOE / 多段攻击按**对单一目标的最大伤害**计入，不是攻击总伤害
- 每次新命中伤害 > 当前 BUD 时，BUD 更新为该值并重置衰减计时器
- 由于 DPS = 伤害/秒，攻击间隔（cooldown）越长，单次伤害越高——慢攻击英雄更容易设 BUD

### 衰减规则 ✅

- 命中后 **15 秒宽限期**内不衰减
- 15 秒后开始衰减：每 15 秒损失当前效能的约 **90%**
- 新的更高命中会重置衰减计时器
- 若主 DPS 死亡或被换下，BUD 会先经历 15 秒宽限再快速跌落

### 与大招/点击/火龙息的关系 ✅

- **大招伤害** = BUD × `damageModifier`（每个英雄大招有独立系数）
- **点击伤害**（click damage）= BUD × 点击秒数（游戏内 `click_damage` 效果族）
- **火龙息药水**（fire breath potion）：基于 BUD 计算伤害

> 社区确认 BUD 引入前，大招和火龙息使用旧 DPS 平均值，导致伤害忽高忽低；BUD 使结果更稳定。

## 数据源：游戏数据中的 BUD 字段

| 字段/效果 | 位置 | 说明 |
|---|---|---|
| `attacks.base.cooldown` | `champion-details/<id>.json` | 基础攻击间隔（秒/次），决定谁设 BUD |
| `attacks.ultimate.damageModifier` | `champion-details/<id>.json` | 大招伤害系数（明斯克 = 0.01875），大招伤害 = BUD × 此值 |
| `attacks.ultimate.cooldown` | `champion-details/<id>.json` | 大招冷却（秒），明斯克 = 180s |
| `bud_setter`（target） | `effect-definitions.json`、`champion-details/141.json`（影心）| 目标标签，只作用于当前设 BUD 的英雄 |
| `if_not_bud_setting_champion`（amount_func） | `champion-details/15.json`（克朗）| 仅在该英雄非 BUD setter 时生效 |
| `bud_setter_changed`（listener） | `champion-details/15.json` | BUD setter 切换时重新计算的触发器 |
| `deal_bud_damage_when_hit` | `hero-abilities.json`（法莉德 0.5s、卡菈克 0s、瑞文嘉德 25s） | 命中时附加 N 秒 BUD 伤害 |
| `deal_bud_damage_in_area` | `effect-reference.json` | 对区域目标造成 N 秒 BUD 伤害 |
| `stoki_bud_damage_on_repeat_attack` | `hero-abilities.json`（斯托吉） | 重复攻击附加 BUD 伤害 |
| `umberto_bud_seconds_per_bee` | `hero-abilities.json`（翁贝托） | 每只蜜蜂附加 N 秒 BUD |
| `decrease_bud_decay_rate` | `hero-abilities.json`（罗茜，值 50） | 降低 BUD 衰减率（50%）|
| `apply_when_bud_setting` | `hero-abilities.json`（宾温） | 仅在该英雄设 BUD 时生效 |

> 上述 BUD 相关效果在数据管线中均标记为 `No parser`，即未进入评分模型。BUD 本身是运行时动态值，不在静态数据中直接出现。

## 与多段攻击的关系 ✅

多段攻击英雄（如法莉德 `damageModifier: 0.33`）每段伤害较低，单次命中可能不足以超过 BUD setter 的单次伤害。但 `deal_bud_damage_when_hit` 类效果可以在命中时直接附加 BUD 值的伤害，绕过「单次命中须 > BUD」的更新规则。

## 本项目建模

本项目 `computeSingleHitDamage(heroDps, attackCooldown)` 近似计算单英雄单次伤害（`src/domain/simulator/budCalculation.ts:15`）：

```
singleHit(hero) = heroDps × attackCooldown
BUD(formation)  = max over placed heroes of singleHit(hero)
```

- 用 carryDps 近似 heroDps，绝对值偏低（未含 click/ult 放大），但保序（谁设 BUD 的比较准确）
- 阵型级 BUD 目前用 carry 单次伤害近似（carry 通常设 BUD）
- 校准证据见 `docs/research/data/planner/bud-calibration.md`

## 验证标注

| 结论 | 标注 |
|---|---|
| BUD 取单次最高命中而非 DPS 平均值 | ✅ 社区+数据确认 |
| 15 秒宽限期 + 每 15 秒衰减 90% | ✅ 社区确认（开发博客原文） |
| 大招伤害 = BUD × damageModifier | ✅ 数据确认（`ultimate.damageModifier` 字段存在） |
| click damage 派生自 BUD | ✅ 社区+数据确认（`effect-reference` 含 `click_damage`） |
| `deal_bud_damage_when_hit` 按秒数换算 BUD | ✅ 数据确认（参数名 `seconds_worth_of_bud`） |
| 衰减率精确为每 15 秒 90%（而非近似值） | ⚠️ 社区引用开发博客，但无客户端代码验证 |
