# 新增英雄参照

智能体维护工作流：用户游戏内观察 → 自然语言描述 → 智能体全权结构化 + 校准。用户不手填结构化表。

## 前提

- 模拟器引擎已跑通 `npm run test:simulator`（见 `verify-formation-simulator.md`）。
- 用户提供：技能名、效果、数值、层数、装备/专长加成、游戏显示的叠层系数/总奖金。

## 步骤

1. **解析**：从自然语言提取结构化字段。核对 raw `effect_defines`（`tmp/idle-champions-api/definitions-*.json`）的 `effect_string` + 归一化产物（`public/data/v1/hero-abilities.json`）佐证。区分「数据源特性」vs「归一化 bug」（遵循 `AGENTS.md` §1.3）。数据缺口用 mock 兜底。
2. **机制归类**：对照 `docs/specs/modules/planner/dps-mechanics.md` 注册表，给每个 ability 标 `mechanicIds`。
3. **新机制识别**：机制不在注册表 → 核对 raw 判断真伪。真新 → 扩注册表（加 id + 识别规则 + scoring 分支 + 注释标 id + 文档），标孤儿；非新 → 复用已有 id。
4. **生成参照**：写 `src/domain/planner/references/<heroId>ReferenceData.ts`（`satisfies ChampionReference`）+ `docs/research/gameplay/champion-mechanics/<heroId>.md`（完整调研）。
5. **跑对照**：`npm run test:simulator`，读偏差报告。新英雄参照文件自动进测试流，无需注册。
6. **偏差修正**：超 30% → 沿 `mechanicId` 定位 scoring 分支 + 归一化路径修正至达标；若偏差有合理根因，在 research md 显式标注并附根因后放宽断言。修 scoring/归一化同步更新 `dps-mechanics.md` + `simulator.md`。

## 抽象阈值触发（`dps-mechanic-abstraction.md`）

- **孤儿→≥2**：测试预警某孤儿机制变 ≥2 英雄使用 → 把特化分支重构为通用机制路径，去孤儿标记。
- **>10 机制**：注册表机制数 >10 → 测试强制 fail，须把 `resolveSignalMultiplier` 分支分发重构为策略注册表。

## 关联

- 规范：`docs/specs/modules/planner/champion-reference-verification.md`
- 注册表：`docs/specs/modules/planner/dps-mechanics.md`
- 抽象阈值：`docs/specs/modules/planner/dps-mechanic-abstraction.md`
- 蔚样例：`docs/research/gameplay/champion-mechanics/vi-95.md`
