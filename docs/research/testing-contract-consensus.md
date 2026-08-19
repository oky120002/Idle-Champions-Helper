# 测试契约与异常处理的外部事实

访问日期：2026-08-19。本页只记录外部资料的事实，不替代项目规范，也不记录本项目是否采用。

**数据快照**：2026-08-19（外部文档页面）
**可信度**：✅ 已确认（引用官方或作者原始资料）

## 资料事实

| 来源 | 外部资料表达的原则 |
|---|---|
| Martin Fowler, [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) | 测试应形成分层结构：底层测试数量多、运行快、反馈细；越接近系统端到端的测试成本越高，因此数量应更少并集中验证真实用户路径。 |
| Microsoft Learn, [Best practices for exceptions](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions) | 只有在调用方能够恢复时才捕获异常；无法恢复时不要捕获，让更高层处理；可预期的常见条件优先显式判断。文档明确指出，崩溃通常比继续产生未定义行为更可靠、也更容易诊断。 |
| OWASP, [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) | 输入校验应在边界执行，同时做语法和语义校验；优先允许列表；失败输入不应进入后续业务处理。 |
| Pact, [Pact documentation](https://docs.pact.io/) | 契约测试验证消费者与提供者之间的交互契约；它补充而不是取代单元测试和完整集成测试。 |

## 资料共同覆盖的主题

- 测试层级、模块接缝和真实产物守护分别对应测试金字塔、输入校验和契约测试资料中的不同问题。
- 异常处理资料把“可恢复故障”和“不可恢复故障”区分开，并要求不可恢复故障继续向上抛出。
- 契约测试资料把跨边界的消费者—提供者交互作为验证对象，并明确其与其他测试层级的互补关系。
