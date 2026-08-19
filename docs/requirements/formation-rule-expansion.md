# 阵型编辑规则扩展

**优先级**：待评

## 是什么

阵型编辑硬规则从单一 seat 冲突扩展到更完整的限制集合：

1. **禁用槽位**（规则定义 + 验证，禁用槽位不被填充）
2. ✅ **冒险 / 变体绑定布局**（已落地）：官方布局按 `applicableContexts` / `sourceContexts` 建立场景索引，变体页面和 planner 按变体 → 冒险 → 战役顺序解析布局
3. ✅ **前中后排提示**（2026-08-19 落地）：数据管线按官方列号生成 `laneHints`（最大列为前排、最小列为后排、中间列为中排），编辑器空槽位显示排位语义；缺失数据时保留行号提示
4. ✅ **标签资格限制**（2026-08-08 落地）：标签表达式从扁平 `string[]`（仅 OR）升级为 DNF 结构 `TagClause[]`（OR of ANDs），递归解析 `^`（AND）、`!`（取反）、`|`（OR）和嵌套括号（分配律展开）；复合对齐标记（`lawful_good` 等 9 种）展开为对齐轴 AND。121 个变体受影响。属性门槛从 restriction 文本结构化提取（白名单——仅使用门槛语句），102 个变体受影响。planner 候选过滤和评估 warning 均已消费。证据：`src/domain/types/formation.ts`（`TagClause`/`TagExpression`/`AttributeRequirement`）、`scripts/data/normalize-adventures.ts`（`parseTagExpression`）、`scripts/data/restrictions-parser.ts`（`parseAttributeRequirements`）、`src/domain/planner/recommendationEngine.ts`（`matchesTagExpression`/`meetsAttributeRequirements`）

## 为何暂缓

标签资格限制和前中后排提示已落地。剩余项（动态禁用槽位、护送具体槽位绑定）缺少可靠的官方槽位数据，需独立设计验证后推进；场景到布局绑定已由 `applicableContexts` / `sourceContexts` 支持。

## 关联

- `docs/specs/modules/formation/rules.md`（当前阵型规则）
