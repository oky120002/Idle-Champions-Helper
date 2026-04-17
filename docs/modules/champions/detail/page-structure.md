# 英雄详情：页面结构

- 日期：2026-04-13
- 目标：说明详情页应该怎样被理解、从哪里进入，以及页面结构如何组织。

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

## 视觉方向

- 延续当前站点的深色基底，但强调“档案感 / 卷宗感”
- 信息应以表格式、ledger 式和标签式混合，而不是所有字段都做成同尺寸卡片瀑布流
- 明确避免：大段纯 JSON 默认展开、大量无意义图标、花哨但降低扫描效率的特效
