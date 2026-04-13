# 英雄详情页设计稿

- 设计日期：2026-04-13
- 模块归属：`docs/modules/champions/`
- 目标：在现有“英雄筛选”基础上，新增一个信息完整、可扫描、支持继续扩展的英雄详情页。

---

## 1. 页面定位

这个页面不是单纯的“英雄卡放大版”，而是一个英雄战术档案页。

它要同时服务两类动作：

1. 快速核对：这个英雄是谁、几号位、什么定位、能做什么。
2. 深入复核：我想把他的技能、升级、天赋、皮肤、原始字段一次看全。

因此页面必须兼顾：

- 首屏就有摘要
- 长页面仍然好跳读
- “所有信息”存在，但不会直接把用户淹没

---

## 2. 路由与入口

### 2.1 路由

- 新增详情路由：`/champions/:championId`

### 2.2 入口

- 从 `src/pages/ChampionsPage.tsx` 的结果卡进入
- 详情页顶部提供返回 `英雄筛选` 的明确路径

原因：

- 详情页是筛选页的深入层，不属于主导航一级入口
- 维持当前信息架构，不让主导航继续膨胀

---

## 3. 信息架构

详情页采用“摘要在前、深度在后、原始信息压到最后”的六段式结构。

### 3.1 顶部卷宗区

首屏要解决“我现在在看谁”：

- 头像
- 中英名称
- seat
- roles
- affiliations
- availability
- tags
- 升级 / 天赋 / 皮肤数量摘要

同时放一条简短说明：

- 当前页优先展示结构化信息
- 原始 definitions 片段在页面后半段可展开查看

### 3.2 分区跳转导航

提供固定位置的分区锚点，优先跳到：

- 概览
- 角色卡
- 战斗
- 升级
- 天赋
- 皮肤
- 原始字段

桌面端可放在右侧 sticky rail；移动端退化为横向可滚动分区导航。

### 3.3 概览 / 系统字段

用于放所有“不是战斗描述，但会影响查阅效率”的资料：

- date available
- last rework date
- popularity
- graphic ids
- portrait graphic id
- default feat slot unlocks
- event name
- adventure ids
- cost / health curves
- properties

### 3.4 角色卡

集中展示：

- full name
- class
- race
- alignment
- age
- ability scores
- backstory

角色卡应该是最容易扫描的一段，不能和升级、原始字段混排。

### 3.5 战斗

这一段按“基础数值 + 普攻 + 大招”组织：

- base cost
- base damage
- base health
- base attack
- ultimate attack
- event upgrades

其中普攻 / 大招卡片要显式保留：

- 名称
- 简介
- long description（如有）
- 冷却
- 命中目标数
- AOE
- target / tags / damage types

### 3.6 升级

升级区是全页信息密度最高的部分，重点不是“全部铺开”，而是“全部可扫”。

建议拆两层：

1. 命名升级 / specialization / ability unlock
   - 视觉层级更高
2. 无名数值升级
   - 用紧凑 ledger 形式展示 required level、倍率、effect

不做分页，不做弹窗，不做“只展示部分升级”的假完整方案。

### 3.7 天赋

每个天赋卡展示：

- 名称
- 描述
- 稀有度
- 来源
- effects
- properties / collection source

### 3.8 皮肤

每个皮肤展示：

- 名称
- 稀有度
- 成本
- 资产 details
- availability / source / properties

### 3.9 原始字段

这是“所有信息”的最后保障。

需要放：

- hero raw
- attacks raw
- upgrades raw
- feats raw
- skins raw

默认折叠，但必须能直接展开，不藏在二级路由或下载文件里。

---

## 4. 交互与可用性要求

### 4.1 优先解决长页面迷路问题

- 固定的分区导航
- 明确的 section heading
- 每段首屏就能判断这段在讲什么

### 4.2 优先解决高密度噪音问题

- 结构化字段与原始 JSON 分开
- 数值升级与命名升级分开
- 标签、metadata、系统字段用一致的视觉语法

### 4.3 移动端不能删功能

移动端允许：

- 单列排布
- sticky rail 降级成横向导航
- 网格压缩成列表

但不能：

- 隐藏原始字段
- 隐藏升级 / 天赋 / 皮肤
- 只保留摘要

---

## 5. 视觉方向

延续当前站点的深色、冷暖混合背景，但详情页进一步强调“档案感 / 卷宗感”：

- 顶部是更强的身份锚点
- 段落边界清晰
- 信息以表格式、ledger 式和标签式混合，而不是全卡片瀑布流
- 保持克制，不引入会削弱阅读效率的重装饰

明确避免：

- 把每一类字段都做成同尺寸卡片
- 大量无意义的图标
- 花哨但不可扫描的时间轴特效
- 大段纯 JSON 默认展开

---

## 6. 数据依赖

### 6.1 页面运行依赖

- `public/data/<version>/champions.json`
  - 用于列表页摘要和详情页兜底 identity
- `public/data/<version>/champion-details/<hero-id>.json`
  - 用于详情页完整展示

### 6.2 详情数据来源

来自官方 definitions 的结构化归一化结果：

- `hero_defines`
- `attack_defines`
- `upgrade_defines`
- `effect_defines`
- `hero_feat_defines`
- `hero_skin_defines`

---

## 7. 验收标准

### 7.1 信息完整性

- 进入任意英雄详情页后，能看到当前归一化数据中该英雄的完整结构化资料
- 页面末尾能展开原始 source / localized 快照片段

### 7.2 导航闭环

- 从筛选页结果卡可以进入详情页
- 详情页可以一跳返回筛选页

### 7.3 体验质量

- 首屏能立即确认英雄身份和核心用途
- 长页面有稳定分区导航
- 升级 / 天赋 / 皮肤在桌面和移动端都能扫描

### 7.4 工程约束

- 保持 `HashRouter`
- 数据加载继续基于 `import.meta.env.BASE_URL`
- 不引入后端依赖
