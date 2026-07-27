# DPS 机制抽象阈值

约束 DPS 机制处理不针对单个英雄写死、不过度抽象。四条阈值**强制执行**，由 `championReferenceVerification.test.ts` 守护。

## 四条阈值

1. **≥2 抽象**：同一机制（`dps-mechanics.md` 注册表 id）被 ≥2 个英雄使用 → 必须走通用代码路径（`STACK_COUNT_RESOLVERS` / `resolveSignalMultiplier` 分支 / pool 聚合），禁止英雄特化分支。
2. **孤儿特化 + 预警**：机制仅 1 个英雄使用（孤儿）→ 可特化处理，但孤儿预警测试标记并输出 warning 表格，提示确认是否真独一无二。
3. **孤儿→≥2 立刻抽象**：孤儿机制后续变成 ≥2 英雄使用 → 立刻去掉特化、走通用路径，去掉孤儿标记。
4. **>10 升级策略注册表**：通用机制总数 >10 → 把 `resolveSignalMultiplier` 的「按字段分支」分发重构为策略注册表（每机制一个 resolver 对象 + 注册表），不可拖延。

阈值 1/3 基于 `public/data/v1/hero-abilities.json` 全量 signal 扫描的**实际使用英雄数**（非 reference 覆盖数——reference 只记被校准过的英雄，通用机制实际多英雄用，不能因 reference 少误判孤儿）。

## 机制 id 三处一致

每个机制 id 必须三处存在且一致，任一缺失即 fail：

- `placementFit.ts` 分支注释 `// 机制: <id>`
- `references/*ReferenceData.ts` 的 `mechanicIds`
- `dps-mechanics.md` 注册表

## 当前规模

注册表 7 个机制（见 `dps-mechanics.md`），未触发 >10 升级线。当前 `resolveSignalMultiplier` 是「按字段分支」分发，每分支注释标机制 id；不引入工厂/职责链/策略注册表（对当前规模属过度工程）。
