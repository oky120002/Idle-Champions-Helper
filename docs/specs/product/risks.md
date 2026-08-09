# 风险与应对

- 作用：沉淀项目当前主要风险与约束它们的应对策略。

## 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 数据源变化 | definitions 字段变动会拖垮全站 | 版本记录、schema 校验、原始快照、diff |
| 规则膨胀 | Patron / Variant / Trials 叠加后实现失控 | 覆盖高频规则，逐步扩展 |
| 范围失控 | 变成“再做一个 Byteglow / Kleho” | 坚守只做决策闭环 |
| 个人数据敏感 | 用户不信任导入流程 | local-first、本地解析 / 存储、明确提示 |
| 推荐不可信 | 黑盒建议难获得信任 | 规则过滤 + 模板推荐 + 可解释评估 |
| 维护成本高 | 新英雄 / 活动不断增加 | 数据模型与规则层先行，页面只做视图 |

## 参考

- 参考站点：[Byteglow](https://ic.byteglow.com/)、[Kleho](https://idle.kleho.ru/)
- 公开页面与线索：[Byteglow About](https://ic.byteglow.com/about)、[Codename Entertainment](https://codenameentertainment.com/?page=idle_champions)、[Steam 商店页](https://store.steampowered.com/app/627690/Idle_Champions_of_the_Forgotten_Realms/)、Patrons / Trials / Collections Quests 官方博客
- 说明：文中对竞品数据获取方式和功能结构的部分判断来自公开页面与前端脚本可观察行为，属于调研推断，不等于官方声明
