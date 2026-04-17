# 英雄详情页设计稿

- 日期：2026-04-13
- 目标：在现有英雄筛选基础上，新增一个信息完整、可扫描、支持继续扩展的英雄详情页。

## 页面定位

- 这不是“英雄卡放大版”，而是战术档案页：同时支持快速核对与深入复核。
- 设计原则：摘要在前，深度在后，原始字段最后；保证“所有信息都在”，但不让首屏被噪音淹没。

## 路由与入口

- 详情路由：`/champions/:championId`
- 入口：从 `src/pages/ChampionsPage.tsx` 结果卡进入
- 返回：详情页顶部提供明确返回“英雄筛选”的路径
- 原则：详情页是筛选页的深入层，不新增主导航一级入口

## 信息架构

- 顶部卷宗区：头像、中英名称、`seat`、`roles`、`affiliations`、`availability`、`tags`、升级 / 天赋 / 皮肤数量摘要
- 分区导航：概览、角色卡、战斗、升级、天赋、皮肤、原始字段；桌面端可做 sticky rail，移动端退化为紧凑锚点条
- 概览 / 系统字段：`date available`、`last rework date`、`popularity`、`graphic ids`、`portrait graphic id`、默认 feat 槽位解锁、事件名、`adventure ids`、`cost / health curves`、`properties`
- 角色卡：`full name`、`class`、`race`、`alignment`、`age`、能力值、背景故事
- 战斗：基础数值、普攻、大招、事件升级；攻击条目至少保留名称、简介、长描述、冷却、目标数、AOE、`target / tags / damage types`
- 升级：命名升级 / specialization / ability unlock 在前，无名数值升级用紧凑 ledger 展示；若有 `specializationGraphicId`，只能展示构建期同步到站内的本地静态图，不在运行时请求官方 `mobile_assets`
- 天赋：名称、描述、稀有度、来源、`effects`、`properties / collection source`
- 皮肤：名称、稀有度、成本、资产细节、`availability / source / properties`
- 原始字段：`hero raw`、`attacks raw`、`upgrades raw`、`feats raw`、`skins raw`；默认折叠，但必须留在同页可展开

## 交互与移动端要求

- 长页面必须有稳定的锚点导航和清晰 section heading，优先解决“迷路”和“扫不动”两个问题。
- 结构化字段与原始 JSON 分开；命名升级与数值升级分开；标签、metadata、系统字段用统一视觉语法。
- 移动端允许单列排布和压缩导航，但不能隐藏升级 / 天赋 / 皮肤 / 原始字段，只保留摘要是不合格方案。

## 视觉方向

- 延续当前站点的深色基底，但强调“档案感 / 卷宗感”。
- 信息应以表格式、ledger 式和标签式混合，而不是所有字段都做成同尺寸卡片瀑布流。
- 明确避免：大段纯 JSON 默认展开、大量无意义图标、花哨但降低扫描效率的特效。

## 数据合同

- 摘要与兜底 identity：`public/data/<version>/champions.json`
- 详情完整数据：`public/data/<version>/champion-details/<hero-id>.json`
- 归一化来源：`hero_defines`、`attack_defines`、`upgrade_defines`、`effect_defines`、`hero_feat_defines`、`hero_skin_defines`

## 验收标准

- 任意英雄详情页都能展示完整结构化资料，页面末尾能展开原始 source / localized 快照片段。
- 能从筛选页结果卡一跳进入详情页，再一跳返回筛选页。
- 首屏能立即确认英雄身份和核心用途；长页面在桌面与移动端都保持可扫描。
- 继续保持 `HashRouter`、基于 `import.meta.env.BASE_URL` 的数据加载和零后端依赖。
