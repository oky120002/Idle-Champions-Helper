# `language_id=7` 官方中文 definitions 链路核实

- 日期：2026-04-13
- 作用：本页只做中文链路主题入口；细节已拆到 `docs/research/data/language-id-7/`。
- 当前结论：`getDefinitions` 确实接受 `language_id=7`，返回结构与默认英文 definitions 一致，但只能覆盖大部分中文字段，不能假设全量覆盖。

## 先读哪篇

- 覆盖情况、缺口和验证方法：`docs/research/data/language-id-7/coverage.md`
- 数据结构影响、落地建议和后续待办：`docs/research/data/language-id-7/data-contract.md`
