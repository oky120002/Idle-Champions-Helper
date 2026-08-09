# DPS 机制抽象阈值

约束 DPS 机制处理不针对单个英雄写死、不过度抽象。四条阈值与机制 id 三处一致的**自动化守护现状**：

- **阈值 4（>10 升级策略注册表）**：`championReferenceVerification.test.ts` 断言注册表机制数 ≤ 10。
- **三处一致**：`championReferenceVerification.test.ts` 断言 reference `mechanicIds` ⊆ 注册表、注册表每个 id 在代码 `// 机制: <id>` 注释存在（代码注释 leg）。
- **阈值 1（≥2→通用路径）**：结构性保证——评估路径（`placementFit.ts` resolveSignalMultiplier / STACK_COUNT_RESOLVERS / pool 聚合，`effect-resolvers/` effect→signal 派生）无英雄 id 特化分支，所有机制走通用字段分发。
- **阈值 2/3（孤儿预警 / 孤儿→≥2 立刻抽象）**：设计准则。reference 当前仅蔚(95)一英雄，孤儿扫描待 reference 增长后落地；新增 reference 时人工确认机制通用性。

## 四条阈值

> 以下为四条阈值的**设计语义**；自动化守护现状见本文档开头——阈值 4 + 三处一致 + 阈值 1（结构性）已落地，阈值 2/3（孤儿扫描）未自动化。

1. **≥2 抽象**：同一机制（`dps-mechanics.md` 注册表 id）被 ≥2 个英雄使用 → 必须走通用代码路径（`STACK_COUNT_RESOLVERS` / `resolveSignalMultiplier` 分支 / pool 聚合），禁止英雄特化分支。
2. **孤儿特化 + 预警**：机制仅 1 个英雄使用（孤儿）→ 可特化处理，但须预警确认是否真独一无二（设计准则；孤儿扫描测试未自动化，当前新增 reference 时人工确认——见守护现状）。
3. **孤儿→≥2 立刻抽象**：孤儿机制后续变成 ≥2 英雄使用 → 立刻去掉特化、走通用路径，去掉孤儿标记。
4. **>10 升级策略注册表**：通用机制总数 >10 → 把 `resolveSignalMultiplier` 的「按字段分支」分发重构为策略注册表（每机制一个 resolver 对象 + 注册表），不可拖延。

阈值 1 由「评估路径无英雄 id 特化分支」**结构性保证**（非扫描，见守护现状）；阈值 3 的孤儿→≥2 判定理论上基于 `public/data/v1/hero-abilities.json` 全量 signal 扫描的**实际使用英雄数**（非 reference 覆盖数——reference 只记被校准过的英雄，通用机制实际多英雄用，不能因 reference 少误判孤儿），但孤儿扫描尚未自动化。

## 机制 id 三处一致

每个机制 id 必须三处存在且一致，由 `championReferenceVerification.test.ts` 守护，任一缺失即 fail：

- `placementFit.ts` / `mechanics/`（signalMultiplier.ts + stackCountResolver.ts）/ `effect-helpers.ts` 分支注释 `// 机制: <id>`（代码注释 leg：注册表每个 id 必须在代码注释出现；`championReferenceVerification.test.ts` 扫描这三个位置）
- `references/*ReferenceData.ts` 的 `mechanicIds`（reference leg：reference 的 id 必须在注册表）
- `dps-mechanics.md` 注册表（单一来源）

## 当前规模

注册表 7 个机制（见 `dps-mechanics.md`），未触发 >10 升级线。当前 `resolveSignalMultiplier` 是「按字段分支」分发，每分支注释标机制 id；不引入工厂/职责链/策略注册表（对当前规模属过度工程）。
