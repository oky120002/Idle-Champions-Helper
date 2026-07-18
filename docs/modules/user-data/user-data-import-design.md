# 本地优先的个人数据导入方案

- 方案日期：2026-04-13
- 目标：在不要求用户把真实 `User ID / hash` 发给第三方的前提下，为辅助站建立个人数据导入能力。
- 页面壳层：个人数据页现已纳入全站页面工作台规范；当前小导航、工具条、无左栏模式与右区滚动见 `docs/modules/shared-components/page-workbench-design.md`，统一推广与旧实现清退见 `docs/modules/shared-components/filter-workbench-rollout-plan.md`。

## 1. 设计原则

- **本地优先**：凭证解析、导入校验和数据存储都优先在浏览器内完成
- **最小暴露**：不把 `user_id`、`hash`、`instance_id` 上传到你的服务端
- **无后端代理**：生产站不保存、不转发、不代理凭证；真实同步只能由浏览器前端在用户手动触发时请求官方只读接口
- **双模式隔离**：生产模式只允许浏览器内真实同步；本地开发模式才允许读取开发者自备的私有 mock / token 抓取结果
- **先解析、后接导入源**：先把导入方式和格式校验打通，再扩展离线文件、日志片段或其他本地输入
- **先脱敏样本、后真实输入**：开发阶段优先使用脱敏示例和本地文本片段调试

## 2. 推荐导入方式

### Support URL

优先级最高，原因：

- 用户最容易理解
- 最贴近游戏内已有操作
- 解析逻辑最简单

当前需要提取的核心字段：

- `user_id`
- `device_hash` / `hash`
- 可选：`network`

### 手动填写 User ID + Hash

适用场景：

- 用户已经知道这两个字段
- 不想直接粘贴完整 Support URL

这一路径应该只做：

- 基本格式校验
- 脱敏显示
- 明确风险提示

### 日志文本 / `webRequestLog.txt`

适用场景：

- Steam / Epic 等桌面端
- 后续要做文件拖放导入

当前阶段建议：

- 先支持“粘贴日志文本片段”
- 后续再接文件拖放

这样可以先验证正则提取和异常处理，不急着把文件系统导入复杂度带进来。

## 3. 双模式边界

### 生产模式

- 站点部署到 GitHub Pages 后，真实用户数据只能由用户本人在浏览器里点击明确入口触发。
- 前端只允许请求官方只读接口，不经过本项目后端，不写入静态资源，不落仓库文件。
- 同步结果只进入当前浏览器 `IndexedDB`；不自动刷新，不后台轮询，不自动保存敏感凭证。

### 本地开发模式

- 为了支撑 planner 和用户数据功能开发，允许开发者使用自己的私有 token / 凭证在本地抓取一份私有用户数据。
- 这份私有数据只能保存在被忽略的本地路径，例如 `tmp/private-user-data/**` 或 `*.local` 文件。
- 本地开发刷新私有快照时，触发入口必须是 dev-only 明确动作；Vite dev 可以通过本机环境变量抓取并更新 `tmp/private-user-data/latest/`，但这条入口不得出现在生产构建。
- 本地 Vite 开发可以读取这份私有数据，但它默认不应覆盖浏览器 `IndexedDB` 中的真实同步快照；生产构建不得包含这条开发专用读取链路。
- 本地抓取结果的数据结构必须与生产模式真实同步后的浏览器快照兼容，避免开发态和生产态出现两套模型。
- 开发态若同时存在浏览器同步快照和本地开发快照，下游必须通过显式数据源选择决定当前消费哪一条，不能靠同一个存储 key 的覆盖顺序来判断。

## 4. 当前实现边界

本仓库当前这一版只实现：

- Support URL 本地解析
- 手动凭证校验
- 日志文本提取 `user_id / hash`
- 脱敏结果预览
- 用户手动触发官方只读同步
- 归一化用户快照写入 IndexedDB
- 开发态显式刷新本地私有快照，并通过单独来源切换消费它

