# planner 能力扩展

**优先级**：待评

## 是什么

在稳态、可解释推荐保持可靠的前提下，扩展当前无法精确求值或不在结果合同中的 planner 能力：

1. **数值表达式求值器**：统一解析 stack 数量、复合 amount expression 与阵型聚合查询
2. **综合目标**：评估伤害、存活、速度、可获得性与解释复杂度的组合评分
3. **逐步模拟**：覆盖逐区、击杀、时间窗口、动态叠层和主动技能精确窗口
4. **输出扩展**：独立的逐槽位替补与同席位竞争字段
5. **场景扩展**：多队伍、Trials、Time Gate、活动与赛季临时加成投影
6. **手动参数**：金币预算、装备、专长、传奇与专精覆盖控件
7. **未建模加成源补建**：modron（齿轮）/ 成就 / 药水 / gem 等伤害加成来源接入评分；逐类需核定 amount 与生效条件

## 为何暂缓

主体加成（同 key 跨源加法、五通道装备加成、专精注入）已正确建模。上述扩展中，表达式求值器是多数其他扩展的前置基建。未建模加成源暴露为真实正向偏差来源，vulnerability 条件生效 ROI 可能最高（生产 enemyTypes 含种族，数据已具备）。任何新增能力都必须可解释、可回归验证；无法静态求值的效果不得静默进入目标值。

## 关联

- [damage-bonus-sources.md](../research/data/planner/damage-bonus-sources.md)（未建模来源与补建方向）
- [damage-mechanic-inventory.md](../research/data/planner/damage-mechanic-inventory.md)（机制全貌与里程碑）
- `docs/specs/modules/planner/expression-evaluator.md`（表达式求值器当前态）
- [conditional-damage-bonus.md](./conditional-damage-bonus.md)（条件性攻击加成，本提案子项）
