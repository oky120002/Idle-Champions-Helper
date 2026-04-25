# Animation Audit 局部说明

## 入口顺序

1. `src/pages/AnimationAuditPage.tsx`
2. `src/pages/animation-audit/useAnimationAuditPageModel.ts`
3. `src/pages/animation-audit/AnimationAuditComparisonRow.tsx`
4. `src/pages/animation-audit/AnimationAuditRowFeedback.tsx`
5. `src/pages/animation-audit/AnimationAuditFeedbackExportPanel.tsx`

## 状态来源

- 审计清单来自 `champion-animation-audit.json`
- 动画预览来自 `champion-animations.json`
- 静态兜底图来自 `champion-illustrations.json`
- 人工反馈只存在浏览器本地 `localStorage`，键为 `animation-audit.feedback.v1`
- 已确认的 idle 默认覆写沉淀在 `scripts/data/champion-animation-idle-overrides.json`

## 当前职责拆分

- `AnimationAuditPage.tsx`
  - 只做 workbench 编排、过滤区与结果区拼装
- `useAnimationAuditPageModel.ts`
  - 拉取数据
  - 过滤短名单
  - 维护人工反馈草稿、复制状态与导出 JSON
- `feedback.ts`
  - 反馈 tag 常量
  - 本地存储读写
  - 导出 payload 组装
- `scripts/data/champion-animation-idle-overrides.json`
  - 审片后确认的 fixed / blocked sequence 覆写
  - 被 `sync-idle-champions-animations.mjs` 和 `audit-idle-champions-animations.mjs` 共同消费
- `AnimationAuditComparisonRow.tsx`
  - 单行标题、信号、三栏对比与播放器
- `AnimationAuditRowFeedback.tsx`
  - 单行 verdict / tag / note 交互
- `AnimationAuditFeedbackExportPanel.tsx`
  - 顶部统计、复制按钮、JSON 预览

## 不变量

- 页面默认仍然先给短名单，避免一次打开过多并行动画
- 单行永远优先展示 `当前默认 / 推荐候选 / 一个备选`
- 反馈 JSON 只导出“有内容的条目”；空 verdict + 空 tag + 空 note 不写入
- `preferredSequenceIndex` 只由人工 verdict 推导，不在导出时二次猜测
- 即使复制失败，页面也必须提供 JSON 预览作为手动兜底

## 修改提醒

- 如果改了反馈 payload 结构，要同步检查后续用于收敛 heuristic 的消费逻辑
- 如果新增更多人工标签，先改 `feedback.ts`，再补 `AnimationAuditRowFeedback.tsx`
- 如果审计清单字段变化，优先保持导出 JSON 的核心识别字段稳定：`id`、`verdict`、`preferredSequenceIndex`
