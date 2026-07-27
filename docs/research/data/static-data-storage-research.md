# 静态站数据存储：目录、加载与工作流事实

- 约束：静态站、无后端、数据更新频率低、优先结构清晰与可维护。

## 相关决策

存储方案（版本化 JSON + `IndexedDB` + 四层分层，不引入数据库）见 `decisions/0003-static-data-storage.md`；数据来源策略见 `decisions/0002-data-source-strategy.md`。本文件只保留目录、加载、工作流与边界的事实描述，供实现核对。

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
- 集合文件统一成"包裹对象"，至少包含 `items` 与 `updatedAt`，避免直接暴露裸数组。例外：`effect-reference.json`（`{stats, buffs, effectKeys, updatedAt}`）、`patron-perks.json`（`{tiers, perks, updatedAt}`）、`trials.json`（`{roles, difficulties, updatedAt}`）是 multi-category 字典，有意按各自分类键组织，不强制套用 `items`。

## 前端加载合同

- 不要写死 `/data/...`；GitHub Pages 项目站会带仓库前缀。
- `src/data/client.ts` 是路径拼接、版本读取和内存缓存的主入口；页面层不要各自手写 `fetch`。
- 类型定义以 `src/domain/types.ts` 及其拆分文件为准；页面只消费归一化结果，不直接拼装原始 definitions。
- 集合文件可按默认缓存策略读；版本文件和强一致性检查可以显式关闭缓存。

## 更新工作流

- 链路：抓官方 definitions 原始快照 -> 归一化 -> 应用必要 overrides -> 写入 `public/data/v1/*.json` -> 运行校验 / 构建 -> 提交并发布。
- 相关脚本：`scripts/fetch-idle-champions-definitions.ts`、`scripts/normalize-idle-champions-definitions.ts`、`scripts/build-idle-champions-data.ts`。
- 覆写数据：`scripts/data/manual-overrides.json`；它与抓取 / 归一化结果分层存放，不混进脚本实现细节。
- 对外只记一个统一入口：`npm run data:official`。

## 个人数据边界

- 适合放 `IndexedDB`：已拥有英雄、装备等级、已保存阵容、偏好设置、自定义目标或备注。
- 不建议长期依赖 `localStorage` 承担正式个人画像或草稿持久化。
- 不上传服务端、不把凭证写进分享链接、不把敏感字段落到公开日志。

## 缓存边界

- 当前不把 Service Worker 当默认前提；先把目录、版本和缓存语义做稳。
- 旧版本二进制不永久堆在仓库里；新版本上线时允许清理旧版本资源目录。
