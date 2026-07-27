# 0005. 部署主方案：GitHub Pages + HashRouter

**Status**: Accepted
**Decided**: 2026-07-27

## 背景

产品是 local-first 静态站，需选定长期部署主路线、路由策略，并给「国内访问体验不足时怎么办」一个可复用的判断顺序，避免每次重新讨论。约束：零服务端成本、与 Git 工作流一致、GitHub Pages 兼容是硬约束（见 `AGENTS.md`）。依据见 `research/deployment/`。

## 决策

- 托管与发布：`GitHub Pages + GitHub Actions`，默认域名，仓库 Pages 来源设为 `GitHub Actions`。
- 路由：默认 `HashRouter`，不默认切到 `BrowserRouter`。
- 国内访问优化顺序：先评估 `Cloudflare Pages`（免备案、迁移成本低）；再评估 `GitHub Pages + CDN / 自定义域名`；最后才评估国内云托管。
- 国内云托管 + 自定义域名不作为默认方案，只作为「确认用户主要来自大陆且体验已影响核心使用」后的升级路线（含备案成本）。

## 后果

- 正面：与仓库天然一致、零服务端成本、配置简单；`HashRouter` 免处理刷新 404 与平台回退脚本；国内优化有清晰优先级，不反复决策。
- 代价：GitHub Pages 大陆访问体验不一定稳定；SPA 需自行处理 `base` 与缓存；自定义域名 / 国内托管引入备案与运维成本。
- 风险：`vite.config.ts` 的 `base` 与 `import.meta.env.BASE_URL` 必须全员遵守，否则子路径站资源 404。

## 替代方案

- **Cloudflare Pages 作主方案**：不选——仍属海外平台，当前 GitHub Pages 已满足，无明确迁移收益。
- **国内云托管作主方案**：不选——自定义域名通常需备案、运维复杂度高、免费额度规则多变，当前无对应需求。
- **BrowserRouter + clean URLs**：不选——需维护 404 回退或更强托管能力；`HashRouter` 少踩坑、少平台特定脚本，当前更重视稳定。

## 关联

- 依据：`research/deployment/static-hosting/constraints-and-flow.md`、`research/deployment/china-hosting/decision-and-options.md`
- 落地：`vite.config.ts`（`base`）、`src/main.tsx`（`HashRouter`）、`.github/workflows/deploy.yml`
- 硬约束：`AGENTS.md` §1（GitHub Pages 兼容）
