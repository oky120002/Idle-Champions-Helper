# 文档全量审计与清理

**Status**: Accepted
**Type**: milestone
**Scope**: system
**Created**: 2026-08-06

## 目标

对仓库全部 md 文档做一次深度审计与清理：消除迁移叙事、纠正代码-文档偏差、修复治理违规、处置过时变更文档，使文档体系成为当前态的准确镜像，为后续开发扫清认知噪音。

## 范围

docs/ 下约 110 个 md、根目录 4 个（AGENTS/README/TODO + .impeccable.md）、src/ 下约 13 个 co-located README，合计约 127 个文件。

## 问题画像（扫描结果）

1. **迁移叙事**：~40 个活跃文档含历史对比/版本演进/"以前是"/"不再使用"等叙事
2. **Specs 引用 changes**：10 个 spec 文件引用 changes/milestone（铁律违反）
3. **Draft changes 已完成未归档**：7 个 2026-07 Draft change 描述的功能已在代码中实现
4. **行数超标**：7 个叶子文档超 120 行（planner/architecture 179 行为最）
5. **代码-文档偏差**：需逐文件核对（本轮核心工作）

## 阶段 Checklist

### 阶段 0：计划与分组

- [x] 盘点文档全貌、问题画像 —— 验证：本文件
- [ ] 落计划到 changes/ —— 验证：本文件已创建

### 阶段 1：变更文档处置（串行，主智能体）

处置 7 个 Draft change + 2 个 Accepted change 的归档状态。

- [ ] 逐个核对 Draft change 描述的功能是否已在代码中实现 —— 验证：每个 change 有明确判定（完成→Landed→归档 / 未完成→保留 Draft / 废弃→标记）
- [ ] 已完成的标 Landed 并移入 archive/changes/ —— 验证：changes/ 只留活跃项
- [ ] Accepted 的 2 个 lint-fix change 检查是否已全部落地 —— 验证：eslint 配置和代码实际状态

### 阶段 2：分区域并行深度审计（子智能体）

每个子智能体负责一个区域，统一执行四项任务：
1. **消迁移叙事**：改为当前态描述或删除
2. **修治理违规**：specs 不引 changes、无过时路径/命令
3. **核对代码**：描述与当前代码实现一一佐证，深入调用链
4. **修体量**：超标文档按读者意图拆分

分组：

- [ ] **Group A: planner specs**（`docs/specs/modules/planner/` 15 文件）—— 验证：每个 spec 描述与 src/domain/planner + src/pages/planner 代码一致；architecture.md(179行)/mechanic-isolation.md(131行) 拆分
- [ ] **Group B: champions + formation specs**（`docs/specs/modules/champions/` + `formation/` ~18 文件）—— 验证：与 src/pages/champions + src/pages/formation + filter 组件代码一致
- [ ] **Group C: 其余模块 specs**（`presets/` + `pets/` + `search/` + `user-data/` + `shared-components/` ~12 文件）—— 验证：与对应 src/pages 和 src/components 代码一致
- [ ] **Group D: guidelines + product specs**（`docs/specs/guidelines/` + `product/` + `specs/README.md` ~12 文件）—— 验证：规范与实际配置（eslint/tsconfig/vite/vitest）一致；product 描述与实际功能边界一致
- [ ] **Group E: research/**（`docs/research/` ~30 文件）—— 验证：数据源事实与当前 public/data + 数据管线脚本一致；不含决策/建议段落
- [ ] **Group F: runbooks + 根文档**（`docs/runbooks/` 9 文件 + 根 README/AGENTS/TODO + `docs/README.md` + 目录 README）—— 验证：命令/路径/流程当前可执行
- [ ] **Group G: decisions/**（`docs/decisions/` 17 ADR）—— 验证：Status 准确、Superseded 链完整、被引用的 ADR 描述与当前代码选择一致
- [ ] **Group H: src/ co-located READMEs**（13 文件）—— 验证：与所在模块代码结构一致

### 阶段 3：一致性收口（串行，主智能体）

- [ ] 跨文档一致性检查：同一事实只展开一次，入口文档只留摘要+链接 —— 验证：rg 搜索关键事实无矛盾
- [ ] 迁移叙事全量复扫 —— 验证：rg 无残留
- [ ] specs 引用 changes 全量复扫 —— 验证：rg 无残留
- [ ] 行数全量复扫 —— 验证：无超标
- [ ] 文档内引用的文件路径/符号名存在性检查 —— 验证：抽样核对
- [ ] git commit

## 验收

1. 全部活跃文档无迁移叙事（rg 关键词复扫无残留）
2. specs/ 下无 changes/milestone 引用
3. Draft changes 中已完成功能已归档
4. 所有叶子文档 ≤120 行，所有 README ≤60 行
5. 文档描述与代码实现一致（抽查关键路径无偏差）
6. 无悬空引用（引用的文件路径存在）

## 落地后

- specs/ 更新点：全量审计后各 spec 为当前态
- 本 change Status → Landed → 移 `archive/changes/`
- **specs/ 永不引用本 milestone**