明确不做：

- 不自动保存敏感凭证
- 不接服务端转发
- 不做后台轮询同步

官方请求只在浏览器前端、用户点击手动同步后发生。项目仍不引入后端、不代理、不自动刷新。

补充说明：2026-06-01 复核 Byteglow `/user` bundle 后，确认其 `MuiIconButton-edgeEnd` 是 `User ID / Hash` 可见性切换，不是取数触发；实际抓取由 Support URL 粘贴链路或 `Save and fetch` 按钮完成。本仓库出于更严格的生产隐私边界，仍保留“先解析，再手动同步”的显式按钮链路。

同步地址发现补充：官方 play server 不是稳定写死在某个 `ps21/ps28/...` host 上。当前浏览器同步与本地开发抓取都应先调用 `getPlayServerForDefinitions` 发现初始 host；如果 `getuserdetails` / `getcampaigndetails` / `getallformationsaves` 返回 `switch_play_server` 且当前 payload 仍缺目标数据，再切到返回的官方 host 重试。出于隐私边界，代码只能跟随 `https://ps*.idlechampions.com/~idledragons/` 这类官方地址，不能信任任意返回 URL。

## 5. 后续真实同步推荐链路

```text
用户在浏览器里导入 Support URL / 日志文本 / 手动填写
  ↓
前端本地提取 user_id + hash
  ↓
用户手动触发官方只读同步
  ↓
归一化个人数据
  ↓
写入 IndexedDB
  ↓
页面消费本地画像
```

## 6. 本地开发 mock 链路

```text
开发者本地 token / .local 凭证
  ↓
本地脚本抓取官方只读 payload
  ↓
写入 tmp/private-user-data/**（忽略路径）
  ↓
Vite serve 仅开发态暴露本地 dev endpoint
  ↓
浏览器里的开发入口显式切换到本地开发快照源
  ↓
复用同一套 normalizer 解析为运行时用户画像
  ↓
仅当前开发来源解析层消费，不覆盖浏览器真实同步快照
```

这条链路只为本地开发存在。发布后的站点必须完全没有这个入口和读取能力。

## 7. 开发态来源选择规则

- 默认来源应为 `browser-sync`，这样本地开发默认贴近生产行为。
- 只有当开发者显式切换到 `local-dev-snapshot` 时，下游页面才允许消费本地开发快照。
- `browser-sync` 继续只写浏览器 `IndexedDB`。
- `local-dev-snapshot` 继续只读本地忽略文件，不写浏览器快照位。
- planner、个人数据页状态区和其他下游模块应统一通过来源解析层读取“当前选中的画像来源”。

## 8. 安全边界

最低要求：

- 不把凭证出现在分享链接里
- 不写进服务端日志
- 不自动上传到后端
- 不自动保存凭证
- 不自动后台刷新私人数据
- 开发调试优先使用脱敏样本
- 真机调试优先让用户在本地页面自行输入，而不是通过聊天传递

## 9. 当前仓库对应文件

- `src/pages/UserDataPage.tsx`
- `src/pages/user-data/` 下 9 个组件（UserSyncPanel、LocalDevSnapshotSection、useUserSyncModel(.prod)、userSyncLocalDevAction(.prod)、UserDataWorkbench、UserImportFields、UserImportResultPanel、useUserDataPageModel、user-import-model 等）
- `src/data/userImport.ts`
- `src/data/user-sync/`（officialClient.ts、officialPlayServer.ts、userProfileNormalizer.ts、localDevPrivateSnapshot.ts）
- `src/data/user-profile-store/`（userProfileSourceResolver.ts(+.prod.ts)、userProfileStore.ts）
- `scripts/private-user-data/`（fetch-user-profile-payloads.mjs、private-user-profile-payloads.mjs、production-boundary-scanner.mjs 等）
- `docs/research/data/game-data-source-investigation.md`
- 当前设计稿路径：`docs/modules/user-data/user-data-import-design.md`
