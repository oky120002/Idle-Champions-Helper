# research/ —— 外部事实调研

记录外部事实、数据核实与审计证据，**不含决策**。默认只进目标主题。

## 规则

- 只记事实（字段、格式、链路、数据、约束）
- 调研含决策 / 推荐时拆分：事实留本目录，决策抽到 `decisions/`，后续建议抽到 `plans/`
- 文档可带数据快照日期（事实的时间标识，如「数据快照日期：2026-07-21」）
- 引用 raw 源头（`tmp/idle-champions-api/...`）作为证据

## 主题入口

- [`data/`](./data/)：definitions、静态数据、中文链路、资源链路、皮肤立绘
- [`gameplay/`](./gameplay/)：英雄机制、战斗表现等游戏内实测（配合 planner 英雄参照校准）
- [`deployment/`](./deployment/)：GitHub Pages 主路线与国内托管备选
- [`documentation/`](./documentation/)：文档驱动开发框架与行业实践

## 怎么写

- 标题 + 数据快照日期
- 事实为主，结论紧随
- 不写「下一步建议」（进 `plans/`）、「为什么这样选」（进 `decisions/`）
