# abilities 领域模块入口

- 作用：统一英雄能力表达（HeroAbilityProfile / HeroAbilitySignal），hero-agnostic，供推算引擎与数据构建共同消费。
- 边界：本目录不放推算算法、页面 JSX、浏览器状态或文案。推算引擎在 `src/domain/` 下专属目录消费此处类型；数据构建在 `scripts/data/`。

## 先读顺序

- 类型与 resolver 先读 `abilityModel.ts`。
- signal qualifier / per_hero_expr 受控解析读 `signalSemantics.ts`。
- 英雄布尔谓词（`parseHeroPredicate` / `evalHeroPredicate`）读 `heroPredicate.ts`。

## 不变量

- 本目录禁止出现推算引擎前缀：通用能力符号去前缀，推算引擎专属符号留在推算引擎目录。
- `HeroAbilityProfile` 是算法-英雄唯一握手点；新增英雄能力字段在此声明，下游统一消费。
- signal 的 `unit` 字段默认按 `percent` 处理；`flat`/`boolean` 由加成聚合层按 dimension 分别处理。
- `DIMENSION_BY_KIND` 是 kind→dimension 单一映射；新 kind 必须同时登记 dimension。

## 其他文件

- `equipmentBuffSignals.ts` — 装备 buff_upgrade 运行时信号注入（wrapper，owned-aware）。
- `featSignals.ts` — feat（专长）运行时信号注入。
- `specializationSignals.ts` — 专精运行时信号注入。
- `heroTargetingRelation.ts` — filter-like target 类型集合与显式 target 分类。
- `poolScope.ts` — 加成归属 pool（global / hero）。

## 依赖方向

- `abilities/` → `domain/types`（LocalizedText / AbilityScoreKey / DataCollection）。
- 推算引擎 → `abilities/`（单向）。
- `scripts/data/` → `abilities/`（数据构建读取 resolver 与 signal semantics）。
