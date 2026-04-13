# 英雄筛选模块设计稿

- 设计日期：2026-04-13
- 模块目标：基于官方 definitions 归一化后的公共数据，提供一个可组合、可解释、可继续扩展的英雄筛选入口。
- 当前结论：第一阶段先完成“关键词 + seat + 定位 + 联动队伍”的过滤闭环，不急着引入 Patron、阵营限制、个人拥有状态或推荐分数。

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

### 2.2 前端依赖

- `src/data/client.ts`
  - 负责版本读取、路径拼接和内存缓存
- `src/domain/types.ts`
  - 负责 `Champion`、`DataCollection` 等基础类型
- `src/pages/ChampionsPage.tsx`
  - 当前页面实现入口

---

## 3. 第一阶段页面结构

建议保持现在这套三段式结构，不额外拆复杂侧栏：

1. 顶部说明卡
   - 说明当前使用的是真实公共数据
   - 明确本页作用是“先完成筛选闭环”
2. 指标区
   - 英雄总数
   - 当前匹配数
   - 覆盖 seat 数
   - 联动队伍标签数
3. 筛选区
   - 关键词输入
   - seat 选择
   - 定位选择
   - 联动队伍选择
4. 结果区
   - 空态提示
   - 当前展示数提示
   - 英雄结果卡片列表

这样可以保持信息密度足够高，同时不把 MVP 页面复杂度拉高。

---

## 4. 筛选规则设计

### 4.1 当前支持条件

- 关键词
  - 命中 `name`
  - 命中 `tags`
  - 命中 `affiliations`
- seat
  - `1..12`
- 定位
  - 来自 `enums.roles`
- 联动队伍
  - 来自 `enums.affiliations`

### 4.2 组合逻辑

- 所有筛选条件统一采用“AND”组合
- 关键词内部采用“OR”命中
- “全部”视为该维度不过滤

统一表达：

```text
matches = matchesSearch
  AND matchesSeat
  AND matchesRole
  AND matchesAffiliation
```

### 4.3 当前结果展示字段

每张结果卡至少展示：

- 英雄名
- seat
- roles
- affiliations
- 前 6 个 tags

当前不在卡片内展示：

- 复杂技能描述
- Patron 可用性
- 个人拥有状态
- 推荐评分

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

1. 增加更多可读过滤标签
   - 阵营
   - 种族
   - 职业
   - 活动年限
2. 接入个人画像
   - owned / unowned
   - 已解锁 / 未解锁
3. 接入限制模式
   - Patron
   - Variant 规则过滤后的候选英雄池
4. 接入推荐层
   - 只做可解释的模板推荐，不做黑盒打分

---

## 7. 验收标准

第一阶段完成后，应至少满足：

- 用户能在 30 秒内从全量英雄缩小到一个可操作候选集
- 页面能稳定消费 `champions.json` 与 `enums.json`
- 所有筛选组合都能给出明确空态或结果态
- 后续新增字段时，不需要大改页面结构

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
