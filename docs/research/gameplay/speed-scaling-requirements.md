# 速度效果三层缩放需求

**来源**：用户明确要求（2026-08-10）
**关联**：[[speed-mechanics-11-categories]]、`docs/archives/plans/2026-08-planner-speed-dimension.md`

## 核心约束

11 类速度效果的效率**高度依赖**三个缩放层。每层的缩放方式（乘法/加法/次方）取决于游戏机制，不能假设——须从数据字段语义和效果描述推导。

| 缩放层 | 作用机制 | 自动/手动 | 默认值设计 |
|---|---|---|---|
| **装备等级（ilvl）** | loot 的 `buff_upgrade` 对速度效果的影响方式需逐效果验证（可能是加性百分比进 pool、乘性缩放值、或其他） | UI 可调 | 复用 hypotheticalEquipment 框架（默认 rarity=4 + enchant=2000），玩家逐步投资 |
| **阵型效果** | 阵型组成影响速度效果强度（如 Hew Maan 相邻人类数 → `other_human_bonuses` 查表），影响方式需从 effect 描述推导 | 自动选优 | 搜索时自动找最大化速度的阵型组成 |
| **激活专精** | 专精选择改变速度参数（如 Deekin "Boss Wants Speed" 强化刷新加速），可能是新增效果（加性）或缩放已有效果（乘性） | 自动选优 | 搜索时自动选最优专精 |

## 设计原则

1. **三层乘数都必须参数化传入计算器**，不能硬编码
2. **阵型效果和专精自动选最优**——planner 搜索时自动尝试不同阵型组成和专精选择，找到最大化速度因子的组合
3. **装备等级 UI 可调**——玩家逐步投资、不可能一次拉满（"刷刷刷"游戏的本质是耗时间逐步提升）
4. **三层在 UI 上都可调整**——玩家当前实际投入水平与理论最优不同，需要 what-if 调节

## 取值口径（冻结 2026-08-10）

三层缩放和动态英雄假设的取值遵循 planner 统一取值口径（详见 `docs/specs/modules/planner/architecture.md` §取值口径）：

- **计算器只接收 UI 当前值**，不自动消费用户数据
- **UI 初始值 = 内置默认**（如 `DYNAMIC_SPEED_DEFAULTS`：Briv 25% / Lae'zel 18% / Thellora 15% / Halsin 11%）
- **用户数据 = 一个「载入」按钮**，点击后替换 UI 面板值；全有或全无，不合并
- **默认值 / UI 可调性 / 入参可调性**三个维度独立

## 实现影响

- `computeFormationSpeedMultiplier` 需接收三层缩放入参（不能只用 build 期 base 值）
- `SpeedEffectEntry` 需记录源 `upgradeId`，使装备 `buff_upgrade` 能定位并缩放
- 运行时需计算阵型组成效果（相邻英雄 tag 计数等）
- 专精注入需覆盖速度效果（spec catalog 中的速度效果需提取）
- UI 需新增装备等级/阵型参数/专精选择的调节控件

## 装备 buff_upgrade 对速度效果的缩放机制（数据验证）

游戏数据有 32 条 loot buff_upgrade 作用于速度效果 upgrade（2026-08-10 验证）。

### 已验证的证据

IC `buff_upgrade,<amount>,<target_upgrade_id>[,<effect_index>]` 在现有 DPS 信号管线中的实现：
创建一个 wrapper signal，value = `base.value × amount/100`，该 wrapper 作为同 pool 的附加 addPercent 参与
加法叠加。等价于 pool 总 addPercent = `base + base × amount/100`。

社区数据交叉验证（Sentry）：slot 3 rarity 4 = `buff_upgrade,150` 作用于 `buff_resolution_chance,10`。
社区报告 751 ilvl 达 100% 概率。按 wrapper 机制 + enchant 缩放（`amount × (1 + enchant/250)`）估算，
约 1300 enchant 达 100%，与 ilvl→enchant 映射一致（rarity 4 贡献基础 ilvl + enchant 叠加）。

### 尚未完全验证的部分

- **handler 效果**（`hewmaan_fellow_humans,0`、`simultaneous_monster_spawn_chance_mult,0`）：buff_upgrade
  缩放的是 handler 内部参数，不遵循简单数值缩放——需要从 `other_human_bonuses` 等元数据推导
- **多参数效果 + effect_index**：`buff_upgrade,<amount>,<target>,<index>` 可只缩放第 N 个参数，
  当前实现统一缩放整个 upgrade 的效果——需逐效果验证 index 语义
- **阵型效果和专长的缩放方式**：完全未验证——需要从 effect 描述文本和 `other_human_bonuses` 等结构推导
