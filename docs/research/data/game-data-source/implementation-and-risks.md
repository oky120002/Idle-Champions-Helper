# 数据来源：仓库实现建议与风险

- 日期：2026-04-12
- 目标：沉淀本仓库该怎么接这套数据、有哪些安全边界，以及最终建议。

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
