# 英雄筛选模块设计稿

- 设计日期：2026-04-13
- 模块目标：基于官方 definitions 归一化后的公共数据，提供一个可组合、可解释、可继续扩展的英雄筛选入口。
- 当前结论：产品级 MVP 仍需包含 `Patron / 模式过滤`；当前页面子阶段已完成“关键词 + seat + 定位 + 联动队伍 + 属性分组筛选”的基础闭环，并为 `Patron / 模式过滤` 预留规则与验收入口。

---

## 1. 模块定位

英雄筛选模块是整个站点最基础的查询入口，优先解决两个问题：

1. 我现在想找某个 seat、某种定位、某个联动队伍下有哪些英雄。
2. 我在进入阵型编辑或后续推荐前，需要先缩小候选池。

它不是：

- 英雄百科详情页
- 黑盒推荐器
- 个人账号画像页

所以当前阶段要坚持“轻查询、强可组合、弱推断”的边界。

---

## 2. 当前输入与依赖

### 2.1 数据输入

- `public/data/v1/champions.json`
  - 提供 `id`、`name`、`seat`、`roles`、`affiliations`、`tags`
- `public/data/v1/enums.json`
  - 提供 `roles`、`affiliations` 等筛选项枚举
- `public/data/version.json`
  - 提供当前数据版本，供运行时定位集合文件

### 2.2 模块 MVP 补齐时必须新增的数据合同

当英雄筛选进入产品路线图定义的模块 MVP 时，不能继续只靠当前的 `champions / enums` 两份基础集合。

建议补齐四类数据输入：

1. 扩展英雄公共字段
   - 在 `Champion` 或配套集合中补 `patronEligibility`
   - 在 `Champion` 或配套集合中补 `modeEligibilityTags`
   - 该字段只用于“速刷 / 推图 / Trials / Time Gate”这类粗粒度模式标签，不直接承载具体变体规则
2. 扩展筛选枚举
   - 在 `enums` 中补 `patrons`
   - 在 `enums` 中补 `modes`
3. 补场景上下文合同
   - `variants`、后续 `adventures` 或统一 `scenarios` 集合必须提供稳定 `id`
   - 若页面要过滤具体冒险 / 变体 / 试炼上下文，筛选状态必须保留 `scenarioId` 或 `ruleContextId`
   - 不能只保留一个展示用 `mode` 名称，否则无法唯一定位限制来源
4. 补规则来源
   - 新增结构化规则集合，例如 `public/data/<version>/rules.json`
   - 用于表达“某场景 / 某模式下的英雄可用性判断来源”，避免回退到字符串匹配

当前阶段不接受的做法：

- 直接从 `variants` 原文限制文本做页面侧字符串匹配
- 把 `Patron / 模式过滤` 规则直接散写到页面组件
- 在没有公共数据合同的前提下先做临时 UI 开关
- 只保留通用 `mode` 文本，不保留场景 `id / ruleContextId`

### 2.3 `Patron / 模式过滤` 的建议规则来源

建议把来源拆成两层：

1. 公共资格层
   - 来自归一化后的英雄资格字段
   - 例如该英雄对哪些 `Patron` 天然可用
2. 场景规则层
   - 来自结构化规则集合
   - 用于表达目标模式、冒险、变体等额外限制

统一思路：

```text
基础筛选结果
  AND Patron 资格
  AND 模式 / 场景规则
```

这和路线图里“Patron Eligibility + normalized rules 表达方式”的方向保持一致，避免实现时各自猜测来源。

如果页面只做粗粒度目标模式过滤，保留 `modeId` 即可；如果页面开始过滤具体冒险 / 变体 / 试炼上下文，就需要把筛选输入升级为类似下面的结构：

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

这样后续页面、规则层和方案恢复链路才能引用同一份限制上下文，而不是各自猜一个“模式”。

### 2.4 前端依赖

- `src/data/client.ts`
  - 负责版本读取、路径拼接和内存缓存
- `src/domain/types.ts`
  - 负责 `Champion`、`DataCollection` 等基础类型
- `src/pages/ChampionsPage.tsx`
  - 当前页面实现入口

---

## 3. 当前页面子阶段结构

建议保持现在这套“说明 + 指标 + 左筛右结果”的结构，但桌面端要把筛选层级压实，不再把所有条件平铺在一个长列表里：

1. 顶部说明卡
   - 说明当前使用的是真实公共数据
   - 明确本页作用是“先完成筛选闭环”
2. 指标区
   - 英雄总数
   - 当前匹配数
   - 覆盖 seat 数
   - 联动队伍标签数
3. 筛选区
   - 桌面端使用粘性侧栏，减少长列表浏览时的视线来回跳
   - 高频条件始终直接可见：关键词、seat、定位、联动队伍
   - 低频标签条件按两组折叠收纳：
     - 身份画像：种族 / 性别 / 阵营
     - 来源与机制：职业 / 获取方式 / 机制
   - 已选条件条保留在侧栏内，支持单独清空某个维度或一键清空全部
4. 结果区
   - 空态提示
   - 当前已选条件摘要
   - 当前展示数提示
   - 英雄结果卡片列表
   - 长列表提供结果区快捷滚动入口，但按钮应按当前位置动态显隐，避免常驻打扰

