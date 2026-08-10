# planner 速度维度建模

**状态**: 已确认
**类型**: change
**范围**: planner (speed scoring) + scripts/data (speed extraction) + UI
**创建日期**: 2026-08-10

## 目标

将 11 类速度效果建模为「区域推进效率因子」（speedMultiplier），新增 `ScoringMode = 'team-speed'` 评分模式，使用户能按速度效益排序阵型推荐。

**核心约束（用户 2026-08-10 明确）**：速度效果必须建模三层缩放——装备等级、阵型效果、激活专长——它们直接乘在速度数值上。详见 `docs/research/gameplay/speed-scaling-requirements.md`。

## 范围

- `scripts/data/`：build 期从 champion-details 提取速度效果（含三层缩放元数据）→ 嵌入 hero-abilities.json `speedProfile`
- `src/domain/abilities/abilityModel.ts`：`HeroAbilityProfile` 加 `speedProfile` 可选字段
- `src/domain/planner/speedScoring.ts`：速度计算纯函数 + 三层缩放（新建）
- `src/domain/planner/steadyStateScoring.ts`：`ScoringMode` 扩展 + `scoreTeamSpeed` 分支
- `src/domain/planner/computationMode.ts`：`OBJECTIVE_DIMENSIONS` + `compositeGain` 适配
- `src/pages/planner/PlannerScoringMode.tsx`：加 team-speed 选项
- `src/pages/planner/PlannerSpeedAssumptions.tsx`：装备等级/阵型参数调节控件（新建）
- 调用链接线：`recommendationEngine.ts` / `PlannerPage` / `PlannerResultCard`

## 机制分类与建模方案

11 类速度效果按可否静态求值分两组：

### 可静态计算（7 类，类型 2-7、9-10）

| 类别 | effect_string 模式 | 聚合公式 | 英雄 |
|---|---|---|---|
| questProgress（任务） | `chance_multiply_*_quest_rewards,<chance>,<mult>[,<tag>]` | `Π(1+chance/100×(mult−1))` | Havilar/Melf/Virgil/Dynaheir |
| questProgress（任务） | `chance_reduce_quest_requirement,<chance>,<amount>` | `1/(1−Σ(chance/100×amount/100))` | BBEG/Nahara |
| questProgress（任务） | `buff_resolution_chance,<chance>` + `buff_resolution_amount,<amount>` | 同上（Sentry 二段式） | Sentry |
| questProgress（任务） | `hewmaan_fellow_humans,0` | 基础倍率（handler，需特殊提取） | Hew Maan |
| spawnSpeed（刷新） | `increase_monster_spawn_time_mult,<value>` | `1+Σ(value/100)` | Deekin/Widdle/Melf |
| extraEnemies（额外怪） | `spawn_additional_monsters,<chance>` | `1+Σ(chance/100)` | Ezmerelda/Dynaheir/Farideh/Hank |
| extraEnemies（额外怪） | `minsc_boastful,<chance1>,<chance2>` | `1+chance1/100+chance2/100×2` | Minsc |
| timeScale（加速） | `time_scale_when_not_attacked,<value>,<threshold>` | `min(1+Σ(value/100), 10)` | Shandie |
| transitionSpeedup（转换） | `area_transition_time_scale,<value>` | `min(1+Σ(value/100), 5)` | Diana |
| simultaneousSpawn（同步） | `simultaneous_monster_spawn_chance_mult,0` | 二值（present=固定加成） | Vi |
| preSpawn（预刷新） | `uggie_handler,100` [+ `uggie_attack_handler,1`] | 二值（present=固定加成） | Lark/Anson/Tess/Baldric/Cazrin |

阵型级总速度因子 = 各类别因子之积。

### 动态假设值（4 类，类型 1、8、11）—— areaSkip 类别 + 默认值

| 类别 | 英雄 | 原因 | 默认值 |
|---|---|---|---|
| areaSkip（跳层） | Briv | 依赖跨重置冲刺堆叠 | 25%（`briv_unnatural_haste` 基础概率） |
| conditionalCompletion（条件过关） | Lae'zel | 触发频率依赖 DPS/刷新 | 18%（保守估计） |
| conditionalCompletion（条件过关） | Halsin | 大招触发 | 11%（保守估计） |
| initialRush（初期冲层） | Thellora | 跳层数依赖 favor | 15%（保守估计，对 50 层刷图等效） |

areaSkip 因子 = 1 + Σ(value/100)，与其他类别乘法叠加。默认值可通过 `dynamicSpeedOverrides` 入参覆盖，UI 可调。取值口径详见架构文档 §取值口径。

## 阶段 Checklist

- [x] **阶段 A**: 领域类型 + 速度计算纯函数（TDD） —— ✅ 28 个单测覆盖 7 类别 + 组合公式 + 装备缩放
- [x] **阶段 B**: build 期速度效果提取脚本 —— ✅ 18 英雄有 base speedProfile + 4 英雄有 spec 速度效果
- [x] **阶段 C**: 三层缩放基建（装备 buff_upgrade + 专精注入） —— ✅ 装备缩放复用 `EquipmentBuff[]` 单一出口，专精复用 `applySpecializationsToProfile` 单一出口
- [x] **阶段 D**: ScoringMode 扩展 + scoreTeamSpeed 分支 + computationMode 适配 —— ✅ scoreFormation('team-speed') 产出 speedMultiplier
- [x] **阶段 E**: UI 接线 + 结果展示 + 集成测试 —— ✅ speedBreakdown（类别因子+按英雄贡献）+ 动态英雄默认值 + PlannerSpeedBreakdown 组件 + team-speed 叙事 + 集成测试
- [x] **阶段 F**: 阵型效果实现 + 动态英雄默认值 —— ✅ Hew Maan other_human_bonuses 查表（applyFormationSpeedEffects）+ areaSkip 类别 + DYNAMIC_SPEED_DEFAULTS + 取值口径冻结

## 验收

- [ ] 23 名速度英雄全部有 speedProfile（含 effect 列表 + speedGain）
- [ ] 非速度英雄 speedProfile 为 undefined
- [ ] scoreFormation('team-speed') 产出 objectiveValue = speedMultiplier（number）
- [ ] Briv/Lae'zel/Halsin/Thellora 动态效果进 warnings 不进计算
- [ ] UI 新增「速度」推荐模式按钮，选中后推荐结果按速度排序
- [ ] 全量测试通过 + build clean

## 落地后

- specs/ 更新点：
  - `simulator.md`：评估维度表加 speed 行（标注 team-speed 独立模式，不进 carryDps）
  - `architecture.md`：三层架构表中加 speed scoring 路径
- 本 change 状态 → 已落地 → 移 `archives/plans/`
- 需求 `2026-08-planner-speed-dimension.md` 加终态移 `archives/requirements/`
- **specs/ 永不引用本 plan**
