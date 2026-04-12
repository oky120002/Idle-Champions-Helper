# Idle Champions 基础游戏数据来源调研

- 调研日期：2026-04-12
- 调研目标：确认《Idle Champions》辅助站的基础游戏数据、个人数据读取方式、第三方站点的数据更新链路，以及本仓库应采用的实现方案。
- 调研对象：
  - `https://ic.byteglow.com/`
  - `https://idle.kleho.ru/`
  - 两站公开页面与前端 bundle 中可验证的请求链路

---

## 1. 结论先行

### 1.1 公共基础数据

- 不建议再把 `Kleho` 作为主数据源。
- 目前更可靠的路线是：**直接调用 Idle Champions 官方客户端 definitions 接口，抓取原始 definitions，再在本仓库内做归一化与补充层。**
- 第三方站点可以作为：
  - 页面设计与信息架构参考
  - 字段推断与规则校验参考
  - 版本更新是否跟上的辅助观察对象
- 但**不应**作为正式上游依赖。

### 1.2 个人数据

- 不是“只靠一个游戏 ID”就能读到账号数据。
- 目前能确认的读取方式至少需要：
  - `user_id`
  - `device_hash` / `hash`
- 部分接口还需要先拿到 `instance_id`。
- 这类值本质上更接近**客户端凭证**，不是可以公开传播的普通玩家编号。

### 1.3 对本仓库的推荐方案

- 公共数据：官方 definitions 接口 -> 原始快照 -> 归一化 JSON -> `public/data/version.json + public/data/v1/*.json`
- 个人数据：浏览器本地导入 `Support URL` / `webRequestLog.txt` / 手填 `User ID + Hash` -> 浏览器本地解析与存储
- 不引入后端数据库，不把账号凭证上传到你的服务端

---

## 2. 已验证事实

### 2.1 Kleho 的核心数据更新已经停在 2022 年 12 月

- `https://idle.kleho.ru/` 首页直接暴露了 `APP_INFO.patch_dt = 1670669709`
- 时间换算结果是：`2022-12-10 18:55:09 CST`
- 同一处还能看到 `ui_dt = 1709354538`
- 时间换算结果是：`2024-03-02 12:42:18 CST`

这说明：

- Kleho 的前端 UI 之后仍有维护痕迹
- 但它引用的 patch / viewer 核心数据没有继续跟新
- 因此它不适合作为 2026 年仍在更新的基础游戏数据主来源

### 2.2 Byteglow 仍在持续更新

- Byteglow 的 about 页面 bundle 仍在正常发布
- 它的共享 bundle 内置了更新记录，最近一条可见记录到 `2026-04-08`
- bundle 中还出现了 `Tales of the Champions` 等较新战役名

这说明：

- Byteglow 当前仍在跟新
- 它不是一个已经停更的“历史站点”

### 2.3 Kleho 的个人数据同步链路

通过 `idle.kleho.ru` 前端 bundle，可以确认它的同步流程大致是：

1. 用户提供 `Support link`
2. 前端从链接中提取：
   - `user_id`
   - `device_hash`
3. 前端请求：
   - `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions...`
4. 再请求：
   - `https://ps18.idlechampions.com/~idledragons/post.php?call=getuserdetails&...&user_id=...&hash=...`
5. 站点把解析结果 POST 回自己的接口：
   - `/v01/account/update-profile-details`

因此可以确认：

- Kleho 不是纯手工录入个人数据
- 它直接调用了游戏官方域名上的客户端接口
- 个人数据读取依赖 `user_id + hash`，不是单个 ID

### 2.4 Byteglow 的个人数据导入方式

Byteglow 的 about 页面和 user 页面 bundle 能确认以下事实：

- 支持“提供凭证”或“手动上传用户数据”
- about 页面明确写明：用户数据只保存在浏览器，不上传到别处
- user 页面支持三类导入方式：
  - `Support URL`
  - 手动填写 `User ID + Hash`
  - Steam / Epic 的 `webRequestLog.txt`

同时 bundle 里还能看到它会从 Support URL 中提取：

- `user_id`
- `device_hash`

并将它们保存为：

- `userId`
- `hash`

### 2.5 Byteglow 直接调用的官方接口

Byteglow bundle 中能直接看到这些配置或调用：

- `master.idlechampions.com/~idledragons/`
- `ps21.idlechampions.com/~idledragons/`
- `post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999`
- `post.php?call=getuserdetails&instance_key=1`
- `post.php?call=getcampaigndetails&game_instance_id=1&instance_id=1`
- `post.php?call=getallformationsaves`
- `post.php?call=getpatrondetails`

这说明：

- Byteglow 的基础数据不是单纯爬站内页面得来的
- 它直接依赖官方客户端 definitions / details 接口
- 它还在这些官方返回之上做了自己的归一化、缓存和补充计算层

### 2.6 凭证不是普通公开 ID

Byteglow bundle 里还能看到这类写接口：

- `claimdailyloginreward`
- `redeemcoupon`
- `purchasepatronshopitem`
- `savemodron`

这意味着：

- `user_id + hash (+ instance_id)` 不只是只读标识
- 这组值具备账号写操作能力
- 不能把它们当成“随便输一个游戏 ID”这种低风险字段

---

## 3. 对“是不是只靠游戏 ID 就能读数据”的判断

答案：**不是。**

更准确地说：

- 公共 definitions 数据不需要你的个人账号凭证
- 但个人账号数据读取至少需要 `user_id + device_hash/hash`
- 某些功能还要结合 `instance_id`

很多工具站看起来像“只要一个 ID”，通常是因为它们做了下面这些事情之一：

