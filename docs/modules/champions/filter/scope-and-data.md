# 英雄筛选：定位、数据合同与页面结构

- 日期：2026-04-13
- 目标：回答“这个模块解决什么问题”“它依赖哪些公共数据”“当前页面结构怎样组织”。

## 模块定位

- 解决两个问题：一是在某个 `seat`、定位、联动队伍下有哪些英雄；二是在进入阵型编辑或推荐前先缩小候选池。
- 它不是：英雄百科详情页、黑盒推荐器、个人账号画像页。
- 当前边界：轻查询、强可组合、弱推断。

## 数据合同

### 当前输入

- `public/data/v1/champions.json`：`id`、`name`、`seat`、`roles`、`affiliations`、`tags`
- `public/data/v1/enums.json`：`roles`、`affiliations` 等筛选枚举
- `public/data/version.json`：当前数据版本

### MVP 必补字段

- 英雄公共字段：`patronEligibility`、`modeEligibilityTags`
- 枚举：`patrons`、`modes`
- 场景上下文：稳定 `scenarioId` 或 `ruleContextId`
- 规则来源：结构化规则集合，例如 `public/data/<version>/rules.json`

### 明确不接受的做法

- 从 `variants` 原文限制文本做页面侧字符串匹配
- 把 `Patron / 模式过滤` 规则散写在页面组件里
- 在没有公共数据合同的前提下先做临时 UI 开关
- 只保留展示用 `mode` 文本，不保留场景身份

### 建议的筛选上下文

```ts
type ChampionFilterContext =
  | { type: 'mode'; modeId: string }
  | {
      type: 'scenario'
      scenarioKind: 'adventure' | 'variant' | 'trial' | 'timeGate'
      scenarioId: string
      ruleContextId: string
    }
```

## 当前代码落点与页面结构

- `src/pages/ChampionsPage.tsx`：页面入口
- `src/data/client.ts`：版本读取、路径拼接、数据加载
- `src/rules/championFilter.ts`：纯筛选逻辑
- `src/features/champion-filters/`：枚举分组、筛选项、交互组件

页面结构包括：顶部说明卡、指标区、筛选区、结果区，以及内嵌的“英雄视觉档案”工作台；桌面端筛选区使用粘性侧栏，移动端退化为单列和折叠筛选，不依赖横向滑动。
