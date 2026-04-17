# 静态站数据存储方案

- 日期：2026-04-12
- 约束：静态站、无后端、数据更新频率低、第一阶段优先结构清晰与可维护。
- 当前结论：公共数据使用版本化 JSON；个人数据使用浏览器本地存储；第一阶段不引入数据库和服务端。

## 决策

- 公共数据：放 `public/data/`，采用 `version.json + 版本目录`，前端运行时 `fetch`。
- 个人数据：放浏览器本地，正式方向使用 `IndexedDB`。
- 第一阶段不做：PostgreSQL、Prisma、GraphQL、浏览器端 SQLite WASM、把全部 JSON 在构建期打进 JS 包。

## 为什么是版本化 JSON

- 当前公共数据主要是英雄基础信息、冒险 / 变体限制、阵型布局、枚举与规则标签；它们都是低频写、高频读、量级可控、适合脚本产出的静态数据。
- 运行时 `fetch` 比构建期直接 `import` 更适合：数据与页面构建解耦、浏览器可独立缓存、版本切换和数据回滚更自然。

## 目录与文件合同

```text
public/
  data/
    version.json
    v1/
      champions.json
      variants.json
      formations.json
      enums.json
```

- `version.json`：声明当前启用版本、更新时间、必要说明；建议始终 `cache: 'no-store'` 读取。
- `v1/`：当前版本的数据目录；未来结构有破坏性变化时再新增 `v2/`、`v3/`。
- 集合文件建议统一成“包裹对象”，至少包含 `items` 与 `updatedAt`，避免直接暴露裸数组。

## 前端加载合同

- 不要写死 `/data/...`；GitHub Pages 项目站会带仓库前缀。
- `src/data/client.ts` 是路径拼接、版本读取和内存缓存的主入口；页面层不要各自手写 `fetch`。
- 类型定义以 `src/domain/types.ts` 及其拆分文件为准；页面只消费归一化结果，不直接拼装原始 definitions。
- 集合文件可按默认缓存策略读；版本文件和强一致性检查可以显式关闭缓存。

## 更新工作流

- 预期链路：抓官方 definitions 原始快照 -> 归一化 -> 应用必要 overrides -> 写入 `public/data/v1/*.json` -> 运行校验 / 构建 -> 提交并发布。
- 相关脚本：`scripts/fetch-idle-champions-definitions.mjs`、`scripts/normalize-idle-champions-definitions.mjs`、`scripts/build-idle-champions-data.mjs`。
- 覆写数据：`scripts/data/manual-overrides.json`；它与抓取 / 归一化结果分层存放，不混进脚本实现细节。
- 对外只记一个统一入口：`npm run data:official`。

## 个人数据边界

- 适合放 `IndexedDB`：已拥有英雄、装备等级、已保存阵容、偏好设置、自定义目标或备注。
- 不建议长期依赖 `localStorage` 承担正式个人画像或草稿持久化。
- 推荐顺序：先落公共数据加载，再补阵型 / 方案存储，最后扩完整个人画像。
- 不上传服务端、不把凭证写进分享链接、不把敏感字段落到公开日志。

## 缓存与演进

- 第一阶段不把 Service Worker 当默认前提；先把目录、版本和缓存语义做稳。
- 如果后续要支持旧草稿恢复或兼容回放，只保留必要的历史版本目录，不把所有旧版本二进制永久堆在仓库里。

## 推荐结论

- 版本化 JSON + 运行时加载 + `IndexedDB` 最符合当前静态站 / local-first / GitHub Pages 约束。
- 真正需要长期稳定的不是数据库，而是清晰的数据目录、可靠的脚本入口和可验证的加载合同。
