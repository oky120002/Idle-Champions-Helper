# planner warning 国际化：领域层中文诊断文本下沉为双语结构

**状态**: 已落地
**类型**: change
**范围**: planner
**创建日期**: 2026-08-13

## 目标

消除 `src/domain/planner/` 领域层硬编码中文 warning（signalMultiplier 警告 + recommendationEngine 违规信息 + steadyStateScoring 速度假设），改为返回 `{zh, en}` 双语结构，由 UI 层 `useI18n().t()` 翻译，与既有 `PlannerNarrativeLine`（`plannerNarrative.ts`）约定一致。

## 范围

领域层中文诊断文本共 17 处（3 个文件）：

- `signalMultiplier.ts`：8 处 `{ ok: false; warning: string }`
- `recommendationEngine.ts`：8 处（`formatLegalityViolation` 2 处、可造伤害位置 2 处、限制警告 3 处、推进层数不足 1 处）
- `steadyStateScoring.ts`：1 处（动态速度默认假设）

类型链 `string[]` → `{zh, en}[]`：`PoolAggregateResult` / `ScoringResult` / `BeamSearchResult` / `PlannerResult` 的 `warnings` + `resolveSignalMultiplier` 返回类型。

数据源边界：`scenarioWarnings`（数据管线中文）、`snapshot.warnings`（user-sync 英文）保持 `string`，汇入 `PlannerResult.warnings` 时包装成 `{zh, en}`；两者真正的双语翻译属数据管线 / user-sync 层，另立 todo。

## 阶段 Checklist

- [x] 阶段 1: 类型地基——`domain/types/common.ts` 定义 `LocalizedUiText = { zh; en }`；warnings 四处类型签名 + `resolveSignalMultiplier` 返回类型改为 `{zh, en}`；`new Set` 去重改按 `zh` 结构化去重 helper —— 验证方式：`tsc` 编译通过
- [x] 阶段 2: 领域层 17 处中文 → `{zh, en}` 双语 + 数据源 string 边界包装 helper —— 验证方式：相关单测更新后通过
- [x] 阶段 3: UI 2 处渲染用 `t()` + 测试断言更新 + 全量回归 —— 验证方式：`vitest` 全绿 + `lint` + `typecheck`

## 验收

- `src/domain/planner/` 无残留硬编码中文 warning 字符串（`rg` 中文 + `warning` 交叉验证）
- `warnings` 类型链全部 `{zh, en}`，UI 经 `t()` 翻译，英文 locale 下 warning 显示英文
- 全量测试 + lint + typecheck 通过

## 落地后

- specs/ 更新点：
  - `docs/specs/modules/planner/architecture.md`：补充 warning 为 `{zh, en}` 双语结构的说明（若该文档已涉及 warning 契约）
- 本 change 状态 → 已落地 → 移 `archives/plans/`
- **specs/ 永不引用本计划**（规范描述最终态，不描述交付过程）
