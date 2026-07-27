# 文档驱动开发框架事实

- 核实日期：2026-07-27。
- 作用：记录外部框架的职责边界与可复核来源，不替本仓库作架构决策。

## GitHub Spec Kit

Spec Kit 当前工作流包含 constitution、specify、clarify、plan、tasks、analyze、checklist、implement 与 converge。constitution 固化跨功能原则；spec 描述用户需求；plan 描述技术方案；tasks 形成可执行清单；analyze 做跨产物一致性与覆盖检查；checklist 检查需求质量。

来源：https://github.com/github/spec-kit/blob/main/README.md、https://github.com/github/spec-kit/blob/main/spec-driven.md、https://github.com/github/spec-kit/blob/main/templates/spec-template.md。

## Superpowers

Superpowers 将探索、设计、实施计划和执行分开：先理解现有仓库并澄清需求，设计稿经检查与确认后提交；实施计划按可验证的小任务拆解，明确文件、测试、命令和提交；执行前审查计划，实施过程遵守 TDD。

来源：https://github.com/obra/superpowers/blob/main/README.md 及 `skills/brainstorming`、`skills/writing-plans`、`skills/executing-plans`。

## Diátaxis、ADR 与文档即代码

Diátaxis 按读者意图区分 tutorial、how-to、reference、explanation，避免一篇文档同时承担学习、操作、查表和背景解释。ADR 用不可变记录保存重要决策的背景、选择与后果，改变决策时新增记录并标记替代关系。GitLab 文档工作流把文档纳入 Definition of Done，与代码在同一变更中接受 review、lint 和测试。

来源：https://diataxis.fr/、https://adr.github.io/、https://docs.gitlab.com/development/documentation/workflow/。
