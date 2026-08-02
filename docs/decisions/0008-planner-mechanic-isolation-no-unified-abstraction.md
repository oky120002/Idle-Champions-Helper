# 0008. 加成机制按自然形态隔离（不引入统一接口/注册表抽象）

**Status**: Accepted
**Decided**: 2026-07-30

## 背景

planner 的加成机制处理横跨四个阶段：build 期 effect_string 解析、runtime signal→乘数、scoring 维度聚合、加成来源装配。重构计划曾设想每个阶段引入统一抽象（EffectResolver 派发表 / MechanicResolver 注册表 / DimensionFactor 接口 / BonusProvider 接口）。实际重构中四处里的三处（模式 2/3/4）都评估并否决了统一接口——这是同一个横切决策被重复触发，钉死它以避免每次触相关代码都重新论证。

## 决策

四模式按各自自然形态落地：一个机制 / provider / 聚合因子一个文件 + 一个单测，结构同构（`{识别, 匹配, 解析/贡献}` + 派发 + 单测）但不共享跨形态接口。**不引入**统一 `DimensionFactor` / `MechanicResolver` / `BonusProvider` 接口或策略注册表。统一抽象的升级触发线沿用 `dps-mechanic-abstraction.md` 阈值 4（通用机制总数 >10 才把字段分支升级为策略注册表）。

## 后果

- 正面：每个形态直接表达，接口不掩盖差异；文件少、依赖单向、边界由 `hermeticBoundary.test.ts` 守护；新机制加文件 + 登记派发表一行即可。
- 代价：四模式结构同构却不共享接口，读者需分别理解各形态（由 `mechanic-isolation.md` 的同构说明统一引导）。
- 风险：机制数增长到 >10 时需手动升级为注册表；由 `championReferenceVerification.test.ts` 断言注册表机制数 ≤10 守护，触线即提醒。

## 替代方案

- **DimensionFactor 统一接口**（damage/gold/crit/vuln/survival 各一 factor 文件）：不选——damage/survival/gold 是 pool 聚合的应用（无独立逻辑），crit/vuln 是公式因子，两类形状根本不同；强塞统一接口会掩盖差异，且 contribution 跨维度拆解使接口泄漏。
- **MechanicResolver 注册表**（每机制一个 resolver 对象 + dispatch）：不选——当前 7 机制 < `dps-mechanic-abstraction.md` 阈值 4 的 >10 升级线，字段分支分发已足够可测，注册表对当前规模属过度工程。
- **BonusProvider 统一接口**（patron/blessing/equipment/feat/externalHeroDps 各一 provider）：不选——五个 provider 输出形态根本不同（patron/blessing→`number`、equipment→`Map<heroId, number>`、externalHeroDps→`HeroDpsContribution[]`），且两条消费路径（前三者走 ScoringInput 字段、feat/专精走 profile-patch）单一接口跨不了。

## 关联

- 依据：`specs/modules/planner/dps-mechanic-abstraction.md`（阈值 4：>10 升级注册表）
- 落地：`specs/modules/planner/mechanic-isolation.md`（四模式实现状态 + 各模式偏差）
