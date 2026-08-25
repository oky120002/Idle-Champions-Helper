# planner 数据、计算与隐私需求

## 数据需求

### 公共基座数据

现有 `npm run data:official` 抓取并生成：

- `champions.json`
- `champion-details/<id>.json`
- `variants.json`
- `formations.json`
- `enums.json`
- 头像、立绘、动画、魔宠等资源

planner 用 `npm run data:signal-coverage` 审计 definitions 中对模拟器有用但尚未归一化的字段，不假设数据已经齐全。核实结果见 `docs/research/data/planner/signal-coverage.md`。

### 私人用户快照

`UserProfileSnapshot` 至少包含：

- snapshot id、schema version、updatedAt、source summary
- owned champions
- equipment / loot / rarity / item level
- feats
- specializations
- legendary effects
- favor / blessing / campaign progress
- imported formation saves
- warnings

传奇效果评分支持存档驱动和无存档假设两种输入：已锻造槽位或假设目录条目按等级线性缩放，普通全队加成、按英雄条件加成和按阵型人数叠加的效果分别进入统一伤害池；缺少英雄归属、目录或效果无法解析时保守跳过。planner 在当前推荐阵型下按同一目录和阵型标签输出稳定的锻造优先级 TOP 5，不处理重铸概率、神恩管理或传奇专长。

## 计算需求

### GameNumber

底层使用大数库，业务只接触 `GameNumber` wrapper。支持 parse、format、multiply、divide、pow、log10、compare、sort，以及带阈值的 add。显示默认游戏记数法。

### 英雄等级

英雄等级默认取自存档 `ownedHeroes.level`；未拥有英雄按 level 1。支持金币预算/全局等级两种外部覆盖（UI 金币/等级互斥控件 → worker 换算 → `heroLevelOverride` + `goldBudget` 入参），覆盖等级同时驱动专精门控。详见 `simulator.md`。

### 评估

只计算可预计算的稳态加成：global / hero DPS multiplier、adjacent support、tagged champion multiplier、位置关系、crit、vulnerability、gold（team-gold 模式）、health（survival 约束）。各维度公式与聚合方式见 `simulator.md`。

未知 effect、事件变量、随机触发和复杂条件进入 warnings。

## 隐私需求

- 生产凭证不能发到本项目后端。
- 不自动保存凭证。
- 不自动刷新私人快照。
- 私人数据只写 IndexedDB。
- 开发私有快照只写 `tmp/private-user-data/`。
- 必须提供 `npm run privacy:scan`，阻止真实凭证和私人路径进入提交或构建。

验收标准见 `acceptance.md`。
