# M3 数据源确认报告

- 作用：归档里程碑 3（阶段 10-14）各「数据源确认」步骤的调查结论，供后续实现与审计追溯。
- 来源：raw `definitions-2026-04-13T02-00-23.309Z.json`（`game_rule_defines` / `monster_defines` / `patron_perk_defines` 等）。
- 配套：步骤清单见 `milestone-3-enhancement.md`；格式特性见 `docs/research/data/game-data-source/format-quirks.md`。

---

## 10.1 怪物 stats 数据源（monster_base_stats）

**结论：数据源确认可用。** 怪物随层数缩放的 stats 是**全局 game rule**（`game_rule_defines.rule_name=="monster_base_stats"`），不是 per-monster 字段。per-monster 身份（tags / attack_type / adventures）在 `monster_defines`，已由 `scripts/data/normalize-adventures.ts` 的 `buildMonsterCatalog` 收取；缩放曲线此前未被任何模块消费，阶段 10 首次接入。

### 字段清单（`monster_base_stats.rule`）

| 字段 | 值 | 用途 |
|---|---|---|
| `base_health` | `10` | 怪物 area 1 基础生命 |
| `health_growth_rate` | `2.031` | 默认每层生命增长率 |
| `health_growth_rate_curve` | `{1:2.031, 2001:3.031, 2251:4.531}` | 按层数分档的生命增长率（stepped curve） |
| `base_dps` | `1` | 怪物 area 1 基础秒伤 |
| `dps_growth_rate` | `1` | 默认每层 dps 增长率 |
| `dps_growth_rate_curve` | `{1:1, 50:1.75, 51:1, 100:1.75, ...}` | boss 层（每 50 层）1.75× spike，高层（2301+）升至 4，2451 层 1e10（max_area 墙） |
| `base_speed` | `50` | 怪物基础攻击间隔（相关单位） |
| `speed_growth_rate` | `1` | 速度不随层数增长 |
| `health_gold_ratio` | `0.65` | 生命/金币比基准（阶段 3 baseGold 已用） |
| `health_gold_ratio_curve` | `{1:0.65, 42:0.62, ...}` | 比率随层数衰减 |
| `gold_overrides` | `{1:.., 2:..}` | 按层的金币覆写 |
| `power_boost_time` / `power_boost_growth_rate` / `power_boost_multiplicative` | `10` / `1` / `false` | 怪物 power boost 机制（rate=1，当前无实际增长贡献） |

### 缩放公式（实现采用）

CNE 的 `*_growth_rate_curve` 是 **per-area stepped curve**：area A 的增长率 = curve 中 `≤ A` 的最大 key 对应值。stats 按**逐层复合**累积：

```
stat(area) = base × Π_{a=2..area} curve_lookup(a)
```

- **生命**（area ≤ 2000）：`health(A) = 10 × 2.031^(A-1)`。area 2001+ 增长率升至 3.031、2251+ 升至 4.531（高层加速）。
- **dps**：增长率常态为 1（不增长），仅 boss 层（50/100/150…）×1.75；即 `dps(A) = 1.75^(boss 层数)`。

**数值合理性核对**（佐证 per-area 复合解释正确）：
- `health(50) = 10 × 2.031^49 ≈ 10^16`，`health(100) ≈ 10^31`，`health(1000) ≈ 10^308`（恰逼近 double 上界），`health(2000) ≈ 10^616`（超出 float → 必须用 break_eternity，本仓库 `GameNumberValue` 已是 `break_eternity.js`）。
- 怪物生命每层 ~2× 是 IC 指数墙的核心设计；dps 增长缓慢（每 50 层 1.75×）→ survival 约束在推图初期决定后长期稳定，**HP（击杀时间）才是推图层数的主要约束**，与阶段 5「survival 降级为约束、推图预估以 BUD/HP 为主」一致。

### 绝对值校准边界（继承第六轮审计）

公式**结构**来自官方数据，但**绝对值未与真实游戏实测对照**。阶段 10.2 预估结果必须向用户标注「未校准」，待阶段 7.5 BUD 实测校准后才闭环。相对比较（高 BUD 阵型预估层数 > 低 BUD）不受影响。

### 相关 game rules（阶段 14 复用）

- `max_area: {area: 2501}` — 游戏最大层数，推图预估上限。
- `max_modron_auto_reset_area: {area: 2500}` — modron 自动重置层数上限（阶段 14.3）。
- `click_damage_settings: {base_power:1, power_curve:2.031, base_cost:50, cost_curve:1.7}` — click damage 按层缩放曲线与怪物生命同构（阶段 14.1）。
- `ultimate_damage_params: {dps_based:true, ...}` — ult 伤害派生自 DPS/BUD（阶段 14.4）。

---

## 11.1 blessings 数据源调查

**结论：blessings 在 M3 不可做——只做 patron-perks（阶段 11.3/11.4）。**

证据链：

