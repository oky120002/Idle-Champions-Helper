# 筛选工作台跨页推广计划

- 日期：2026-04-21
- 作用：把 `Champions` 已验证的工作台壳层推广到 `立绘图鉴 / 宠物图鉴 / 变体筛选`，并作为后续实现、复核与清理旧实现的单一事实源。
- 起点设计：`docs/modules/champions/filter/workbench-shell-redesign-design.md`

## 推广目标与已锁决策

- `Champions / Illustrations / Pets / Variants` 桌面端统一进入工作台模式：紧凑头部、整页锁滚、左抽屉 + 右主区内滚、合并工具栏、悬浮返回顶部。
- 移动端继续退化为普通单列网页滚动，不套桌面工作台高度锁定。
- 四页都提供 `复制当前链接`。
- `Champions / Illustrations / Pets` 保留随机排序。
- `Variants` 保持 campaign / adventure 分组阅读，不新增随机排序或平铺模式。
- `Illustrations` 保留进英雄详情再返回时恢复 query 与右侧滚动位置。
- 推广完成后直接删除旧 `FilterSidebarLayout` 路线与不再适用的样式、结构和测试前提，不保留兼容代码。

## 实施边界

- 统一的是壳层、滚动模型、稳定动作位和交互语义，不改各页核心筛选规则、结果卡契约和业务阅读模型。
- `FilterWorkbenchShell` 升为唯一工作台壳层。
- `FilterSidebarLayout` / `FilterSidebarToolbar` 在四页迁移完成后直接退役。
- 不保留双轨布局，不保留“可能以后还会用”的旧 sidebar/workspace 兼容样式。
- 复制链接只序列化可复现页面状态：筛选条件、结果展开状态、必要 scope/view；不序列化随机顺序、滚动位置、抽屉开合状态。

## 共享组件演进

- `FilterWorkbenchShell`
  - 成为四页共用的唯一工作台壳层。
  - 负责左抽屉、右主区、顶部合并工具栏、桌面端开合按钮、右侧滚动容器与悬浮动作挂点。
  - 保持“单按钮原地切状态”的抽屉按钮实现，不回退到双按钮切换。
- results motion
  - 从当前 champions 右侧面板滚动能力中抽取通用层，供四页共享。
  - 统一支持：筛选变更回顶、结果展开/收起回顶、悬浮返回顶部、桌面右侧独立滚动。
- 退役目标
  - `FilterSidebarLayout`
  - `FilterSidebarToolbar`
  - 所有仅服务旧布局的 `filter-workspace*` 结构与样式

## 页面归位映射

| 页面 | 左顶部区 | 左主体区 | 右顶部区 | 右主体区 |
| --- | --- | --- | --- | --- |
| Champions | 条件 badge、清空、提示 | 现有 champions 筛选组件 | 标题、metrics、筛选摘要、显示全部/随机/复制链接 | 视觉档案、结果卡、空态 |
| Illustrations | 条件 badge、清空、提示 | 现有立绘筛选组件 | 标题、metrics、筛选摘要、显示全部/随机/复制链接 | 立绘结果网格、空态 |
| Pets | 条件 badge、清空、提示 | 现有宠物筛选组件 | 标题、metrics、筛选摘要、显示全部/随机/复制链接 | 宠物结果网格、空态 |
| Variants | 条件 badge、清空、提示 | 现有变体筛选组件 | 标题、metrics、筛选摘要、显示全部/复制链接 | campaign / adventure 分组结果、空态 |

## 滚动与交互统一规则

- 桌面端：
  - 工作台使用固定可视高度。
  - 左抽屉和右主区各自滚动。
  - 四页头部默认紧凑，整页 `window` 不再承担主滚动。
- 右主区统一规则：
  - 筛选变更后回到摘要区顶部。
  - `显示全部 / 收起` 后回到摘要区顶部。
  - 随机排序不强制回顶。
  - 下拉后出现悬浮 `返回顶部`，且只作用于右主区。
- 路由恢复：
  - `Illustrations` 从英雄详情返回时恢复 query 与右侧滚动位置。
  - `Champions` 延续现有详情返回恢复。
  - `Pets / Variants` 本轮只做当前页右主区滚动语义，不增加跨详情恢复逻辑。

## 清理策略

- 页面迁移完成后，直接删除旧布局组件、旧包裹层、旧类名和旧样式块。
- 旧测试若只验证 `FilterSidebarLayout` 路径，改写为工作台断言；不保留只服务旧实现的测试前提。
- 搜索仓库确认 `FilterSidebarLayout` / `FilterSidebarToolbar` 无调用后，组件与主样式一并删除。
- 不保留“兼容 champions 旧命名”的 app 级特判；工作台路由逻辑统一改为四页共享集合。

## 验收标准与测试矩阵

- 文档与结构
  - 本计划文档是跨页 rollout 的唯一展开位置。
  - `Champions` 起源设计稿只保留起源设计与局部状态说明，不再承载跨页 rollout 主事实。
- 桌面工作台
  - 四页都有统一工作台大壳。
  - 四页桌面端默认头部紧凑、整页锁滚、左右内滚。
  - 展开态与收起态都保持工具栏合并关系。
- 结果行为
  - 四页都支持 `复制当前链接`。
  - `Champions / Illustrations / Pets` 保留随机排序。
  - `Variants` 不出现随机按钮，且继续按 campaign / adventure 分组阅读。
  - 四页右主区都支持悬浮 `返回顶部`。
- 清理收口
  - 旧布局组件、旧样式、旧类名和旧测试前提被同步清退。
  - 仓库中不保留兼容组件、不保留双轨样式、不保留过时说明。