- 让用户粘贴完整 `Support URL`，站点再自动拆参数
- 让用户上传 `webRequestLog.txt`，站点从日志里提取凭证
- 让用户手动输入 `User ID + Hash`

所以你后续在产品文案里应该写：

- “导入 Support URL”
- “上传本地日志”
- “手动填写 User ID + Hash”

而不是写：

- “输入游戏 ID 读取账号”

---

## 4. 推荐的数据分层方案

### 4.1 第一层：官方原始 definitions 快照

职责：

- 只负责把官方接口原样拉下来
- 不在这一层直接混入前端业务字段
- 保留时间戳、请求地址、play server 信息

建议存放：

- `tmp/idle-champions-api/*.json`

这样做的价值：

- 出问题时能回看原始返回
- 后续字段变动时方便 diff
- 不会把“官方原始字段”和“你自己的归一化字段”混在一起

### 4.2 第二层：归一化公共数据

职责：

- 从 definitions 里提取前端真正需要的公共结构
- 输出稳定、可版本化、可文档化的 JSON

建议输出到：

- `public/data/version.json`
- `public/data/v1/champions.json`
- `public/data/v1/variants.json`
- `public/data/v1/formations.json`
- `public/data/v1/enums.json`

这一层应尽量保持：

- 字段少而稳
- 语义清晰
- 不直接暴露一堆原始噪音字段

### 4.3 第三层：人工补充 / 规则补充层

官方 definitions 并不一定能直接满足页面需求。

建议保留一层仓库内可维护的补充数据，用来承载：

- 阵型布局补录
- 变体限制文本整理
- 中文名 / 中文标签
- 页面筛选标签
- 推荐逻辑需要的派生规则

这层建议与自动抓取结果分离，而不是把人工补丁直接写进抓取脚本里。

### 4.4 第四层：个人数据本地导入

推荐路线：

- 用户在浏览器里导入 `Support URL`
- 或上传 `webRequestLog.txt`
- 或手动填写 `User ID + Hash`
- 浏览器直接调用官方客户端接口
- 结果只写入本地存储，例如 `IndexedDB`

不要做：

- 先上传到你的服务端再转发
- 把凭证写进分享链接
- 记录到服务端日志
- 默认自动轮询同步

---

## 5. 本仓库建议采用的实现方式

### 5.1 公共数据工作流

```text
官方 definitions 接口
  ↓
保存原始快照
  ↓
归一化到 public/data/v1/*.json
  ↓
补充人工 overrides
  ↓
构建 / 发布
```

### 5.2 个人数据工作流

```text
用户导入 Support URL / webRequestLog.txt / User ID + Hash
  ↓
浏览器本地解析凭证
  ↓
浏览器直接请求官方 user details / campaign details 接口
  ↓
写入 IndexedDB
  ↓
供阵型、筛选、成长建议页面消费
```

### 5.3 当前仓库的最小可运行骨架

本次实现建议包含三部分：

- `scripts/fetch-idle-champions-definitions.mjs`
  - 拉官方 definitions 原始快照
- `scripts/normalize-idle-champions-definitions.mjs`
  - 把原始快照转换为前端数据文件
- `scripts/data/manual-overrides.json`
  - 承载手工补充数据

如果需要一键串起来，再补：

- `scripts/build-idle-champions-data.mjs`

---

## 6. 风险与边界

### 6.1 接口是“官方客户端接口”，不是公开文档 API

当前能确认的是：

- 这些接口来自官方域名
- 社区工具站正在使用

但目前**没有查到公开、正式、稳定承诺的官方开发者文档**。

这意味着：

- 字段可能变
- 鉴权方式可能变
- 频率限制可能变

所以你必须自己做：

- schema 校验
- 版本记录
- 失败回退
- 变更 diff

### 6.2 个人凭证是高风险数据

由于 bundle 中能看到写接口调用能力，因此：

- `user_id`
- `hash`
- `instance_id`

都应视作敏感字段。

最低要求：

- 不上传服务端
- 不持久写到公开日志
- 不暴露在 URL
- 不做公开分享
- 页面上明确提醒用户这不是普通公开 ID

### 6.3 第三方站点不能做核心依赖

即使 Byteglow 现在还在更新，也不建议依赖：

- 它的私有前端字段结构
- 它的 bundle 组织方式
- 它的站内数据缓存格式

你能借鉴的是：

- 它验证过的接口链路
- 它 local-first 的产品形态
- 它归一化和功能拆分思路

不是把它当上游。

---

## 7. 最终建议

1. **公共基础数据直接对接官方 definitions 接口。**
2. **个人数据坚持浏览器本地导入、本地请求、本地存储。**
3. **不要把“输入游戏 ID”当作产品说法，准确说法应是 Support URL / User ID + Hash 导入。**
4. **保留人工补充层，阵型布局和变体说明不要强行全靠原始 definitions 自动生成。**
5. **不要把核心能力建立在第三方站点页面或私有 bundle 结构上。**

---

## 8. 本次调研用到的可验证来源

- Byteglow about 页面：`https://ic.byteglow.com/about`
- Byteglow about bundle：`https://ic.byteglow.com/assets/about-6HSy6j3N.js`
- Byteglow shared bundle：`https://ic.byteglow.com/assets/shared-Cy--Fesr.js`
- Byteglow user bundle：`https://ic.byteglow.com/assets/user-DYXSUNyj.js`
- Kleho 首页：`https://idle.kleho.ru/`
- Kleho 前端 bundle：`https://idle.kleho.ru/assets/dist/build.js?v=1709354538`
