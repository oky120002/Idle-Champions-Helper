<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- opencode/dev1 分支 npm run lint 失败（17 文件预存报错），阻断 test:regression 回归门 <!-- auto-todo:id=atd_89cba49b4c -->
  - 记录时间: `2026-07-18T15:43:39+08:00`
  - 类型: issue
  - 备注: 本次全文检索功能文件全部 lint 干净；失败均来自分支预存的其他文件，非本次改动引入。
    - 影响：test:regression（lint→typecheck→test→e2e）在 lint 阶段即失败，回归门被阻断
    - 证据：npm run lint exit 1，17 文件报错，无一落在 src/features/search、SearchPage 或本次改动文件；package-lock 仅新增 minisearch，未升级 eslint 相关依赖
    - 典型 react-hooks/set-state-in-effect：ChampionRosterFlyout.tsx:68、PlannerScenarioSelection.tsx:155
    - 典型 max-lines：userProfileNormalizer.ts(350)、placementFit.ts(640)、PlannerScenarioSelection.tsx(392)、ChampionRosterFlyout.tsx(286)
    - 典型 no-unsafe-*/no-base-to-string：src/data/user-sync/*、src/pages/champions/championRoster.ts
    - 典型 react-hooks/purity：PlannerProfileState.tsx:25
    - 其他：dev-only .prod.ts/.prod.tsx 桩 no-unused-vars/require-await、vite.config.ts no-misused-promises、privateUserProfilePayloadHelpers.ts project-service 解析错误
    - 处置：需在独立整改中统一修复以恢复回归门，不属本次检索功能范围

<!-- auto-todo:end -->
