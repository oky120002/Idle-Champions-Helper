# research 决策抽取

**Status**: Draft
**Type**: change
**Scope**: system
**Created**: 2026-07-27

## 目标

把 `research/data/` 里 13 篇「调研事实 + 决策建议」混合文档拆分，让 `research/` 只留事实，决策进 `decisions/`，建议进 `changes/`。

## 背景

文档结构重构（阶段 1-7）已完成主体。阶段 4 已拆 4 篇 modules 的 H(F+P)。剩余 13 篇 H(R+P) 在 `research/data/`，是「调研 + 决策」混合的最大边界模糊源。本 change 追踪其渐进拆分。

## 待拆清单（13 篇）

- `research/data/champion-detail-fields/advanced-fields.md`（R+F，原 advanced-fields-and-contract，合同进 specs）
- champion-detail-fields/contract-and-page-shape（R+F，已删除：合同已在 specs，无独立事实）
- `research/data/formation-layout/dedupe-and-repo-impact.md`（R+P）
- `research/data/game-data-source/implementation-and-risks.md`（R+P）
- `research/data/game-data-source/source-facts.md`（R+P，原 source-decision）
- `research/data/language-id-7/data-contract.md`（R+F）
- `research/data/pet-catalog/acquisition-and-implementation.md`（R+P）
- `research/data/portrait-asset/repo-integration.md`（R+P）
- `research/data/skin-illustration/implementation.md`（R+F）
- `research/data/skin-illustration/pipeline-validation.md`（R+P）
- `research/data/skin-illustration/problem.md`（R+A）
- `research/data/static-data-storage-research.md`（R+P）
- `research/data/visual-asset/size-and-storage.md`（R+F）

## 拆分规则

每篇三分：

- **事实**（字段 / 格式 / 链路 / 数据）→ 留 `research/`（可改 `-facts.md` 后缀）
- **决策 / 推荐方案**（多方案对比 + 选定）→ `decisions/NNNN-<slug>.md`（Status: Accepted）
- **后续建议**（如有）→ `changes/`

注：只有「多方案对比 + 选定」的才抽 ADR；纯实现建议（无多方案对比）可留 research 或归 changes。

## 阶段 Checklist

- [x] champion-detail-fields（2 篇）—— 验证：字段事实留 research，详情合同进 specs/modules（advanced-fields.md 仅留字段事实，contract-and-page-shape 删除）
- [x] formation-layout/dedupe-and-repo-impact —— 验证：去重事实留 research，消费建议进 changes（布局来源已落地 specs/formation，仅留去重与边界事实）
- [x] game-data-source（2 篇）—— 验证：source-decision 的决策抽 ADR（0002 + 0003，原文件改名 source-facts.md，仅留事实与口径）
- [x] language-id-7/data-contract —— 验证：链路事实留 research，合同进 specs（{original,display} 权威定义在 common.ts，后续待办进 changes）
- [x] pet-catalog/acquisition-and-implementation —— 验证：获取字段留 research，实现进 changes（页面实现已落地 specs/pets，仅留字段与归类事实）
- [x] portrait-asset/repo-integration —— 验证：链路事实留 research，接入进 changes（接入已落地 specs/detail，仅留处理约束与实现记录）
- [x] skin-illustration（3 篇）—— 验证：implementation 已部分拆（decisions/0001），剩余补（动画交付决策补 decisions/0004，后续项进 changes）
- [x] static-data-storage-research —— 验证：存储事实留 research，分层决策抽 ADR（0003）
- [x] visual-asset/size-and-storage —— 验证：尺寸事实留 research，存储边界进 specs（资源合同已在 data-and-build，全量审计进 changes）

## 验收

`research/` 下文档不含「## 决策 / ## 推荐 / ## 结论」段落；所有多方案决策有对应 ADR；`grep -rn "## 决策\|## 推荐\|## 结论" docs/research/` 零命中（或仅事实性结论）。

## 落地后

- `research/README.md` 拆分规则已就位
- 本 change Status → Landed → `archive/changes/`
