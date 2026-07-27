# user-data 模块文档入口

- 作用：个人数据本地优先导入方案——导入方式、生产 / 开发双模式边界、实现现状与安全约束。

## 先读哪篇

- 设计原则、导入方式（`Support URL` / `User ID + Hash` / `webRequestLog`）、双模式隔离、当前实现边界与安全边界：`docs/specs/modules/user-data/user-data-import-design.md`
- 数据来源策略（浏览器本地凭证导入、不经服务端）决策：`docs/decisions/0002-data-source-strategy.md`
- 私有用户数据硬约束：`AGENTS.md` §1.1
