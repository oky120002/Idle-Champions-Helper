# AGENTS 分层核对

- 确认时间：2026-04-16
- 结论：仓库内 `AGENTS.md` 只保留项目差异化硬约束；中文输出、事实优先、读取必要上下文、优先验证、优先使用技能与 `rg` 等跨项目规则继续留在全局 AGENTS，不再在仓库文档里重复展开。

## 核对依据

- 这是仓库外路径：`/Users/rain/.codex/AGENTS.md`
- `AGENTS.md`
- `docs/product/documentation-governance.md`

## 当前判断

- 全局 AGENTS 已覆盖沟通风格、真实性、任务执行原则和通用工具偏好，这些规则跨项目稳定，适合继续放在全局层。
- 本仓库真正需要补充的是产品边界、`main` / 工作树 / `codex/*` 分支约束、GitHub Pages 与 `HashRouter` 兼容要求、文档落位规则，以及模块设计先行等项目特有规则。
- `docs/README.md` 原先承担了过多明细索引，已经不适合继续做总清单；更合适的方式是根索引只保留入口，各主题再维护自己的局部 `README.md`。

## 本轮处理

- 收敛了 `AGENTS.md`，明确不再重复全局通用规则。
- 收敛了 `docs/README.md`，只保留读取顺序、专题入口、放置规则和命名约定。
- 新增 `docs/product/README.md`、`docs/research/README.md`、`docs/modules/README.md`、`docs/investigations/README.md` 作为渐进式加载入口。
