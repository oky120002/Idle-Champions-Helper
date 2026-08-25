# 新增英雄实测参照（统一口径，冻结）

智能体维护工作流：用户游戏内观察 → 自然语言描述 → 智能体全权结构化 + 校准。用户不手填结构化表。**所有英雄实测数据（机制倍率 / 伤害快照）走同一 schema 同一流程**，不另造口径。

## 前提

- 模拟器引擎跑通 `pnpm run test:simulator`（见 `verify-formation-simulator.md`）。
- 用户提供：英雄、等级、阵型位置、技能/效果/数值/层数、即将生效与提供效果、装备/专长加成、游戏显示值（攻击伤害/叠层系数/总奖金）。

## 步骤

1. **解析**：从自然语言提取结构化字段。核对 raw `effect_defines`（`tmp/idle-champions-api/definitions-*.json`）的 `effect_string` + 归一化产物（`public/data/v1/hero-abilities.json`）佐证。区分「数据源特性」vs「归一化 bug」（遵循 `docs/specs/guidelines/data-normalization.md`「数据源格式追溯」）。数据缺口用 `mock` 兜底。
2. **写数据文件**：`src/domain/planner/references/<heroId>ReferenceData.ts`（`as const satisfies ChampionReference`）。一英雄一份，含 `snapshots[]`（不同等级/上下文/时间各一份，每份 `capturedAt` 入库时间）。伤害快照填 `attacks/incomingBuffs/providedBuffs`；机制倍率填 `abilities/modifiers/expected.multiplierChecks`；两者可共存。schema 见 `champion-reference-verification.md` 与 `championReferenceTypes.ts`。
3. **写 research**：`docs/research/gameplay/champion-mechanics/<3位补零heroId>-<name>.md`（编号前置便于排序，照 `095-vi.md` 七节骨架：元信息/角色定位/原话/游戏显示/机制分析/推导与偏差/缺口），与数据文件双向关联（`researchDoc` 字段 + md 头部「关联参照」）。原话与缺口全留痕方便核查。
4. **机制归类**（机制倍率参照才需）：对照 `dps-mechanics.md` 注册表给 `mechanicIds`。新机制核对 raw 判断真伪——真新则扩注册表（加 id + 识别规则 + scoring 分支 + 注释标 id + 文档），标孤儿；非新复用已有 id。
5. **跑对照**：`pnpm run test:simulator`。
   - 伤害参照走 `damageReferenceVerification.test.ts`（`import.meta.glob('./*ReferenceData.ts')` **真自动发现**，零注册）。
   - 机制参照走 `championReferenceVerification.test.ts`（显式 import + `refs` 数组列举——机制四组测试需显式接入）。
6. **偏差修正**：formation-buff 模式断言不过 → 沿 signal/位置定位评估 bug 修复；absolute-dps 偏差大 → 多为已知缺口（外部加成未建模等，见 architecture.md「未接入能力」），在 research「推导与偏差」记录 log10 偏差作回归基线，驱动后续收敛。

## 关联

- 规范（schema + 校准口径）：`docs/specs/modules/planner/champion-reference-verification.md`
- 类型：`src/domain/planner/references/championReferenceTypes.ts`
- 计算原则（投影模式 / Hermetic / 数据分类）：`docs/specs/modules/planner/architecture.md`
- 机制注册表：`docs/specs/modules/planner/dps-mechanics.md`
- 抽象阈值：`docs/specs/modules/planner/dps-mechanic-abstraction.md`
- 样例：蔚 `095-vi.md` / 明斯克 `007-minsc.md` / 瓦罗 `159-varo.md`
