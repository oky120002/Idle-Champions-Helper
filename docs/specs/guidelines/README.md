# specs/guidelines/ —— 开发规范

系统级开发规范。每条规范是一个叶子文档，描述「当前怎样做」。

## 文档

- [`ai-first-ts-tsx.md`](./ai-first-ts-tsx.md)：TS/TSX 编码规范
- [`ai-first-css.md`](./ai-first-css.md)：CSS 编码规范
- [`testing.md`](./testing.md)：测试组织、glob 与类型门控
- [`data-normalization.md`](./data-normalization.md)：数据归一化管线
- [`mobile-compatibility.md`](./mobile-compatibility.md)：移动端兼容
- [`design/`](./design/)：视觉设计规范（导航、页头指标）

## 规则

- 只描述当前规范，不写迁移叙事
- 规范变了 → 原地更新（不新建 ADR，除非是架构级决策）
- 代码/配置是事实源，规范描述与之同步
