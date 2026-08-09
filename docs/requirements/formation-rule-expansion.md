# 阵型编辑规则扩展

**优先级**：待评

## 是什么

阵型编辑硬规则从单一 seat 冲突扩展到更完整的限制集合：

1. **禁用槽位**（规则定义 + 验证，禁用槽位不被填充）
2. **冒险 / 变体绑定布局**（场景 → 布局映射，场景切换时布局正确切换）
3. ✅ **前后排提示**（2026-08-07 部分落地）：空槽位提示从「坐标 row-column」改为「第 N 排」语义标注（`FormationBoardGrid.tsx`）；完整前/中/后排方向标注依赖 `laneHints` 数据填充（类型已定义，161 阵型全空），待数据管线补建
4. ✅ **标签资格限制**（2026-08-08 落地）：标签表达式从扁平 `string[]`（仅 OR）升级为 DNF 结构 `TagClause[]`（OR of ANDs），递归解析 `^`（AND）、`!`（取反）、`|`（OR）和嵌套括号（分配律展开）；复合对齐标记（`lawful_good` 等 9 种）展开为对齐轴 AND。121 个变体受影响。属性门槛从 restriction 文本结构化提取（白名单——仅使用门槛语句），102 个变体受影响。planner 候选过滤和评估 warning 均已消费。证据：`src/domain/types/formation.ts`（`TagClause`/`TagExpression`/`AttributeRequirement`）、`scripts/data/normalize-adventures.ts`（`parseTagExpression`）、`scripts/data/restrictions-parser.ts`（`parseAttributeRequirements`）、`src/domain/planner/recommendationEngine.ts`（`matchesTagExpression`/`meetsAttributeRequirements`）

## 为何暂缓

标签资格限制已落地。剩余项（禁用槽位、变体绑定布局、laneHints 数据补建）各自需独立设计验证，按价值排序逐步推进。

## 关联

- `docs/specs/modules/formation/rules.md`（当前阵型规则）
