# 英雄筛选模块设计稿

- 日期：2026-04-13
- 目标：基于官方 definitions 归一化后的公共数据，提供可组合、可解释、可持续扩展的英雄筛选入口。
- 当前状态：已完成“关键词 + seat + 定位 + 联动队伍 + 属性分组筛选”的基础闭环；模块级 MVP 仍需补齐 `Patron / 模式过滤`。

## 模块定位

- 解决两个问题：一是在某个 `seat`、定位、联动队伍下有哪些英雄；二是在进入阵型编辑或推荐前先缩小候选池。
- 它不是：英雄百科详情页、黑盒推荐器、个人账号画像页。
- 当前边界：轻查询、强可组合、弱推断。

## 数据合同

### 当前输入

- `public/data/v1/champions.json`：`id`、`name`、`seat`、`roles`、`affiliations`、`tags`
- `public/data/v1/enums.json`：`roles`、`affiliations` 等筛选枚举
- `public/data/version.json`：当前数据版本

### MVP 必补字段

- 英雄公共字段：`patronEligibility`、`modeEligibilityTags`
- 枚举：`patrons`、`modes`
- 场景上下文：稳定 `scenarioId` 或 `ruleContextId`
- 规则来源：结构化规则集合，例如 `public/data/<version>/rules.json`

### 明确不接受的做法

- 从 `variants` 原文限制文本做页面侧字符串匹配
- 把 `Patron / 模式过滤` 规则散写在页面组件里
- 在没有公共数据合同的前提下先做临时 UI 开关
- 只保留展示用 `mode` 文本，不保留场景身份

### 建议的筛选上下文

```ts
type ChampionFilterContext =
  | { type: 'mode'; modeId: string }
  | {
      type: 'scenario'
      scenarioKind: 'adventure' | 'variant' | 'trial' | 'timeGate'
      scenarioId: string
      ruleContextId: string
    }
```

- 公共资格层：来自英雄资格字段，回答“天生能否参加某 Patron / 模式”。
- 场景规则层：来自结构化规则集合，回答“这个具体冒险 / 变体 / 试炼还有哪些额外限制”。
- 统一表达：基础筛选结果 `AND` Patron 资格 `AND` 模式 / 场景规则。

## 当前代码落点

- `src/pages/ChampionsPage.tsx`：页面入口
- `src/data/client.ts`：版本读取、路径拼接、数据加载
- `src/rules/championFilter.ts`：纯筛选逻辑
- `src/features/champion-filters/`：枚举分组、筛选项、交互组件

## 页面结构

- 顶部说明卡：说明当前数据来源、当前阶段边界与页面用途。
- 指标区：英雄总数、当前匹配数、覆盖 seat 数、联动队伍标签数。
- 筛选区：桌面端用粘性侧栏；高频项直出，低频项按“身份画像”和“来源 / 特殊机制”分组折叠；已选条件条留在侧栏内。
- 结果区：空态、条件摘要、展示数、英雄视觉档案工作台、结果卡片列表、必要时才出现的结果区快捷滚动按钮。
- 超宽屏策略：主内容区按视口分档放宽，避免筛选项一多就把结果区压得过窄；移动端退化为单列和折叠筛选，不依赖横向滑动。
- “英雄视觉档案”是内嵌工作台，不是新详情页；当前只展示站内可用基座元数据，不在浏览器端请求官方资源。

## 当前筛选规则

- 关键词：命中 `name`、`tags`、`affiliations`
- `seat`：`1..12`，支持多选
- 定位：来自 `enums.roles`
- 联动队伍：来自 `enums.affiliations`
- 标签派生组：种族、性别、职业、阵营、获取方式、特殊机制
- 特殊机制当前按 `站位相关 / 控制效果 / 专精方向` 三组展示，帮助用户理解含义

统一组合逻辑：

- 各维度之间统一 `AND`
- 关键词内部 `OR`
- `seat / 定位 / 联动队伍 / 标签组` 在各自维度内 `OR`
- “全部”表示该维度不过滤

## 模块 MVP 必补部分

- `Patron` 过滤
- 目标模式过滤
- 结果解释：至少显示命中的 `Patron`、命中的模式标签，或“可用 / 不可用原因”摘要

也就是说：当前页面子阶段完成，不等于整个英雄筛选模块已经达到产品路线图里的 MVP 标准。

## 状态与架构边界

- 页面状态保留三态：`loading`、`ready`、`error`。
- 枚举读取、枚举校验和纯筛选逻辑不应继续停留在 `ChampionsPage` 页面层。
- 后续扩展时，优先继续强化 `src/rules/championFilter.ts` 与 `src/features/champion-filters/`，而不是在 JSX 里硬塞更多规则。

## 扩展顺序

1. 先补模块 MVP 缺口：`Patron`、目标模式、规则集合与资格字段
2. 再补更可读的过滤标签：阵营、种族、职业、活动年限等
3. 再接个人画像：owned / unowned、已解锁 / 未解锁
4. 再接更细的场景规则：Variant 规则、冒险 / 变体上下文联动
5. 最后接推荐层：只做可解释模板推荐，不做黑盒打分

## 验收标准

### 当前页面子阶段

- 用户能在 30 秒内从全量英雄缩小到可操作候选集。
- 页面能稳定消费 `champions.json` 与 `enums.json`。
- 所有筛选组合都能给出明确空态或结果态。
- 后续新增字段时，不需要大改页面结构。

### 模块 MVP

- 能基于 `Patron` 做英雄可用性过滤。
- 能基于目标模式做候选池缩小。
- 基础过滤与 `Patron / 模式过滤` 能稳定组合。
- 验收口径不再把“基础过滤完成”误当成模块整体完成。

## 当前明确不做

- 英雄详情页深度资料展开
- 自动最优阵容推荐
- 基于个人账号的可用性判定
- 中文规则翻译或技能说明重写

## 对应文件

- `src/pages/ChampionsPage.tsx`
- `src/data/client.ts`
- `src/rules/championFilter.ts`
- `src/features/champion-filters/`
- `public/data/v1/champions.json`
- `public/data/v1/enums.json`
