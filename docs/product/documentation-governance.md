# 文档治理方案

- 方案日期：2026-04-16
- 目标：让 `AGENTS.md`、`README.md` 和 `docs/` 各司其职，减少重复、过时内容和上下文浪费。
- 当前结论：`AGENTS.md` 只保留硬约束与按需加载入口，`README.md` 只保留项目概览与高频命令，`docs/README.md` 继续作为 `docs/` 的唯一总索引。

## 1. 单一事实源

- `AGENTS.md`：仓库级长期稳定约束，不写现状清单、命令大全或模块细节。
- `README.md`：面向仓库访问者的首页，只保留项目是什么、怎么跑、怎么验证、去哪继续读。
- `docs/README.md`：`docs/` 的目录规则与总索引。
- `docs/product/idle-champions-roadmap.md`：产品范围、阶段目标和明确不做的内容。
- `docs/product/mobile-compatibility-guidelines.md`：移动端布局与横向滚动约束。
- `docs/modules/`、`docs/research/`、`docs/investigations/`：模块设计、调研结论和排查记录。

## 2. 精简原则

- 同一事实只在最合适的一处展开，其他入口只保留导航或一句摘要。
- 优先写稳定约束、工作流和入口，不写容易过时的长清单。
- 能按主题拆开的内容不要堆回 `AGENTS.md` 或 `README.md`。
- 历史问题只保留可复用结论，不在高频入口重复长过程。
- 新增规则前先判断它是否真是仓库级长期约束；否则放到对应专题文档。

## 3. 渐进式加载

- 默认只读取当前任务直接相关的文件，不预加载整棵 `docs/`。
- 需要产品范围时，读 `docs/product/idle-champions-roadmap.md`。
- 需要文档职责、更新边界或扫描触发条件时，读 `docs/README.md` 和本文。
- 需要移动端交互约束时，读 `docs/product/mobile-compatibility-guidelines.md`。
- 需要模块上下文时，读对应 `docs/modules/<module>/` 设计稿。
- 需要历史结论或外部依据时，读 `docs/research/` 或 `docs/investigations/` 下的相关文档。

## 4. 触发更新

- 改了脚本、命令、部署链路、路由策略或数据目录。
- 改了项目范围、核心页面、模块职责或关键非目标。
- 新增或删除文档，或发现多个入口在重复维护同一事实。
- 文档出现已失效命令、错误路径、会话专用绝对路径或和代码冲突的描述。
- 某个排查结论从“当前有效”变成“仅历史归档”。

## 5. 更新动作

- 先改单一事实源，再改高频入口的链接和摘要。
- 根 README 只补最小必要变化，不把 `docs/` 索引复制回仓库首页。
- 规则、调研、排查类结论都要写清适用边界，必要时标注日期。
- 如果一个主题已经需要多个长章节，优先新建专题文档，不把 `AGENTS.md` 或 `README.md` 继续做大。