这样可以保持信息密度足够高，同时把高频和低频条件拉开，避免桌面端因为筛选项过多而把结果区压得过窄、过跳。

---

## 4. 筛选规则设计

### 4.1 当前页面子阶段已支持条件

- 关键词
  - 命中 `name`
  - 命中 `tags`
  - 命中 `affiliations`
- seat
  - `1..12`
  - 支持多选
- 定位
  - 来自 `enums.roles`
  - 支持多选
- 联动队伍
  - 来自 `enums.affiliations`
  - 支持多选
- 种族
  - 当前基于 `tags` 归类得到
  - 支持多选
- 性别
  - 当前基于 `tags` 归类得到
  - 支持多选
- 职业
  - 当前基于 `tags` 归类得到
  - 支持多选
- 阵营
  - 当前基于 `tags` 归类得到
  - 支持多选
- 获取方式
  - 当前基于 `tags` 归类得到
  - 支持多选
- 机制
  - 当前基于 `tags` 归类得到
  - 支持多选

### 4.2 模块 MVP 必补条件

产品路线图里，英雄查询的 MVP 目标不是只有基础标签过滤，还包括：

- `Patron` 过滤
- 目标模式过滤

因此这里需要明确两层边界：

1. 当前页面子阶段
   - 先把基础过滤闭环做稳
2. 模块 MVP 验收
   - 必须补齐 `Patron / 模式过滤`

也就是说，当前页面子阶段完成，不等于整个英雄筛选模块已经达到产品路线图里的 MVP 标准。

### 4.3 组合逻辑

- 所有筛选条件统一采用“AND”组合
- 关键词内部采用“OR”命中
- `seat / 定位 / 联动队伍` 在各自维度内采用“OR”命中
- “全部”视为该维度不过滤

统一表达：

```text
matches = matchesSearch
  AND matchesAnySelectedSeat
  AND matchesAnySelectedRole
  AND matchesAnySelectedAffiliation
  AND matchesAnySelectedRace
  AND matchesAnySelectedGender
  AND matchesAnySelectedAlignment
  AND matchesAnySelectedProfession
  AND matchesAnySelectedAcquisition
  AND matchesAnySelectedMechanic
```

在模块 MVP 阶段，还需要补成：

```text
matches = 基础过滤结果
  AND matchesPatron
  AND matchesMode
```

### 4.4 当前结果展示字段

每张结果卡至少展示：

- 英雄名
- seat
- roles
- affiliations
- 结构化属性概览（当前基于 `tags` 拆分为种族 / 性别 / 阵营 / 职业 / 获取方式 / 机制 / 其他）

当前页面子阶段不在卡片内展示：

- 复杂技能描述
- Patron 可用性
- 个人拥有状态
- 推荐评分

但当模块 MVP 接入 `Patron / 模式过滤` 后，结果卡或详情浮层至少要补一类解释信息：

- 当前命中的 `Patron`
- 当前命中的模式标签
- 或“可用 / 不可用原因”摘要

否则“可解释”目标就无法落到可验收的页面行为上。

---

## 5. 状态与逻辑边界

### 5.1 页面状态

保留三态即可：

- `loading`
- `ready`
- `error`

### 5.2 本模块不应继续停留在页面层的逻辑

当前 `src/pages/ChampionsPage.tsx` 已经能工作，但后续应把下面两类逻辑下沉：

1. 枚举读取与校验
2. 英雄筛选纯函数

推荐后续补成：

```text
src/domain/champion-filter.ts
src/rules/champion-filter.ts
```

至少把“输入条件 -> 输出候选列表”的部分做成纯函数，避免页面组件直接承担规则职责。

---

## 6. 后续扩展顺序

建议按下面顺序扩展，而不是一次把所有维度塞进来：

1. 先补模块 MVP 缺口
   - `Patron`
   - 目标模式
   - 对应规则集合与资格字段
2. 增加更多可读过滤标签
   - 阵营
   - 种族
   - 职业
   - 活动年限
3. 接入个人画像
   - owned / unowned
   - 已解锁 / 未解锁
4. 接入更细的场景规则
   - Variant 规则过滤后的候选英雄池
   - 冒险 / 变体上下文联动
5. 接入推荐层
   - 只做可解释的模板推荐，不做黑盒打分

---

## 7. 验收标准

### 7.1 当前页面子阶段验收

应至少满足：

- 用户能在 30 秒内从全量英雄缩小到一个可操作候选集
- 页面能稳定消费 `champions.json` 与 `enums.json`
- 所有筛选组合都能给出明确空态或结果态
- 后续新增字段时，不需要大改页面结构

### 7.2 模块 MVP 验收补充条件

在进入产品路线图定义的模块 MVP 时，还必须满足：

- 能基于 `Patron` 做英雄可用性过滤
- 能基于目标模式做候选池缩小
- 基础过滤与 `Patron / 模式过滤` 能稳定组合
- 验收口径不再把“基础过滤完成”误当成模块全部完成

---

## 8. 当前明确不做

- 不做英雄详情页深度资料展开
- 不做自动最优阵容推荐
- 不做基于个人账号的可用性判定
- 不做中文规则翻译或技能说明重写

---

## 9. 对应文件

- `src/pages/ChampionsPage.tsx`
- `src/data/client.ts`
- `src/domain/types.ts`
- `public/data/v1/champions.json`
- `public/data/v1/enums.json`
