# 共享组件模块设计稿

- 日期：2026-04-13
- 目标：治理跨页面高度重复、语义稳定的 UI 与国际化实现，减少页面层散落逻辑，同时避免为了“去重”而过度抽象。
- 当前结论：已完成四轮治理——第一轮沉淀双语展示组件；第二轮确认 `StatusBanner` 和 `FieldGroup` 适合共享；第三轮把全站页面壳层统一收口到 `PageWorkbenchShell`；第四轮把工作台内部稳定 chrome 收口到 `WorkbenchScaffold`。当前工作台结构与视觉规范见 `docs/modules/shared-components/page-workbench-design.md`。

## 模块定位

共享组件模块只承接“跨页面重复、语义稳定、未来还会继续增长”的实现，不负责：

- 单一页面内的一次性排版片段
- 语义未稳定、后续大概率会推翻的临时封装
- 只为了少写几行 JSX 的过早抽象

## 当前已确认的抽取对象

- `LocalizedText`：承接游戏数据双语展示
- `StatusBanner`：承接状态提示条结构
- `FieldGroup`：承接 `label + 控件 + hint` 字段块
- `PageWorkbenchShell`：承接全站桌面工作台外壳、左右 pane 结构与工具条语义
- `WorkbenchScaffold`：承接工作台内部稳定展示骨架，例如标题 copy、badge、复制链接按钮、sidebar header 和筛选结果头
- `WorkbenchFloatingTopButton`：承接右区统一悬浮回顶入口
- `formatSeatLabel`：保留为 helper，不为短标签增加额外 DOM
- 暂不抽：结果卡整体、优先级按钮组

## 抽取准入规则

满足下列至少两项，才进入共享组件候选：

1. 已出现在至少 2 个页面，且总重复点不少于 3 处
2. 页面继续扩张时，重复逻辑还会自然增长
3. 能定义稳定、可解释的 props，而不是页面私有变量名
4. 能明确写出测试矩阵，覆盖主路径和关键边界

出现以下任一情况时先不要抽：只是视觉相似但交互或语义不同；通用 API 还不清楚；抽出来会让调用方写更多样板代码；当前只在一个页面存在且短期无复用证据。

## 开发流程

1. 先查 `docs/modules/shared-components/shared-components-catalog.md`
2. 如果命中页面壳层或页面级布局，再查 `docs/modules/shared-components/page-workbench-design.md`
3. 盘点重复点、语义一致性和故意不抽的部分
4. 先写测试，再实现共享组件
5. 组件只承接稳定能力，不塞页面私有布局和临时文案
6. 接入页面后至少跑受影响组件 / 页面测试与 `lint` / `typecheck`
7. 同步更新 catalog 与本设计稿中的经验沉淀

## 测试要求

共享组件默认需要两层测试：

- 纯函数 / helper 测试，例如 `formatSeatLabel`
- 组件行为测试，例如语言切换、空值、包装元素、分隔符等边界

最低要求：覆盖一个默认场景、一个语言切换场景、一个副文本消失场景、一个可配置渲染方式。

## 文档治理规则

- 开发前先查 catalog；命中可用资产时默认必须复用
- 不复用时必须写清原因，例如语义不一致、现有 API 无法覆盖或强行复用会增加复杂度
- 稳定可复用的组件才进入 catalog；只是候选阶段的模式只记在 design
- 每次 API 变化都同步更新用途、核心 props、示例和使用位置

## 已沉淀的经验

- UI 文案 `{ zh, en }` 与游戏数据双语字段 `{ original, display }` 是两类文本，不要共用同一 API
- “可复用”不等于“所有重复都抽组件”；`seat` 更适合做 helper
- 组件目录和文档索引必须一起长，否则后续智能体仍会在页面里重复造轮子
- 当四个以上页面已经出现同一类工作台 chrome 时，优先抽“展示骨架”而不是抽页面业务数据；业务 copy 和指标来源继续留在页面 feature 内。
- 结果卡要按“整卡复用”而不是“局部长得像”来判断；当前字段差异仍太大
- 英雄展示优先复用 `ChampionAvatar`、`ChampionIdentity`、`ChampionPill` 这组组件，而不是重新拼头像、双语名称和回退逻辑
