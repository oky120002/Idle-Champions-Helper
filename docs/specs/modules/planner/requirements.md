# planner 数据、计算与隐私需求

## 数据需求

### 公共基座数据

现有 `npm run data:official` 抓取并生成：

- `champions.json`
- `champion-details/<id>.json`
- `variants.json`
- `formations.json`
- `enums.json`
- 头像、立绘、动画、宠物等资源

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

## 计算需求

### GameNumber

底层使用大数库，业务只接触 `GameNumber` wrapper。支持 parse、format、multiply、divide、pow、log10、compare、sort，以及带阈值的 add。显示默认游戏记数法。

### 英雄等级

英雄等级取自存档 `ownedHeroes.level`；未拥有英雄（all-hypothetical 候选）按 level 1（`levelCurve = rate^1`，保留英雄间增长率差异但无法反映高等级 scale）。等级基线估算（cost curve + 金币预算 → 可负担等级 + below-baseline 标记）模块已实现但未接入评分链路，见 `simulator.md`。

### 评分

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
