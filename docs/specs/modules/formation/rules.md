# 阵型编辑：规则与边界

## 硬规则

- 同一 `seat` 只能出现一名英雄。
- 变体英雄白名单（`only_allow_crusaders`）：候选池按 `allowedHeroIds`（id 白名单）和 `allowedTagExpression`（标签表达式，DNF: OR of ANDs）过滤。标签表达式支持 `^`（AND）、`!`（取反）、`|`（OR）和括号组合。
- 变体属性门槛（restriction 文本解析）：候选池按 `attributeRequirements`（CON/INT/CHA/STR/DEX/WIS score of N or higher/lower）过滤。英雄 abilityScores 缺失某属性时保守视为不满足。
- 阵型排位提示：布局按官方 `column` 生成 `laneHints`；最大列为前排、最小列为后排、中间列为中排。
- 强制英雄（`force_use_heroes`）：`forcedHeroIds` 必须包含在阵型中，豁免白名单和属性门槛过滤。
- 规则下沉到规则层，不硬编码在 JSX 里。

## 与方案存档模块的衔接

- 阵型页：当前工作草稿、最近草稿的保存与恢复。
- 方案存档页：已命名、可复用、可管理的方案库。
- 衔接数据：`layoutId`、`placements`、已占用 `seat`、用户备注、场景标签、`scenarioRef`。
- 不只存自由文本标签；恢复和规则校验依赖正式场景身份。

## 边界（不做）

- 真实战役布局全量核实
- 拖拽或动画优先的交互重构
- 技能覆盖、DPS 或 BUD 计算
- 自动站位优化