1. **definitions 无 blessing 效果定义**：top-level keys 全量枚举无 `blessing_defines` / `blessing_defines`；`patron_defines` / `campaign_defines` 的 properties 不含 blessing 树。effect_defines 中仅 634/646 含 `luck_of_yondalla_blessing`（Yondalla 特例机制，非通用 patron blessings 系统）、1439 含 `behind` tag 的 hero_dps（非 blessing）。
2. **raw user save 有 favor + blessings 计数**：`scripts/data/user-sync/userProfileNormalizer.ts` 的 `CampaignPayload` 读 `favor` / `blessings`，`normalizeCampaignDetails` 产出 `{campaignId, favor, blessings: Record<string,number>}`（blessing_id → 已购数量/等级）。
3. **但 `UserProfileSnapshot` 丢弃该数据**：`buildUserProfileSnapshot` 调 `normalizeCampaignDetails` 只为产 warning（`campaign details imported: N`），favor/blessings 不进 snapshot 字段（`src/domain/user-profile/types.ts` 的 `UserProfileSnapshot` 无 favor/blessings）。

**含义**：即便把 favor/blessings 计数接回 snapshot，**没有 blessing 效果定义**就无法知道每个 blessing_id 给多少 DPS/金币加成——blessing 树定义不在当前 definitions 快照（可能属游戏服务端或未抓取的独立端点）。阶段 11 按 milestone 条件「11.1 确认 blessings 不可做 → 只做 patron-perks」执行。

**后续若要补 blessings**：①确认 blessing 树定义的上游端点并抓取；②`UserProfileSnapshot` 加 `campaigns: {campaignId, favor, blessings}[]`；③blessing 效果按 patron-perks 同构解析（effect_def 引用 + per_level 缩放）。

---

## 11.2 patron-perks effect 结构确认

**结论：数据源结构清晰，可解析。**

来源：`patron_perk_defines`（110 条，type 1/2 各 55——type 区分 perk 类别，effect 结构同构）。结构：

```jsonc
{
  "id": 1, "name": "Mirt's Mirth", "patron_id": 1, "tier_id": 1, "type": 1,
  "cost": { "base_cost": 5000, "scaling": 1.05 },
  "levels": 10,                  // 最大等级
  "effects": [
    { "effect_string": "global_dps_multiplier_mult,$replace", "per_level": 100 }
  ]
}
```

### effect 形态

- `effect_string` + `per_level`（每级加成值）。
- `$replace` 语义：perk 效果按当前等级 **替换**（非叠加），有效值 = `per_level × currentLevel`。`levels` 上限封顶。
- 两类载体：
  1. **裸 effect_string**（如 `global_dps_multiplier_mult,$replace` / `gold_multiplier_mult,$replace`）——直接全局加成。
  2. **`effect_def,<id>` 引用**——指向 `effect_defines[<id>]`，含 `effect_keys[]`（带 `filter_targets` tag 限定，如 effect_def 454 `hero_dps_multiplier_mult` + `by_tags:good`）。

### effect_string 分布（110 perks）

| effect_string | 数量 | 加成类型 |
|---|---|---|
| `global_dps_multiplier_mult,$replace` | 13 | 全局 DPS（进 globalDpsMultiplier pool） |
| `gold_multiplier_mult,$replace` | 2 | 全局金币 |
| `global_dps_multiplier_mult_area_tags,$replace,<tag>` | 3 | 场景 tag 条件全局 DPS（underground/hellish） |
| `effect_def,<id>`（453-460 / 609-613 / 828-833 等） | ~80 | tag 限定 hero_dps / healing / vulnerability 等 |
| `monster_health_reduce,$replace` / `health_mult,$replace` / `monster_with_tag_more_damage` 等 | 少量 | 非全局，按需评估 |

### 接入策略（阶段 11.3/11.4）

- **全局 DPS 进 global pool**：`global_dps_multiplier_mult,$replace`（13 条）+ area_tags 条件版（3 条，按场景 tag 匹配）直接进 `globalDpsMultiplier` pool（mult，amountFunc='mult'，value = per_level × level）。
- **tag 限定 hero_dps**（effect_def 引用，~80 条）：按 `filter_targets` tag 匹配英雄，进 `heroDpsMultiplier` pool。MVP 可先接全局 DPS（最高频、最直接），tag 限定版按需扩展（复用现有 `HeroQualifier` tag 解析）。
- **perk 等级来源**：patron perks 的已购等级属用户存档（类似 blessings，需 `UserProfileSnapshot` 暴露 patron perk levels）。snapshot 当前未暴露 → MVP 取**满级理论值**（per_level × levels），标注「理论最大」，按存档裁剪留阶段 13 精细化（与装备/feat 同批）。

> **perk 等级数据缺口**：`UserProfileSnapshot` 未暴露 patron perk 已购等级（同 11.1 blessings 缺口）。raw user save 是否含 perk levels 待 13.2 提取阶段一并确认；MVP 先用满级理论值进 pool。

