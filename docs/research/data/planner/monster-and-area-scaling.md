# 怪物与区域缩放数据核实

## 怪物 stats 数据源（monster_base_stats）

**结论：数据源确认可用。** 怪物随层数缩放的 stats 是**全局 game rule**（`game_rule_defines.rule_name=="monster_base_stats"`），不是 per-monster 字段。per-monster 身份（tags / attack_type / adventures）在 `monster_defines`，已由 `scripts/data/normalize-adventures.ts` 的 `buildMonsterCatalog` 收取；缩放曲线由 `src/domain/simulator/monsterStats.ts` 消费。

### 字段清单（`monster_base_stats.rule`）

| 字段 | 值 | 用途 |
|---|---|---|
| `base_health` | `10` | 怪物 area 1 基础生命 |
| `health_growth_rate` | `2.031` | 默认每层生命增长率 |
| `health_growth_rate_curve` | `{1:2.031, 2001:3.031, 2251:4.531}` | 按层数分档的生命增长率（stepped curve） |
| `base_dps` | `1` | 怪物 area 1 基础秒伤 |
| `dps_growth_rate` | `1` | 默认每层 dps 增长率 |
| `dps_growth_rate_curve` | `{1:1, 50:1.75, 51:1, 100:1.75, ...}` | boss 层（50/100/151 起 每 50 层）1.75× spike，高层（2001-2401 每 50 层）升至 4，2451 层 1e10（max_area 墙） |
| `base_speed` | `50` | 怪物速度参数（语义未确认，见下方 dps 量纲缺口） |
| `speed_growth_rate` | `1` | 速度不随层数增长 |
| `health_gold_ratio` | `0.65` | 生命/金币比基准（**当前未消费**——`goldObjective.ts` 当前硬编码 `BASE_GOLD=1` 做相对比较；绝对值校准需接入此字段） |
| `health_gold_ratio_curve` | `{1:0.65, 42:0.62, ...}` | 比率随层数衰减（**当前未消费**，同上） |
| `gold_overrides` | `{1:.., 2:..}` | 按层的金币覆写（**当前未消费**，同上） |
| `power_boost_time` / `power_boost_growth_rate` / `power_boost_multiplicative` | `10` / `1` / `false` | 怪物 power boost 机制（rate=1，当前无实际增长贡献） |

### 缩放公式

CNE 的 `*_growth_rate_curve` 是 **per-area stepped curve**：area A 的增长率 = curve 中 `≤ A` 的最大 key 对应值。stats 按**逐层复合**累积：

```
stat(area) = base × Π_{a=2..area} curve_lookup(a)
```

- **生命**（area ≤ 2000）：`health(A) = 10 × 2.031^(A-1)`。area 2001+ 增长率升至 3.031、2251+ 升至 4.531（高层加速）。
- **dps**：增长率常态为 1（不增长），仅 boss 层（50/100/151/201…，第 3 个起 = 151 + 50k）×1.75；即 `dps(A) = 1.75^(boss 层数)`。

数值合理性：`health(50) ≈ 10^16`，`health(100) ≈ 10^31`，`health(1000) ≈ 10^308`（逼近 double 上界），`health(2000) ≈ 10^616`（超出 float → 必须用 decimal.js，`GameNumberValue` 已是）。怪物生命每层 ~2× 是 IC 指数墙核心；dps 增长缓慢 → survival 约束在推图初期决定后长期稳定，**HP（击杀时间）才是推图层数的主要约束**。

### 绝对值校准边界

公式**结构**来自官方数据，但**绝对值未与真实游戏实测对照**。推图预估的「第 X 层」是绝对量，依赖 BUD 实测校准（`bud-calibration.md`）才能采信；校准前 UI 标注「未校准」。相对比较（高 BUD 阵型预估层数 > 低 BUD）不受影响。

### dps 量纲缺口

`base_dps` / `dps_growth_rate_curve` 字段名为 dps，但 `base_speed`(=50) 语义未确认（per-second vs per-hit）。areaEstimation 的 survival 约束（effectiveHealth ≥ monsterDpsAt）当前以「怪物伤害随层数缩放」近似；由于缺少已确认的单次伤害语义，当前不能精确计算 `incomingDamagePerHit`。

### 相关 game rules

- `max_area: {area: 2501}` — 游戏最大层数，推图预估上限。
- `max_modron_auto_reset_area: {area: 2500}` — modron 自动重置层数上限。
- `click_damage_settings: {base_power:1, power_curve:2.031, base_cost:50, cost_curve:1.7}` — click damage 按层缩放曲线与怪物生命同构。
- `ultimate_damage_params: {dps_based:true, ...}` — ult 伤害派生自 DPS/BUD。

---
