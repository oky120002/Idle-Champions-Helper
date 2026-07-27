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

### 等级基线

默认基线是金币预算 + 最后专精：

- 从英雄 upgrades 中提取最高专精所需等级。
- 根据 cost curve 和目标金币预算估算可负担等级。
- 可负担等级低于最后专精时标记 `below-baseline`。
- 固定 1 级只作为调试模式。
- 不提供默认 100 级模式。

### 评分

只计算可预计算的稳态 DPS 类加成：global DPS、hero DPS、adjacent support、tagged champion multiplier、可识别的 positional hints。各维度公式与聚合方式见 `simulator.md`。

未知 effect、事件变量、随机触发和复杂条件进入 warnings。

## 隐私需求

- 生产凭证不能发到本项目后端。
- 不自动保存凭证。
- 不自动刷新私人快照。
- 私人数据只写 IndexedDB。
- 开发私有快照只写 `tmp/private-user-data/`。
- 必须提供 `npm run privacy:scan`，阻止真实凭证和私人路径进入提交或构建。

验收标准见 `acceptance.md`。
