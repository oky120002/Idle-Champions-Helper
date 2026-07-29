# 0014. GameNumber 用 break_eternity.js

**Status**: Accepted
**Decided**: 2026-07-30（回填）

## 背景

planner 伤害量级远超 JS number 上限：idle game 后期 carryDps 可达 `1e1000` 量级（测试覆盖），远超 `Number.MAX_VALUE`（≈1.8e308）。若用 JS number 承载最终伤害会溢出。需选大数实现。本决策早于 ADR 约定，现回填。

## 决策

引入 `break_eternity.js`，只在 `src/domain/simulator/gameNumber.ts` 直接 import；业务代码统一用 wrapper（`parseGameNumber`/`formatGameNumber`/`multiply`/`divide`/`power`/`add`/`compare`/`log10`/`sort`）。性能策略：

- 排序与 beam search 优先比较 `log10` 或 wrapper compare，不构造巨型十进制字符串。
- 加法用集中阈值（初始 15 个数量级；小项不影响 3 位游戏显示时直接忽略）。
- 显示层默认 `1.50e92` 风格；核心数值类型覆盖超过 `Number.MAX_VALUE` 的游戏数值范围。

## 后果

- 正面：支持游戏全量级；wrapper 隔离实现，可换；log10/阈值规避大数运算热点。
- 代价：大数运算比原生 number 慢（已用 log10 比较 + 加法阈值缓解）。
- 风险：业务代码绕过 wrapper 直接 import break_eternity（由「只 gameNumber.ts 直接 import」约定 + review 守护）。

## 替代方案

- **JS number**：不选——上限 `Number.MAX_VALUE`，游戏后期伤害溢出。
- **decimal.js / bignumber.js**：通用大数库，未选——`break_eternity.js` 专为 idle game 超大数场景设计（idle/incremental game 社区标准），与 planner 量级需求匹配；选型时优先其 idle game 适用性与比较/排序开销可控。
  > 选型对比的具体依据文档较薄；若当初有 decimal.js 量级不足的实测证据，可补充于此。

## 关联

- 落地：`specs/modules/planner/simulator.md`（GameNumber）、`src/domain/simulator/gameNumber.ts`
