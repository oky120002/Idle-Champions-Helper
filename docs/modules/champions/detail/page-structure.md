# 英雄详情：页面结构

- 日期：2026-04-13
- 目标：说明详情页应该怎样被理解、从哪里进入，以及页面结构如何组织。

## 页面定位

- 这不是“英雄卡放大版”，而是战术档案页：同时支持快速核对与深入复核。
- 设计原则：摘要在前，深度在后，原始字段最后；保证“所有信息都在”，但不让首屏被噪音淹没。

## 路由与入口

- 详情路由：`/champions/:championId`
- 入口：从 `src/pages/ChampionsPage.tsx` 结果卡进入
- 返回：返回“英雄筛选”的入口现在固定放在页面工具条，而不是站点导航
- 原则：详情页是筛选页的深入层，不新增主导航一级入口
- 外层壳层：桌面端沿用全站页面工作台规范；当前小导航、工具条和右区滚动细节见 `docs/modules/shared-components/page-workbench-design.md`

## 信息架构

- 外层仍遵循全站工作台上下结构：页面 toolbar 在上，下方内容区承载详情，不把详情页改成全站级左右结构。
- 下方内容区内部采用局部左右布局：桌面左侧为英雄资料栏，右侧为 tab 内容区；移动端退化为单列上下结构。
- 左侧资料栏：头像、中英名称、`seat`、`roles`、`affiliations`、`availability`、属性、角色卡核心字段、升级 / 天赋 / 皮肤数量摘要。
- 右侧 tab：`Specializations`、`Abilities`、`Loot`、`Legendary`、`Feats`、`Skins`、`Story & Misc`；不做 `Links`。
- `Specializations`：默认打开；按专精 / 可被强化能力组织为列式卡片，同列内展示该类型的主升级、关联强化、效果摘要与详情；若有 `specializationGraphicId`，只能展示构建期同步到站内的本地静态图。
- `Abilities`：基础数值、普攻、大招、事件升级和等级升级 ledger；攻击条目至少保留名称、简介、长描述、冷却、目标数、AOE、`target / tags / damage types`。
- `Loot`：按 `loot_defines.hero_id` 展示装备名称、描述、槽位、稀有度、效果摘要和 Golden Epic 标记。
- `Legendary`：按英雄 `properties.legendary_effect_id` 顺序展示传奇效果。
- `Feats`：名称、描述、稀有度、来源、`effects`、`properties / collection source`。
- `Skins`：只提供查看和本地预览入口，展示名称、稀有度、成本、来源 / 可得性；不提供下载内容。
- `Story & Misc`：角色卡、背景故事、系统字段、原始字段折叠区；原始字段包括 `hero`、`attacks`、`upgrades`、`feats`、`skins`、`loot`、`legendaryEffects`。

## 视觉方向

- 延续当前站点的深色基底，但强调“档案感 / 卷宗感”
- 信息应以表格式、ledger 式和标签式混合，而不是所有字段都做成同尺寸卡片瀑布流
- 明确避免：大段纯 JSON 默认展开、大量无意义图标、花哨但降低扫描效率的特效
