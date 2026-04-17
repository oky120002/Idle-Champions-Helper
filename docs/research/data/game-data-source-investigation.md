# Idle Champions 数据来源调研

- 日期：2026-04-12
- 目标：确认基础游戏数据、个人数据读取方式、第三方站点链路，以及本仓库应采用的实现方案。
- 当前结论：公共数据直接对接官方客户端 definitions；个人数据坚持浏览器本地导入、本地请求、本地存储；第三方站点只做参考，不做正式上游。

## 核心决策

- 公共基础数据：官方 definitions 接口 -> 原始快照 -> 归一化 JSON -> `public/data/version.json + public/data/v1/*.json`。
- 个人数据：`Support URL` / `webRequestLog.txt` / `User ID + Hash` 导入 -> 浏览器本地解析 -> 浏览器直接请求官方接口 -> 写入 `IndexedDB`。
- 第三方站点：可用于页面结构参考、字段推断、规则校验和版本更新观察；不应作为正式依赖。

## 已核实事实

| 主题 | 已确认事实 | 直接含义 |
| --- | --- | --- |
| Kleho 更新状态 | 首页暴露 `APP_INFO.patch_dt = 1670669709`，换算为 `2022-12-10 18:55:09 CST`；`ui_dt = 1709354538`，换算为 `2024-03-02 12:42:18 CST` | UI 仍有维护痕迹，但核心 patch / viewer 数据已停更，不适合作为 2026 年主数据源 |
| Byteglow 更新状态 | about / shared bundle 仍在发布，可见记录到 `2026-04-08`，并出现较新的战役名 | 仍在维护，适合做竞品和链路参考，但仍不是上游 |
| Kleho 个人数据同步 | `Support URL` -> 提取 `user_id` 与 `device_hash` -> 调官方 play server / `getuserdetails` -> POST 回站内接口 | 不是手工录入；也不是“只靠一个游戏 ID” |
| Byteglow 导入方式 | 支持 `Support URL`、`User ID + Hash`、`webRequestLog.txt`；about 页面说明数据只保存在浏览器 | local-first 形态可借鉴，导入口径与本仓库方向一致 |
| Byteglow 官方接口 | bundle 中可见 `getDefinitions`、`getuserdetails`、`getcampaigndetails`、`getallformationsaves`、`getpatrondetails` 等调用 | 社区工具站核心能力来自官方客户端接口 + 自己的归一化 / 缓存 / 规则层 |
| 凭证风险 | bundle 中还能看到 `claimdailyloginreward`、`redeemcoupon`、`purchasepatronshopitem`、`savemodron` 等写接口 | `user_id + hash (+ instance_id)` 不是普通公开 ID，而是敏感凭证 |

## 产品文案与导入口径

- 正确说法：导入 `Support URL`、上传 `webRequestLog.txt`、手动填写 `User ID + Hash`。
- 不准确说法：输入游戏 ID 读取账号。
- 原因：个人数据读取至少需要 `user_id + device_hash/hash`，部分接口还要结合 `instance_id`；它们更接近客户端凭证，而不是普通公开编号。

## 推荐的数据分层

- 第一层：官方原始 definitions 快照；建议保存在 `tmp/idle-champions-api/*.json`，用于 diff、回溯和 schema 变更排查。
- 第二层：归一化公共数据；输出到 `public/data/version.json` 与 `public/data/v1/*.json`，字段少而稳，供前端直接消费。
- 第三层：人工补充 / 覆写层；用于阵型布局补丁、中文缺口、筛选标签、推荐规则等仓库内维护数据；与抓取脚本分离。
- 第四层：个人数据本地导入；凭证只在浏览器本地解析和使用，不经过服务端。

## 本仓库建议实现

- 公共数据流水线：官方 definitions -> 保存原始快照 -> 归一化 -> 应用必要 overrides -> 构建 / 发布。
- 个人数据流水线：用户导入 `Support URL` / `webRequestLog.txt` / `User ID + Hash` -> 浏览器本地解析凭证 -> 浏览器直接请求官方 `user details / campaign details` -> 写入 `IndexedDB` -> 供阵型、筛选、成长建议页面消费。
- 最小可运行骨架：`scripts/fetch-idle-champions-definitions.mjs`、`scripts/normalize-idle-champions-definitions.mjs`、`scripts/build-idle-champions-data.mjs`、`scripts/data/manual-overrides.json`。
- 中文补充说明：`language_id=7` 的官方中文链路已另文核实，优先用官方中文，再对缺口做人工补充，详见 `docs/research/data/language-id-7-chinese-definitions-research.md`。

## 风险与边界

- 这些接口来自官方域名，但目前没有查到公开、稳定承诺的开发者文档；必须自做 schema 校验、版本记录、失败回退和变更 diff。
- 凭证应视为高风险数据：不上传服务端、不写进公开日志、不暴露在 URL、不做公开分享，并在页面明确提醒用户这不是普通公开 ID。
- Byteglow 即使仍在更新，也不应成为正式上游；可借鉴其接口链路、local-first 形态和功能拆分，不应依赖其 bundle 结构或站内缓存格式。

## 最终建议

1. 公共基础数据直接对接官方 definitions。
2. 个人数据坚持浏览器本地导入、本地请求、本地存储。
3. 产品文案统一写成 `Support URL` / `User ID + Hash` / 日志导入，而不是“输入游戏 ID”。
4. 保留人工补充层；阵型布局和变体说明不要强行全靠原始 definitions 自动生成。
5. 第三方站点只做参考，不做核心依赖。

## 可验证来源

- [Byteglow About](https://ic.byteglow.com/about)
- `https://ic.byteglow.com/assets/about-6HSy6j3N.js`
- `https://ic.byteglow.com/assets/shared-Cy--Fesr.js`
- `https://ic.byteglow.com/assets/user-DYXSUNyj.js`
- [Kleho 首页](https://idle.kleho.ru/)
- `https://idle.kleho.ru/assets/dist/build.js?v=1709354538`
