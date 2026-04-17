# 数据来源：决策、事实与分层

- 日期：2026-04-12
- 目标：确认基础游戏数据、个人数据读取方式、第三方站点链路，以及推荐的数据分层。

## 核心决策

- 公共基础数据：官方 definitions 接口 -> 原始快照 -> 归一化 JSON -> `public/data/version.json + public/data/v1/*.json`。
- 个人数据：`Support URL` / `webRequestLog.txt` / `User ID + Hash` 导入 -> 浏览器本地解析 -> 浏览器直接请求官方接口 -> 写入 `IndexedDB`。
- 第三方站点：可用于页面结构参考、字段推断、规则校验和版本更新观察；不应作为正式依赖。

## 已核实事实

| 主题 | 已确认事实 | 直接含义 |
| --- | --- | --- |
| Kleho 更新状态 | `APP_INFO.patch_dt = 1670669709`；`ui_dt = 1709354538` | UI 仍有维护痕迹，但核心 patch / viewer 数据已停更，不适合作为 2026 年主数据源 |
| Byteglow 更新状态 | about / shared bundle 仍在发布，可见记录到 `2026-04-08` | 仍在维护，适合做竞品和链路参考，但仍不是上游 |
| Kleho 个人数据同步 | `Support URL` -> 提取 `user_id` 与 `device_hash` -> 调官方 play server / `getuserdetails` | 不是手工录入；也不是“只靠一个游戏 ID” |
| Byteglow 导入方式 | 支持 `Support URL`、`User ID + Hash`、`webRequestLog.txt`，数据只保存在浏览器 | local-first 形态可借鉴 |
| Byteglow 官方接口 | bundle 中可见 `getDefinitions`、`getuserdetails`、`getcampaigndetails`、`getallformationsaves` 等调用 | 社区工具站核心能力来自官方客户端接口 + 自己的归一化 / 缓存 / 规则层 |
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
