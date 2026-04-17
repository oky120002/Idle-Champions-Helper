# Idle Champions 项目路线

- 日期：2026-04-11
- 目标：做“资料查询 + 限制筛选 + 阵型编辑 + 成长决策”的个人工具台，不做黑盒最优解站。
- 核心判断：需求已被 Byteglow / Kleho 证明；差异化不在“更全”，而在“更贴近当前目标、当前限制、当前账号”的可执行决策。

## 为什么值得做

- 难点不是单个英雄强度，而是 seat 冲突、阵型站位、Patron / Trials / Time Gate / Variants 限制，以及装备、传奇、feats、pigments、favor、blessings、modron 的叠加。
- 玩家真实问题是“这局在我当前条件下怎么组更省时间”；工具要支持组合、过滤、验证、保存，并逐步读取个人进度。
- 单纯百科价值有限；收益在于减少切游戏、wiki、表格和第三方站的往返。

## 竞品与定位

| 参考 | 强项 | 借鉴 | 不照搬 |
| --- | --- | --- | --- |
| Byteglow | 个人数据驱动、任务页完整、本地优先 | local-first、按任务拆页、阵容 / 筛选可保存 | 功能过多、学习成本高、容易失控 |
| Kleho | 数据深、地图 / 规则 / 活动视图强 | 结构化冒险 / 限制 / 奖励、小工具拆分 | 偏专家工具，缺少个人行动建议 |

- 推荐定位：个人成长导向的阵型决策台；在“当前条件 + 目标 + 限制”下，快速给出可执行阵容骨架、候选池和成长优先级。
- 成败不取决于页面数量，而取决于数据底座、规则表达、个人数据映射和可解释推荐。

## 目标用户与边界

| 类别 | 结论 |
| --- | --- |
| 优先用户 A | 中度玩家；已懂基础玩法，但 Patron / Trials / Variants 等系统叠加后需要更快筛人、排阵、查缺口 |
| 优先用户 B | 成长型 / 回坑玩家；英雄池和装备不完整，更关心过渡阵容、先补谁、先推哪条线 |
| 暂不优先 | 极限数学最优解玩家、社区社交 / 排行榜 / 内容运营需求 |
| 第一阶段必须做 | 结构化数据底座、可过滤英雄 / 冒险 / 限制查询、阵型编辑、限制下的候选英雄筛选、阵容保存与比较 |
| 第一阶段不做 | 全自动最佳阵容求解器、全玩法完整模拟器、用户系统 / 社区系统、照搬 Byteglow / Kleho 的大百科矩阵 |

## 分阶段路线

| 阶段 | 周期 | 目标 | 关键交付 | 验收口径 |
| --- | --- | --- | --- | --- |
| Phase 0 | 1 周 | 定义范围与数据来源 | 核心实体清单、页面地图、MVP 范围、风险清单 | 能一句话说清第一版服务哪些决策；能区分必需数据与可后补数据 |
| Phase 1 | 1-2 周 | 立数据底座 | champions / adventures / variants / formations / enums、规则表达、更新脚本 | 能稳定产出前端可消费的版本化 JSON；新增英雄或限制不需要改一堆页面 |
| Phase 2 | 1-2 周 | 做 MVP 查询站 | 英雄页、冒险 / 变体页、阵型页、候选页 | 能完成“查限制 -> 选英雄 -> 摆阵 -> 保存阵容”闭环 |
| Phase 3 | 2 周 | 接个人化能力 | `Support URL` / 日志 / `User ID + Hash` 导入、本地存储、owned / unowned / 缺口提示、个人常用阵容 | 同一冒险对不同账号能给出不同候选集；不上传隐私也能拿到核心价值 |
| Phase 4 | 2-4 周 | 做可解释推荐 | 速刷 / 推图 / 限制模式三类建议、规则过滤、评分卡、模板推荐、archetype 库 | 用户输入目标后能得到 3-5 套可解释方案，而不是黑盒结果 |
| Phase 5 | 后续 | 高级能力 | Time Gate / Patron / Trials 路线规划、Modron / 多队、缺口分析、成长路线、社区分享 | 只在前面闭环稳定后再做 |

## MVP 形态

- 一句话 MVP：按限制筛英雄、按布局排阵、保存方案、逐步接个人账号数据。
- 首页：进入查询、阵型、目标模式。
- 英雄查询：`seat / role / tag / affiliation / Patron / 模式` 过滤。
- 冒险 / 变体查询：campaign、variant、reward、限制规则。
- 阵型编辑器：阵位图、seat 冲突提示、保存草稿。
- 候选推荐：基于目标模式与限制给出第一轮候选池。
- 个人面板：后加，用于 owned champions、缺口、已保存阵容。
- 成功指标：愿意把它当主查询入口；能明显减少多站切换；1 分钟内完成一次筛选与保存；“这个限制能上谁”的查询时间下降。

## 技术路线

- 原则：先数据后界面；先规则过滤后推荐；先本地优先后云同步；先可维护后炫技。
- 前端：`Vite + React + TypeScript`；MVP 默认 `HashRouter`；轻量状态优先；阵型编辑再引入拖拽库。
- 数据层：第一阶段用版本化 JSON；脚本维护 champions / adventures / variants / formations / tags；个人数据只存本地。
- 规则层：独立承载冒险限制、Patron 条件、目标模式、用户拥有情况；输出可用英雄池、冲突提示、推荐骨架、缺口分析；不要把规则散到页面里。
- 数据来源分四层：官方公开资料校验名词；游戏 definitions 做结构化底座；用户本地导入做个人化；人工补充层承载 archetype / 成长建议 / 说明。
- 原则底线：不要把核心能力建立在第三方站点私有 API、页面结构或 bundle 上。

## 核心数据模型

- `Champion`：`id`、名称、`seat`、`roles`、`affiliations`、限制相关标签、`patronEligibility`、获取方式、关键机制标签。
- `Adventure / Variant`：`id`、campaign、名称、目标区间、解锁条件、Patron 可用性、结构化限制、奖励、布局。
- `FormationLayout`：`layoutId`、槽位坐标、前后排关系、可放置数量、适用战役 / 模式。
- `UserProfile`：已拥有英雄、装备 / 传奇 / feats、favor / blessings / patron 进度、常用阵型预设、目标偏好。
- `RecommendationTemplate`：场景类型、核心英雄、替代英雄、使用前提、不适用条件、操作说明。

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
