# planner 数据源核实入口

- 作用：planner 消费的关键数据源（怪物 stats、patron-perks、restrictions、equipment、ability_defines）的字段结构、公式与已知缺口确认事实。
- 来源：raw `definitions-2026-04-13T02-00-23.309Z.json`（`game_rule_defines` / `monster_defines` / `patron_perk_defines` 等）。
- 格式特性见 `docs/research/data/game-data-source/format-quirks.md`。

---

## 按问题读取

- 怪物生命、伤害、区域曲线与绝对值校准：`monster-and-area-scaling.md`
- Patron 特权、祝福数据缺口与效果结构：`patron-perks-and-blessings.md`
- 冒险限制文本、结构化规则与人工覆盖：`scenario-restrictions.md`
- 装备曲线、掉落效果与终极技能：`equipment-and-abilities.md`
- BUD 实测校准：`bud-calibration.md`
- 加成升级包装效果核实：`buff-upgrade-wrappers.md`
- 推荐信号覆盖率：`signal-coverage.md`
- 加成来源全盘点与叠加正确性（A1）：`damage-bonus-sources.md`
- 加成机制全量盘点（1020 effectKeys 归纳）：`damage-mechanic-inventory.md`
