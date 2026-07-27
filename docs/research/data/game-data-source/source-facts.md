# 数据来源：已核实事实与导入口径

- 数据快照：2026-04 ~ 2026-06 复核。
- 作用：沉淀「公共 / 个人 / 第三方」三类来源的已核实事实与文案口径，供决策与实现核对。

## 相关决策

来源与分层决策见 `decisions/0002-data-source-strategy.md`（来源策略）与 `decisions/0003-static-data-storage.md`（存储与四层分层）。本文件只保留支撑决策的核实事实。

## 已核实事实

| 主题 | 已确认事实 | 直接含义 |
| --- | --- | --- |
| Kleho 更新状态 | `APP_INFO.patch_dt = 1670669709`；`ui_dt = 1709354538` | UI 仍有维护痕迹，但核心 patch / viewer 数据已停更，不适合作为 2026 年主数据源 |
| Byteglow 更新状态 | about / shared bundle 仍在发布，可见记录到 `2026-04-08` | 仍在维护，适合做竞品和链路参考，但仍不是上游 |
| Kleho 个人数据同步 | `Support URL` -> 提取 `user_id` 与 `device_hash` -> 调官方 play server / `getuserdetails` | 不是手工录入；也不是“只靠一个游戏 ID” |
| Byteglow 导入方式 | 支持 `Support URL`、`User ID + Hash`、`webRequestLog.txt`，数据只保存在浏览器 | local-first 形态可借鉴 |
| Byteglow 官方接口 | bundle 中可见 `getDefinitions`、`getuserdetails`、`getcampaigndetails`、`getallformationsaves` 等调用 | 社区工具站核心能力来自官方客户端接口 + 自己的归一化 / 缓存 / 规则层 |
| Byteglow 2026-06-01 复核 | `Support URL` 输入会直接解析并触发抓取；`Manual values` 通过 `Save and fetch` 触发；`MuiIconButton-edgeEnd` 只是敏感字段显隐按钮 | 可以借鉴“抓取与来源管理分离”的 UX，但不能误把右侧图标当成取数入口 |
| 官方 play server 发现 | `master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11` 会返回当前 play server；错服响应还会给 `switch_play_server` | 不能把 `ps21` 之类单个 host 当成长期真值；同步链路必须“先发现，再按返回跳转”，且只允许官方域名 |
| 凭证风险 | bundle 中还能看到 `claimdailyloginreward`、`redeemcoupon`、`purchasepatronshopitem`、`savemodron` 等写接口 | `user_id + hash (+ instance_id)` 不是普通公开 ID，而是敏感凭证 |

## 产品文案与导入口径

- 正确说法：导入 `Support URL`、上传 `webRequestLog.txt`、手动填写 `User ID + Hash`。
- 不准确说法：输入游戏 ID 读取账号。
- 原因：个人数据读取至少需要 `user_id + device_hash/hash`，部分接口还要结合 `instance_id`；它们更接近客户端凭证，而不是普通公开编号。
