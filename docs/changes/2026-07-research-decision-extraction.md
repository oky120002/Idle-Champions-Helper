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

- `research/data/champion-detail-fields/advanced-fields-and-contract.md`（R+F）
- `research/data/champion-detail-fields/contract-and-page-shape.md`（R+F）
- `research/data/formation-layout/dedupe-and-repo-impact.md`（R+P）
- `research/data/game-data-source/implementation-and-risks.md`（R+P）
- `research/data/game-data-source/source-decision.md`（R+P）
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

- [ ] champion-detail-fields（2 篇）—— 验证：字段事实留 research，详情合同进 specs/modules
- [ ] formation-layout/dedupe-and-repo-impact —— 验证：去重事实留 research，消费建议进 changes
- [ ] game-data-source（2 篇）—— 验证：source-decision 的决策抽 ADR
- [ ] language-id-7/data-contract —— 验证：链路事实留 research，合同进 specs
- [ ] pet-catalog/acquisition-and-implementation —— 验证：获取字段留 research，实现进 changes
- [ ] portrait-asset/repo-integration —— 验证：链路事实留 research，接入进 changes
- [ ] skin-illustration（3 篇）—— 验证：implementation 已部分拆（decisions/0001），剩余补
- [ ] static-data-storage-research —— 验证：存储事实留 research，分层决策抽 ADR
- [ ] visual-asset/size-and-storage —— 验证：尺寸事实留 research，存储边界进 specs

## 验收

`research/` 下文档不含「## 决策 / ## 推荐 / ## 结论」段落；所有多方案决策有对应 ADR；`grep -rn "## 决策\|## 推荐\|## 结论" docs/research/` 零命中（或仅事实性结论）。

## 落地后

- `research/README.md` 拆分规则已就位
- 本 change Status → Landed → `archive/changes/`
