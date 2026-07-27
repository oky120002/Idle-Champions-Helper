# 0002. 数据来源策略：官方 definitions 上游 + 浏览器本地个人数据

**Status**: Accepted
**Decided**: 2026-07-27

## 背景

产品是 local-first 静态站，需确认三件事的长期来源：公共基础数据从哪来、个人数据怎么读、第三方社区站点（Byteglow / Kleho）定什么位。依据见 `research/data/game-data-source/`。

## 决策

- 公共基础数据：以官方 `definitions` 接口为唯一上游，经「原始快照 -> 归一化 -> overrides」产出 `public/data/` 静态产物。
- 个人数据：由用户在浏览器本地导入凭证（`Support URL` / `webRequestLog.txt` / `User ID + Hash`），浏览器直接请求官方 `user details / campaign details` 接口，结果只写本地 `IndexedDB`；不经过本项目或第三方服务端。
- 第三方站点：只作页面结构、字段推断、规则校验与版本观察的参考，不作正式数据上游，也不依赖其 bundle 或缓存格式。

## 后果

- 正面：公共数据可 diff、可回溯、可重生成；个人数据凭证不出浏览器，符合 local-first 与零后端预算。
- 代价：官方接口无公开稳定文档，必须自做 schema 校验、版本记录与失败回退；凭证属敏感数据，需在产品文案与处理链路上明确风险。
- 风险：官方接口结构变化需靠 diff 与守护测试发现，不能假设长期稳定。

## 替代方案

- **第三方站点作上游**：不选——Kleho 核心数据已停更（`patch_dt` 停在旧值），Byteglow 虽在维护但仍是非官方缓存，不适合作为长期数据源。
- **服务端代抓个人数据**：不选——`user_id + hash (+ instance_id)` 是敏感客户端凭证（bundle 中可见写接口），传服务端违背 local-first 并放大凭证泄露面。
- **手工录入游戏 ID 读账号**：不选——个人接口至少需要 `user_id + device_hash/hash`，不是普通公开编号，文案必须写成凭证导入。

## 关联

- 依据：`research/data/game-data-source/source-facts.md`、`research/data/game-data-source/implementation-and-risks.md`
- 落地：`specs/guidelines/data-normalization.md`（归一化管线）、存储分层见 `decisions/0003-static-data-storage.md`
