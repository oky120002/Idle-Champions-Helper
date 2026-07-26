# 产品形态与成功口径

- 作用：回答「产品做哪些页面与闭环」「成功的口径是什么」。

## 产品形态

- 一句话：按限制筛英雄、按布局排阵、保存方案、逐步接个人账号数据。
- 首页：进入查询、阵型、目标模式。
- 英雄查询：`seat / role / tag / affiliation / Patron / 模式` 过滤。
- 冒险 / 变体查询：campaign、variant、reward、限制规则。
- 阵型编辑器：阵位图、seat 冲突提示、保存草稿。
- 候选推荐：基于目标模式与限制给出候选池；planner 提供本地优先、可解释的稳态推荐与自配评估。
- 个人面板：owned champions、缺口、已保存阵容。

## 数据底座

- champions / adventures / variants / formations / enums 等版本化 JSON，由 `npm run data:official` 流水线维护。
- 规则层独立承载冒险限制、Patron 条件、目标模式、用户拥有情况；不散到页面里。
- 个人数据 local-first：`Support URL` / 日志 / `User ID + Hash` 导入，只存本地 IndexedDB。

## 成功口径

- 愿意把它当主查询入口。
- 能明显减少多站切换。
- 1 分钟内完成一次筛选与保存。
- 「这个限制能上谁」的查询时间下降。

## 未来能力

Time Gate / Patron / Trials 路线规划、Modron / 多队、缺口分析、成长路线、社区分享——在前序闭环稳定后逐步扩展。
