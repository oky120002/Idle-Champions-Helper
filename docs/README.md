# docs 文档目录说明

本目录按“用途优先、主题次级归类”组织；`docs/README.md` 只保留总入口，不再在根索引里重复展开全部文件。

## 读取顺序

- 想知道项目是什么、怎么启动：先看 `README.md`
- 想知道仓库级硬约束：看 `AGENTS.md`
- 想知道文档职责、精简规则和加载策略：看 `docs/product/documentation-governance.md`
- 想排查流程、环境、部署问题：看 `docs/troubleshooting-log.md`

## 专题入口

- `docs/product/README.md`：产品范围、路线图、移动端规则、文档治理
- `docs/research/README.md`：数据、部署、测试等调研结论
- `docs/modules/README.md`：模块设计稿与模块级资料入口
- `docs/investigations/README.md`：运行环境、仓库历史问题与验证记录

## 放置规则

- `docs/product/`：回答“项目要做什么、范围如何裁剪、有哪些全局规则”
- `docs/research/`：回答“外部事实是什么、技术或数据该怎么选”
- `docs/modules/`：回答“某个模块准备怎么做、设计与验收是什么”
- `docs/investigations/`：回答“某个问题为什么发生、怎么复现和确认”
- `docs/` 根目录：只保留跨主题入口文档，例如 `docs/README.md` 与 `docs/troubleshooting-log.md`

## 命名与维护

- 目录名、文件名统一使用 kebab-case
- 调研类文件使用 `主题-research.md`
- 排查或确认类文件使用 `主题-investigation.md` 或 `主题-verification.md`
- 模块设计稿优先使用 `docs/modules/<module>/<module>-design.md`
- 历史性排查文档要标注“当前是否仍有效”
- 某个主题文档变多时，优先先更新对应目录下的 `README.md`，再决定是否继续拆分
