# 数据来源：风险边界与可验证来源

- 作用：沉淀对接官方与第三方来源时必须留意的安全边界、风险点，以及可复核的外部来源。

## 相关决策

公共 / 个人数据流水线与最终建议已落定，来源策略见 `decisions/0002-data-source-strategy.md`，存储与分层见 `decisions/0003-static-data-storage.md`。归一化管线规则见 `specs/guidelines/data-normalization.md`。本文件只保留风险与来源事实。

## 风险与边界

- 这些接口来自官方域名，但目前没有查到公开、稳定承诺的开发者文档；必须自做 schema 校验、版本记录、失败回退和变更 diff。
- 凭证应视为高风险数据：不上传服务端、不写进公开日志、不暴露在 URL、不做公开分享，并在页面明确提醒用户这不是普通公开 ID。
- Byteglow 即使仍在更新，也不应成为正式上游；可借鉴其接口链路、local-first 形态和功能拆分，不应依赖其 bundle 结构或站内缓存格式。

## 可验证来源

- [Byteglow About](https://ic.byteglow.com/about)
- `https://ic.byteglow.com/assets/about-6HSy6j3N.js`
- `https://ic.byteglow.com/assets/shared-Cy--Fesr.js`
- `https://ic.byteglow.com/assets/user-DYXSUNyj.js`
- [Kleho 首页](https://idle.kleho.ru/)
- `https://idle.kleho.ru/assets/dist/build.js?v=1709354538`
