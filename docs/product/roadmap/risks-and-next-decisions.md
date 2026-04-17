# 风险、应对与下一轮决策点

- 日期：2026-04-11
- 目标：沉淀主要风险与下一轮最值得讨论的决策。

## 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 数据源变化 | definitions 字段变动会拖垮全站 | 版本记录、schema 校验、原始快照、diff |
| 规则膨胀 | Patron / Variant / Trials 叠加后实现失控 | 先覆盖高频规则，逐步扩展 |
| 范围失控 | 变成“再做一个 Byteglow / Kleho” | 坚守 MVP 只做决策闭环 |
| 个人数据敏感 | 用户不信任导入流程 | local-first、本地解析 / 存储、明确提示 |
| 推荐不可信 | 黑盒建议难获得信任 | 先做规则过滤 + 模板推荐 + 可解释评分 |
| 维护成本高 | 新英雄 / 活动不断增加 | 数据模型与规则层先行，页面只做视图 |

## 明确建议与下一轮议题

- 建议顺序：先定 MVP；先做数据结构和规则表达；先做“限制筛选 + 阵型编辑 + 保存方案”闭环；再接个人数据；最后做推荐与成长路线。
- 直接讨论三件事最划算：
  - 议题 A：第一版只做哪些页面，范围压到 3-5 页。
  - 议题 B：`Champion / Adventure / Variant / Formation / UserProfile` 字段怎么定。
  - 议题 C：是否直接按 `Vite + React + TypeScript + 版本化 JSON` 起步，并据此搭目录骨架。

## 参考

- 参考站点：[Byteglow](https://ic.byteglow.com/)、[Kleho](https://idle.kleho.ru/)
- 公开页面与线索：[Byteglow About](https://ic.byteglow.com/about)、[Codename Entertainment](https://codenameentertainment.com/?page=idle_champions)、[Steam 商店页](https://store.steampowered.com/app/627690/Idle_Champions_of_the_Forgotten_Realms/)、Patrons / Trials / Collections Quests 官方博客
- 说明：文中对竞品数据获取方式和功能结构的部分判断来自公开页面与前端脚本可观察行为，属于调研推断，不等于官方声明
