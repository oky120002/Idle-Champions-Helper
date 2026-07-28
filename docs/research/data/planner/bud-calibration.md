# BUD 计算与校准证据

BUD（Biggest Unique Damage）= 阵型近期最高单次伤害。IC 怪物血量按阵型 BUD 缩放，是推图层数预估的核心绝对量。BUD 对阵型推荐与推图预估的价值取舍见 `docs/specs/modules/planner/architecture.md`；单英雄单次伤害计算见 `src/domain/simulator/budCalculation.ts`。

## 公式

```
singleHit(hero) = heroDps × attackCooldown
BUD(formation)  = max over placed heroes of singleHit(hero)
```

- `heroDps`：英雄每秒伤害（planner 用 carryDps = baseDamage × levelCurve × 加成聚合 近似；未含 click/ult 对单次的放大）。
- `attackCooldown`：英雄基础攻击间隔（秒/次），来自 `champion-details.attacks.base.cooldown`，已提取到 `profile.baseAttackCooldown`。
- 推导：DPS = 伤害/秒，cooldown = 秒/次 → 单次伤害 = (伤害/秒) × (秒/次) = 伤害/次。
- IC 机制：慢攻击（高 cooldown）英雄单次伤害更高，更易成为 BUD setter。

## 实现边界

- `budCalculation.ts` 只导出 `computeSingleHitDamage(heroDps, attackCooldown)`——单英雄单次伤害；缺 cooldown 时回退默认 1 秒。
- 阵型级 BUD（`max` 各英雄单次伤害）**不在此计算**——`steadyStateScoring` 直接用 carry 的单次伤害近似阵型 BUD（carry 通常设 BUD）。formation-max 精确化（考虑非 carry 高 cooldown 英雄）留待 BUD 实测校准后按需立项。
- ult_damage 派生（`ultimate_damage_params.dps_based:true`）由 ult uptime 折算路径处理，见 `docs/specs/modules/planner/simulator.md`。

## MVP 近似与局限

- carryDps 当前不含攻速（`baseDps.ts` 未除 cooldown），用作 heroDps 时与「真·每秒」存在系统性偏差；speed 暂不进 carryDps，BUD 作为 speed 感知辅助指标并行计算。
- `computeSingleHitDamage` 未含 BUD 专属放大（click damage、ult 对单次、BUD-setter 标签加成），绝对值偏低；相对比较（谁设 BUD）保序。

## 绝对伤害偏差根因分析（2026-07-28 诊断）

明斯克（hero_id=7）absolute-dps 偏差量化（`damageReferenceVerification` 度量，含外部加成 ×500 + 等级门控后）：

| 快照 | levelCurve(1.12^lvl) | calc(含×500) | 实测 obs | 偏差 log10 |
|---|---|---|---|---|
| l1 | 10^0.05 | 10^12.4 | 10^45.1（1.25e45） | -32.7 |
| l722 | 10^35.5 | 10^49.2 | 10^62.7（5.02e62） | -13.5 |

- 明斯克 baseDamage = 1e7；`baseDamage × formationAggregate × globalBuff(500)` = 10^12.3（l1）/ 10^11（l722 归一）。
- **偏差主因不是 baseDamage/levelCurve**：l1 漏 ~10^33 的全局放大。这是**玩家账号累积的全局加成**（favor/modron 等），未进 calc（calc 只含英雄 baseDamage × 阵型 signal × 外部加成）。
- levelCurve 用 costCurves['1']=1.12 高估（实测伤害增长率 ~1.058），**恰好部分抵消**全局放大缺失——这是 l722 偏差（-13.5）比 l1（-32.7）小的原因。若修正 levelCurve（1.058）但不建模全局放大，偏差暴露至 ~-31.5。
- **结论**：absolute-dps 偏差收敛依赖**全局放大建模**（favor/modron/blessing，即 architecture.md 后续目标的「外部加成生产侧 + modron 接入」），不是 baseDamage/levelCurve 微调。BUD 校准（baseDamage/官方曲线精确化）是次要项（相对比较保序，绝对值靠全局放大）。

## 全局放大源调研（2026-07-28 raw 分析）

偏差主因 ~10^33 全局放大的来源（`tmp/idle-champions-api/definitions-*-lang-1-source.json` 深挖）：

- **favor 不是乘数源**：`patron_defines` 的 currency（Ruby Coin / Symbol of Vajra 等）是购买 blessing 的货币；`game_rule_defines` 68 条无 favor→伤害公式。favor 本身不给全局乘数。
- **Global Blessing 系统（钥匙）**：`effect_defines:2718`「Increases the damage of all Champions by $amount% **for each Global Blessing** you have」。玩家拥有的 global blessing（克兰沃/托姆/扎瑞尔等"恩赐祝福"，跨 patron）聚合 → 全局乘数。明斯克 incomingBuffs ×500（关注核心/普通种族/以身作则/铁胃）是其拥有的部分 blessing；玩家通常拥有更多，累积放大（10^30 量级）。
- **modron**：`modron_tile_defines`（326 条）是阵型布局组件（无 effect）；`modron_core_defines` 只有 grid 配置。modron 的乘数经触发 buff（`effect-reference` 的 `modron_*`）实现，建模需解析核心配置 → buff 链（复杂，单独工程）。
- **buff_defines** damage 相关仅 10 条（药水/Ad/MixPlay，临时 buff，非持久全局放大）。

### 建模路径（按依赖）

1. **blessing 接入（大头）**：`UserProfileSnapshot` 加 `blessings` 字段（`userProfileNormalizer:254-255` 已保留 `normalizeNumberRecord(c.blessings)`，但未进最终 snapshot）+ 归一化 global blessing 乘数定义（raw `effect_defines` / `patron_perk_defines` 的 global_dps blessing）+ 适配层聚合进 `globalBuffMultiplier`。
2. **modron 接入**：核心配置 → buff 链解析（复杂，单独工程）。

结论：absolute-dps 偏差收敛 = blessing + modron 建模。两者均是大工程（数据接入 + 定义归一化 + 适配层），单 session 无法全完，需多轮推进。

## 实测对照方法（需用户配合游戏）

目标：计算 BUD 与游戏内显示 BUD 偏差 **< 30%**。

1. 选一个已知阵型（记录各英雄 id、等级、装备）。
2. 游戏内查看阵型 BUD 显示值（战斗界面 / 详情）。
3. 用 `computeSingleHitDamage`（输入各英雄 carryDps × baseAttackCooldown）计算单次伤害，取 max 近似阵型 BUD。
4. 记录下表，计算偏差 = |计算 − 实测| / 实测。

## 实测数据

> 待用户填入游戏实测。偏差 > 30% 时回查公式（最可能根因：heroDps 近似缺攻速/click、cooldown 字段取值、BUD-setter 标签加成未建模）。

| 阵型 | carryDps setter | cooldown | 计算 BUD | 游戏实测 BUD | 偏差 |
|------|-----------------|----------|----------|--------------|------|
| _待填_ | _待填_ | _待填_ | _待填_ | _待填_ | _待填_ |

## 核实结论

- 公式已实现并单测覆盖（`budCalculation.test.ts`：单次伤害、慢攻击 BUD 更高、cooldown 回退、空阵型）。
- 绝对值实测校准仍缺用户游戏内数据；阵型推荐以 carryDps 优化，BUD 为辅助指标。
