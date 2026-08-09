# 文档一致性审计

度量基准日：2026-08-01（分支 `opencode/dev1`，commit `c377707d`）。本文件是轮 3 文档审计的 canonical 来源；体例沿用 `test-suite-audit.md`。判据对照 `docs/governance.md`：单一事实源（重复事实/漂移描述）、体量预算、迁移叙事残留、删除后术语残留、模块缺文档；**以代码为事实修正文档**。

## 1. 审计范围与方法

**范围**：`docs/specs/modules/planner/**`（与轮 1/2 代码审计交叉，最易漂移）、根级文档（`README.md`/`AGENTS.md`/`CLAUDE.md`/`TODO.md`/`.impeccable.md`）、`docs/audits/**`。**方法**：`wc -l` 拉体量对照预算；以轮 1/2 已确认的代码事实核查 spec 描述；`rg` 查退役文件名/迁移叙事残留。

**未深度覆盖**（登记，非结案）：非 planner 模块 spec（user-data / shared-components / guidelines）、代码注释与 JSDoc 逐条核查。建议作为后续文档 pass 的独立任务。

## 2. 已修复 — simulator.md equipment 加成描述漂移

`simulator.md` DPS 公式 + 评估维度表两处描述与 `equipmentMult.ts`（3849d295 后）代码事实不符，属文档治理硬约束「以事实为准」的当轮修正：

| 位置 | 漂移描述（旧） | 代码事实 | 修正 |
|------|----------------|----------|------|
| 公式 L41 | `× equipment_adjustment // owned 装备 / 理论基线 比`（ratio 模型） | `computeEquipmentMult = 1+Σ(base×(1+enchant/250))/100`（原始倍率，非 ratio）；且 heroDpsPool = 装备 + patron/blessing hero_dps 同 key 加法 | 改 `× hero_dps_external_pool // 装备 + patron/blessing 的 hero_dps_multiplier_mult 加法合并（heroDpsPool，非 ratio）` |
| 维度表 L63 | `equipmentAdjustment = ownedEquipMult / theoreticalLootMult` + 「MVP 只算 `global_dps_multiplier_mult`」 | 收 `hero_dps_multiplier_mult`（非 global_dps）；`ownedEquipMult`/`theoreticalLootMult` 是 3849d295 删除的死码 | 改述 `computeEquipmentMult` 收 hero_dps + enchant 缩放，与 patron/blessing hero_dps 合并成 heroDpsPool；交叉引用 correctness-audit §2（IC 同 key 应合并） |

**为何是当轮修**：两处是明确事实错误（ratio vs 原始倍率、global_dps vs hero_dps），非观点或待决设计；保留违反治理硬约束。公式结构（external hero_dps 与 ability hero_dps 池分列乘法）保留——匹配当前代码，且 correctness-audit §2 已登记其 IC 语义偏差作 P1 待协同修，结构变更随彼时一起做避免二次改。

## 3. P1 — README.md 超根文档预算（✅ 已收口）

> ✅ **已收口**（2026-08-01）：`README.md` 103→50 行，命中根 ≤60 默认阈值。「常用验证」命令去重（`docs/runbooks/testing.md` 已有同款表格），「数据相关命令」整段下沉 `docs/runbooks/public-data.md`（扩充命令表 + 资源增量复用说明 + private-user-data 备注），README 改留一跳指针。`architecture.md:9` 反向引用的「根本目标」段保留作三队目标唯一来源。下为轮 3 原始发现。

`README.md`（103 行）超根文档「应拆」阈值（治理：根 ≤60 默认 / 61-90 评估 / **91-140 应拆** / >140 必须拆）。可下沉内容：

- **数据相关命令**（L63-87，~25 行命令清单 + 解释）与 **常用验证**（L47-61）——README L23 已指 `docs/runbooks/README.md` 为「常见操作与排障入口」，详细命令清单应下沉 runbooks 或独立 `docs/commands.md`，README 只留一跳指针。
- 下沉后 README 降至 ≤60（根本目标 + 在线访问 + 当前范围 + 快速开始 + 仓库入口 + 进一步阅读），命中默认保留阈值。

| 项 | 动作 | ROI | 影响面 | 进度 |
|----|------|-----|--------|------|
| README 命令清单下沉 | 数据/验证命令移至 runbooks 或 `docs/commands.md`，README 留指针 | 中（103→~60，根文档命中预算；命令集中一处便于维护） | README.md + runbooks/public-data.md | ✅ 已收口（2026-08-01，103→50 行） |

## 4. P2 — TODO atd_3cb8df390e 陈旧

`TODO.md` L43-50 条目 `atd_3cb8df390e` 的备注引用 3849d295 已删除的 `theoreticalLootMult`/`ownedEquipMult`，并称「只收 `global_dps_multiplier_mult`（692 条），不收 hero_dps（160）」——实际 `computeEquipmentMult` 已收 hero_dps_multiplier_mult。条目标题「hero_dps/buff_upgrade loot 不收」亦半陈旧（hero_dps 已收、buff_upgrade 仍不收为真）。auto-todo canonical 区块，建议由 auto-todo 流程更新（标题改为「buff_upgrade loot 不收 + 支持位 loot 未调整」，删 theoreticalLootMult/ownedEquipMult 死码引用）。本轮不手改 auto-todo 区块避免冲突。

## 5. 验证健康

| 项 | 核查结论 |
|----|----------|
| 体量预算 | docs 最大 `architecture.md` 166 行（叶子「评估拆分」121-180 区间），但该文件是 planner 宪章 + ADR 决策索引 + 计算原则合集，多读者意图集中——拆开会让「理解 planner 全貌」多开文件，倾向保留。其余 spec 均 ≤120 或在评估区间下沿 |
| 退役文件名残留 | `bud-verification.md` 仅在 `docs/archives/audits/2026-07-document-restructure-audit.md`（历史改名记录，archive 留痕合理）出现；活跃文档 0 引用 |
| 迁移叙事 | planner spec 未发现「曾经/原来/迁移前」式叙事残留（`docs/specs/README.md` 明令「只描述现在是什么」） |
| 根级文档 | `AGENTS.md`/`CLAUDE.md` 各 48 行（CLAUDE.md 是 AGENTS.md 符号链接，单一信息源）；`TODO.md` 53 行；`.impeccable.md` 128 行（视觉专题叶子文档，评估区间）——均合理 |

## 6. 轮 3 收口

- **当轮修复**：simulator.md equipment 加成两处漂移（§2，以代码事实修正）。
- **P1 登记**：README.md 超根预算，命令清单可下沉（§3）——✅ 已收口（2026-08-01，103→50 行）。
- **P2 登记**：TODO atd_3cb8df390e 陈旧（§4，建议 auto-todo 流程更新）。
- **验证健康**：§5 体量/退役名/迁移叙事/根级文档核查无问题。
- **未覆盖**：非 planner 模块 spec + 代码注释 JSDoc，留后续文档 pass。
