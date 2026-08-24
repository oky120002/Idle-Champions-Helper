# 常用筛选组合

**状态**: 已落地
**类型**: change
**范围**: champions / champion-filters / local persistence
**创建日期**: 2026-08-24

## 来源

- 需求库：`docs/requirements/2026-08-preset-integration-extensions.md`
- 其他来源：`docs/specs/modules/presets/ui.md`、`docs/specs/modules/presets/scope-and-model.md`、用户明确要求先执行计划

## 目标

在英雄列表页独立保存、命名、恢复和删除常用筛选组合，复用现有 11 维筛选协议，不把筛选组合混入阵型方案，降低重复配置成本。

## 范围

- 新增常用筛选组合的本地数据模型、schema 与 IndexedDB store。
- 在英雄列表页提供保存当前筛选、恢复和删除入口。
- 复用 `CommonFilterSearchState` 与现有 URL 编解码，恢复时同步页面筛选状态。
- 为纯数据层、持久化层和页面交互补充 co-located 测试。
- 不改传奇装备逻辑，不接入个人画像，不新增后端或跨页面全局 store。

## 阶段 Checklist

- [x] 阶段 1：建立筛选组合数据合同、schema、IndexedDB store —— 验证：存取、排序、损坏记录跳过测试
- [x] 阶段 2：接入英雄列表页保存 / 恢复 / 删除交互 —— 验证：组件状态与 URL 筛选同步测试
- [x] 阶段 3：同步当前规格与需求状态 —— 验证：需求子项和 `presets/scope-and-model.md` 反映实际能力
- [x] 阶段 4：运行定向测试、类型检查、lint 并提交 —— 验证：定向测试通过；完整 typecheck 受既有仓库错误阻塞

## 验收

- 用户可以给当前非空筛选命名并保存到本地。
- 用户可以恢复已保存组合，11 维筛选值与页面 URL 协议保持一致。
- 用户可以删除组合；刷新页面后保存内容仍存在。
- 损坏或缺字段的本地记录不会阻塞其他组合读取。
- 常用筛选组合与阵型方案使用独立数据对象和 IndexedDB store。
- 传奇装备相关文件无改动。

## 落地后

- specs/ 更新点：
  - `docs/specs/modules/presets/scope-and-model.md`：补充常用筛选组合当前模型与边界
  - `docs/specs/modules/presets/ui.md`：补充英雄列表页入口与恢复交互
- 需求 `docs/requirements/2026-08-preset-integration-extensions.md`：阶段二标记已落地；个人画像子项继续保留
- 本 change 状态 → 已落地 → 移 `docs/archives/plans/`
- **specs/ 永不引用本 milestone**（规范描述最终态，不描述交付过程）
