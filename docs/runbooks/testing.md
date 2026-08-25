# 测试与发布门禁

测试组织、运行器 glob 和类型门控规则见 `docs/specs/guidelines/testing.md`；测试层级、契约、不变量和异常判定见 `docs/specs/guidelines/testing-methodology.md`；本页只说明怎样执行。

## 常用范围

| 目的 | 命令 |
| --- | --- |
| 类型检查 | `pnpm run typecheck` |
| 单元测试 | `pnpm run test:unit` |
| 组件测试 | `pnpm run test:component` |
| 全部 Vitest | `pnpm run test:run` |
| 数据与 schema | `pnpm run test:data` |
| 浏览器流程 | `pnpm run test:e2e` |
| 发布前完整回归 | `pnpm run test:regression` |

所有测试脚本都先执行类型检查。定位单个 Vitest 文件时使用现有脚本传参：`pnpm run test:unit -- scripts/docs-governance.test.ts`。

## 浏览器验收前

1. 运行 `pnpm run build` 生成当前产物。
2. 确认 4173 端口没有被另一工作树占用。
3. 使用项目自己的 `@playwright/test` 与配置，不另建临时运行链路。
4. Pages 路径、静态资源和 `HashRouter` 必须在浏览器级回归中覆盖。

CI 中部署作业必须依赖质量、测试和构建作业成功；不能与测试并行提前发布。失败证据优先保留 trace 和失败截图，重试通过仍按不稳定测试处理。
