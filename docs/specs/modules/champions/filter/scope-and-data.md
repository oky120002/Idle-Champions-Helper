# 英雄筛选：定位、数据合同与页面结构

- 目标：回答“这个模块解决什么问题”“它依赖哪些公共数据”“当前页面结构怎样组织”。

## 模块定位

- 解决两个问题：一是在某个 `seat`、定位、联动队伍下有哪些英雄；二是在进入阵型编辑或推荐前先缩小候选池。
- 它不是：英雄百科详情页、黑盒推荐器、个人账号画像页。
- 当前边界：轻查询、强可组合、弱推断。

## 数据合同

### 当前输入

- `public/data/v1/champions.json`：`id`、`name`、`seat`、`roles`、`affiliations`、`tags`、`patronEligibility`
- `public/data/v1/enums.json`：`roles`、`affiliations`、`patrons`（`{id, original, display}` 格式，带独立 id）
- `public/data/version.json`：当前数据版本

## 当前代码落点与页面结构

- `src/pages/ChampionsPage.tsx`：页面入口
- `src/data/client.ts`：版本读取、路径拼接、数据加载
- `src/rules/championFilter.ts`：纯筛选逻辑
- `src/features/champion-filters/`：枚举分组、筛选项、交互组件

页面使用统一工作台结构：桌面端为”上方紧凑小导航 + 下方页面工作台壳层”，左侧是筛选抽屉与状态头，右侧是结果 metrics + 结果卡网格（卡片内嵌立绘背景）+ 空态；移动端退化为单列网页滚动。共性壳层细节见 `docs/specs/modules/shared-components/page-workbench-design.md`。
