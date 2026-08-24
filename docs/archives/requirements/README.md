# archives/requirements/ —— 归档需求提案

已落地或已否决的需求提案。仅考古读取。

## 文件

- `2026-08-planner-formation-viability.md`：阵型通关可行性模型，已落地
- `2026-08-planner-speed-dimension.md`：planner 速度维度建模，已落地
- `2026-08-planner-area-dashboard.md`：planner 推图进度仪表盘，已落地
- `2026-08-planner-legendary-effects.md`：planner 传奇装备效果接入，已落地
- `animation-repo-size.md`：动画资源外链 / Git LFS 方案，已否决

## 规则

- 文件首必须有终态标记：
  - 已落地：`**状态**: 已落地（YYYY-MM，证据：commit / ADR / specs 路径）`
  - 已否决：`**状态**: 已否决（理由）`
- 进入后不再更新（如需重新提案，新开 `requirements/`）
- 查当前功能态 → `specs/`；查实现过程 → `archives/plans/`

## 何时进入

- 需求实现落地：实现合入后，**同次或紧随的下一次提交**内移入
- 需求被否决：明确决定不做后立即移入
- 多子项需求：全部子项终态后才整体归档；部分落地时原地更新剩余子项
- 重复/无效提案：直接删除，不进归档（无可追溯价值）
