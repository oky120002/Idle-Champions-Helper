# 文档全量审计与清理

**Status**: Landed
**Type**: milestone
**Scope**: system
**Created**: 2026-08-06

## 目标

对仓库全部 md 文档做一次深度审计与清理：消除迁移叙事、纠正代码-文档偏差、修复治理违规、处置过时变更文档，使文档体系成为当前态的准确镜像，为后续开发扫清认知噪音。

## 范围

docs/ 下约 110 个 md、根目录 4 个（AGENTS/README/TODO + .impeccable.md）、src/ 下约 13 个 co-located README，合计约 127 个文件。

## 阶段 Checklist

### 阶段 0：计划与分组

- [x] 盘点文档全貌、问题画像 —— 验证：本文件
- [x] 落计划到 changes/ —— 验证：本文件已创建

### 阶段 1：变更文档处置

- [x] 7 个 Draft change 核对——全部仍在 Draft（功能未完整实现，保留为活跃路线图）
- [x] 2 个 Accepted lint-fix plan 标 Landed 并移入 archives/plans/ —— 验证：eslint 0 违规

### 阶段 2：分区域并行深度审计（7 子智能体）

- [x] **Group A: planner specs**（15 文件，8 改）—— 修方法名/迁移叙事/commit hash/轮次引用
- [x] **Group B: champions + formation specs**（18 文件，4 改）—— 删虚构数据输入/类型/文档引用
- [x] **Group C: 其余模块 specs**（18 文件，3 改）—— 修测试路径/页面映射/组件使用位置
- [x] **Group D: guidelines + product specs**（16 文件，9 改）—— 修 CSS 路径/日期戳/gate 描述/虚构引用
- [x] **Group E: research/**（40 文件，21 改）—— 删迁移叙事/决策段/commit hash，修数据计数
- [x] **Group G: decisions/**（17 ADR，3 改）—— 标题格式统一/颜色描述修正/违规计数修正
- [x] **Group H: src/ READMEs**（13 文件，10 改）—— 补全文件覆盖/删迁移叙事
- [x] **主智能体**：runbooks（无需改）+ 根文档（.impeccable/changes-README/future-features 迁移叙事清理）+ planner README 断链修复

### 阶段 3：一致性收口

- [x] 迁移叙事全量复扫 —— 零残留（仅规则定义中提及该概念）
- [x] specs 引用 changes 全量复扫 —— 零违规
- [x] 行数全量复扫 —— 5 个超标文档均在合理范围（2 审计时点快照 + 3 经评估保留内聚性）
- [x] 断链检查 —— 零残留
- [x] 文档治理测试 16/16 通过
- [x] git commit（58 文件，净减 31 行）

## 验收

1. ✅ 全部活跃文档无迁移叙事
2. ✅ specs/ 下无 changes/milestone 引用
3. ✅ Draft changes 中已完成功能已归档
4. ✅ 所有 README ≤60 行；5 个叶子文档超 120 行但均有合理理由
5. ✅ 文档描述与代码实现一致（关键路径逐条核对）
6. ✅ 无悬空引用

## 落地后

- specs/ 已更新为当前态
- 本 change Status → Landed → 移 `archives/plans/`
- **specs/ 永不引用本 milestone**
