# Idle Champions 辅助站

《Idle Champions of the Forgotten Realms》个人成长导向的阵型决策台。仓库级硬约束见 `AGENTS.md`，完整文档索引见 `docs/README.md`。

## 根本目标

帮用户找到「当前英雄 × 当前阵型」的最优配置——哪个位置上谁，最大化三种队伍效益：

- **DPS 队**：推进更深的层数。
- **金币队**：获取最多的金币。
- **速度队**：最快地过层。

典型推进节奏：前期金币队抬高等级 → 中期速度队冲层 → 后期 DPS 队突破。所有 planner 开发不准偏离此目标；判定口径与计算原则见 `docs/specs/modules/planner/architecture.md`。

> **速度队缺口**（如实登记）：当前仅有 `HeroAbilityDimension.speed` 维度（`src/domain/abilities/abilityModel.ts`），尚未接入 `ScoringMode` 优化目标，登记为后续目标。

## 在线访问

- 正式地址：[https://oky120002.github.io/Idle-Champions-Helper/](https://oky120002.github.io/Idle-Champions-Helper/)
- 部署：`GitHub Pages + GitHub Actions`

## 快速开始

```bash
npm install
npm run dev
```

本地开发、Pages 预览与端口排障见 `docs/runbooks/local-development.md`。

## 验证与数据

- 测试范围与发布门禁：`docs/runbooks/testing.md`
- 公共数据同步与全部数据命令：`docs/runbooks/public-data.md`
- 隐私边界（`privacy:scan` / `privacy:scan-build`）：`docs/specs/modules/user-data/`

## 仓库入口

- `src/`：页面、共享特性模块、组件、领域模型、规则与样式
- `public/data/`：版本化公共数据与静态资源
- `scripts/`：数据抓取、归一化、资源同步与预览脚本
- `tests/e2e/`：Playwright 用例
- `docs/`：产品、调研、模块设计与排障文档

## 进一步阅读

- 文档总索引：`docs/README.md`
- 统一语言（游戏术语 ↔ 代码标识符）：`CONTEXT.md`
- 产品定义（价值 / 形态 / 技术模型 / 风险）：`docs/specs/product/README.md`
- 文档职责与精简策略：`docs/governance.md`
- 操作与排障手册：`docs/runbooks/README.md`
- 游戏机制调研（BUD、暴击、速度、金币、敌人特殊血量等）：`docs/research/gameplay/`
- 架构决策记录（为什么这样选）：`docs/decisions/`
- 深度审计报告（性能 / 正确性 / 测试 / 可访问性等）：`docs/audits/`
- 需求提案库：`docs/requirements/`
