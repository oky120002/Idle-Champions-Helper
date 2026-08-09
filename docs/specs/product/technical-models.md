# 技术方向、数据分层与核心模型

- 目标：回答“这条产品路线的技术底座是什么”“哪些模型必须定义”。

## 技术路线

- 原则：数据优先于界面；规则过滤优先于推算；本地优先于云同步；可维护优先于炫技。
- 前端：`Vite + React + TypeScript`；默认 `HashRouter`；轻量状态优先；阵型编辑用 HTML5 DnD 拖拽。
- 数据层：用版本化 JSON；脚本维护 champions / adventures / variants / formations / tags；个人数据只存本地。
- 规则层：独立承载冒险限制、Patron 条件、目标模式、用户拥有情况；输出可用英雄池、冲突提示、推算结果、缺口分析；不要把规则散到页面里。
- 数据来源分四层：官方公开资料校验名词；游戏 definitions 做结构化底座；用户本地导入做个人化；人工补充层承载 archetype / 成长建议 / 说明。
- 原则底线：不要把核心能力建立在第三方站点私有 API、页面结构或 bundle 上。

## 核心数据模型

- `Champion`：`id`、名称、`seat`、`roles`、`affiliations`、限制相关标签、`patronEligibility`、获取方式、关键机制标签。
- `Adventure / Variant`：`id`、campaign、名称、目标区间、解锁条件、Patron 可用性、结构化限制、奖励、布局。
- `FormationLayout`：`layoutId`、槽位坐标、前后排关系、可放置数量、适用战役 / 模式。
- `UserProfile`：已拥有英雄、装备 / 传奇 / feats、favor / blessings / patron 进度、常用阵型预设、目标偏好。
- `RecommendationTemplate`：场景类型、核心英雄、替代英雄、使用前提、不适用条件、操作说明。
