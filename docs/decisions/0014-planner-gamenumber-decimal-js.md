# 0014. GameNumber 用 decimal.js

**Status**: Accepted
**Decided**: 2026-07-30

## 背景

planner 伤害量级远超 JS number 上限：游戏后期 carryDps 可达 `1e1000` 量级（测试覆盖），远超 `Number.MAX_VALUE`（≈1.8e308）。游戏数字是标准科学计数法（`8.69e78`、`56e318`，尾数 `e` 指数），raw definitions 实测最大 `6e906`。若用 JS number 承载最终伤害会溢出。需选大数实现。本决策早于 ADR 约定，现回填。

## 决策

引入 `decimal.js`（三方库，MikeMcl 维护，jsdom 等主流库依赖），只在 `src/domain/simulator/gameNumber.ts` 直接 import；业务代码统一用 wrapper（`parseGameNumber`/`formatGameNumber`/`multiply`/`divide`/`power`/`add`/`compare`/`log10`/`sort`）。性能策略：

- 排序与 beam search 用 wrapper compare（`.gt`/`.lt`，实测 ~2000 万 ops/s）；`log10GameNumber` 走 decimal.js 高精度对数较慢（~37µs/op，慢 `.gt` 约 1000×），仅用于离线校准偏差，生产热路径零调用，不构造巨型十进制字符串。
- 加法用集中阈值（初始 15 个数量级；小项不影响 3 位游戏显示时直接忽略）。
- 显示层默认 `1.50e92` 风格；核心数值类型覆盖超过 `Number.MAX_VALUE` 的游戏数值范围。

## 后果

- 正面：任意精度（默认 20 位有效数字，远高于 double）、主流成熟库（文档/生态/长期维护）、wrapper 隔离实现可换；log10/阈值规避大数运算热点。
- 代价：大数运算比原生 number 慢（已用 log10 比较 + 加法阈值缓解）。
- 风险：业务代码绕过 wrapper 直接 import decimal.js（「只 gameNumber.ts 直接 import」约定 + review 守护）。当前 `monsterStats`/`baseDps`/`survivalCalculation`/`steadyStateScoring`/`goldObjective`/`recommendationEngine` 共 6 处仍直接 import，收敛到 wrapper 为独立后续任务。

## 替代方案

- **JS number**：不选——上限 `Number.MAX_VALUE`，游戏后期伤害溢出。
- **break_eternity.js**：未选——专为 incremental game 的 tetration 量级（`10^^1e308`）设计，能力本项目永远用不到（要 level 到 `10^309` 才进入 layer 2，任何游戏都不可能）；mantissa 仅 JS double 精度（~15-17 位有效数字）；小众生态。decimal.js 范围 `10^(9e15)` 对项目实测最大 `6e906` 富余 10¹³ 倍，且任意精度 + 主流维护更合适。

## 关联

- 落地：`specs/modules/planner/simulator.md`（GameNumber）、`src/domain/simulator/gameNumber.ts`
