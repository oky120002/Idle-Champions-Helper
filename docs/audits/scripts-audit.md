# 脚本与数据管线审计

度量基准日：2026-08-01（分支 `opencode/dev1`，基线 `c377707d` 之后、本轮 commit 之前）。本文件是轮 4 脚本与数据管线审计的 canonical 来源；体例沿用 `test-suite-audit.md`。判据对照 `docs/specs/guidelines/data-normalization.md`（管线正确性、确定性、增量跳过、数据源格式追溯、schema 同步、幂等/回退、重复来源、资源受控）+ `CLAUDE.md` 仓库体积约束。

## 1. 审计范围与方法

**范围**：`scripts/**`（117 个 .ts）——`scripts/data/**`（normalize/build/effect-helpers/resolvers/catalogs）、`scripts/sync-idle-champions-*`、`scripts/{validate-data-schemas,check-colors,check-color-contrast,audit-idle-champions-animations,signal-coverage}`、`scripts/private-user-data/**`、`scripts/simulator/**`。**方法**：codegraph 追管线调用链（`buildModels`/`normalizeDefinitionsSnapshot`/`shouldSkipDataPipeline`/`collectEffectEntries`/`effectDefinitionDps`）→ 对照 data-normalization.md §1-13 逐条核查 → `rg`/`jq` 量化资源体积与重复来源 → 核实近期修复（5d5f9f3f checksum 优先、13944ac8 buff_upgrade 排除、#9 effect_def 接入）在位无回归。

**P0 清零**：本轮无 P0（管线正确性核查未发现明确 bug / 数据损坏 / 产物失真）。三项 P1 登记（§2），核心管线（增量跳过 / effect 信号收集 / effect_def 解引用 / schema 同步）验证安全（§3）。

## 2. P1 — 整改清单（按 ROI 排序）

> ✅ #1 signal-coverage 假门已收口（2026-08-01，详见下表进度列）——`main()` 比对 `scripts/data/signal-coverage-baseline.json` 关键计数，漂移 `exit 1`，`--update-baseline` 显式确认。

| # | 项 | 动作 | ROI | 影响面 | 进度 |
|----|------|------|-----|--------|------|
| 1 | **signal-coverage 假门**：`data:signal-coverage` 接入 `test:simulator` 链，但 `main()`（signal-coverage.ts:356）只 `JSON.stringify` 打印报告、无断言、恒 exit 0。signalCoverage.test.ts 34 例 + signal-coverage.test.ts 全用**合成 fixture** 测报告生成逻辑与 `classifyScoringSupport` 对称性，**无任何测试对真实 `public/data/v1/champion-details/` 跑覆盖率并断阈值/快照**。覆盖率回退（新 effect kind 变 unsupported、识别率下降）不会让 CI 失败 | 加一个对真实数据的 gate 测试：调 `generateSignalCoverageFromVersionDir('public/data/v1')`，快照 `recognizedSignals`/`unsupportedSignals`/`scoringSupport` 计数（回退须显式更新快照），或断 `unsupportedSignals/totalEffectEntries ≤ 阈值`。数据依赖的 churn 即 gate 的职责（强制显式确认覆盖率变化） | 中高（signal-coverage 是 planner「可解释、可验证」核心度量；当前假门给虚假信心。对比 `validate-data-schemas` 有 `process.exitCode=1` 是真门） | 采用快照策略：`main()` 比对 `scripts/data/signal-coverage-baseline.json`（totals + scoringSupport + buffUpgrade 关键计数），漂移 `exit 1` + 打印 diff，`--update-baseline` 显式确认；新增 4 例 gate 单测（extract/diff 纯函数） | ✅ 已收口（2026-08-01） |
| 2 | **192 MB 动画 `.bin` 进 git 无 LFS**：1214 个 `.bin`（champion-animations 164 MB / pet-animations 28 MB）全部 git-tracked，**无 `.gitattributes`、无 Git LFS**。`.bin` 确被运行时消费（`src/features/skelanim-player/` + 动画审计页），是合法站点资源；同步已用 manifest + `sourceVersion` 增量复用（改写频率 5/50 commit，受控）—— 问题在绝对体积与无 LFS 治理 | 决策：(a) Git LFS 迁移（`.gitattributes` 追 `*.bin filter=lfs`）；(b) 外置到 GitHub Release asset / CDN，运行时按需 fetch；(c) 评估是否所有 `.bin` 都需进 Pages 产物（pet-animations 28 MB 是否核心）。须先量化 Pages 构建产物体积与部署影响 | 中（clone/clone-bare 下载量、repo 膨胀、Pages 构建上传量；但单文件均 < 4 MB 不触 GitHub 100 MB 硬限，非阻塞）。改动面大、涉部署架构，需决策 | `.gitattributes` + LFS（或外置）+ CI/Pages 配置；历史 `.bin` 迁移须 `git lfs migrate`（重写历史，协调） | **未启动** |
| 3 | **build 派生产物无 schema 校验**：`validate-data-schemas` 只校验 5 个产物（champion-details + champions/adventures/variants/patrons），但管线产出 ~16 个。planner 核心消费的 `hero-abilities.json`/`scenarios.json`/`specialization-catalog.json`/`feat-catalog.json`/`global-buffs.json`/`effect-definitions.json`/`loot-catalog.json` 等 **均无 zod schema 与 CI gate**。champion-details（build 输入）已校验 + build 函数 TS 类型管结构，残差风险在 build 逻辑用 `as`/optional-but-expected 字段导致的形状偏差 | 仿 `collection-schemas.ts` passthrough 哲学，为 hero-abilities / scenarios / 两个 catalog / global-buffs 补 zod schema（钉消费方核心字段），接入 `validate-data-schemas` 的 collectionChecks；schema ↔ build 类型配 passthrough 双源守护（沿用 `collectionSchemaSync.test.ts` 模式） | 中（catches build 逻辑形状 bug + 作契约文档；但 TS 类型已挡大部分结构性问题，ROI 低于 #1）。改动面中等（每产物一个 schema + 守护） | `src/domain/types/` 新增 build-product schemas + `validate-data-schemas.ts` 接入 + 同步守护测试 | **未启动** |

### 轮 2 遗留收口：scripts 大文件体量

轮 2 登记 scripts 侧 5 个大文件（normalize-adventures.ts 1288 / sync-idle-champions-pets.ts 1174 / official-rule-helpers.ts 1064 / normalize-champions.ts 887 / effect-helpers.ts 850）超 ts-tsx 阈值，留本轮一并审。**结论：不拆**。`ai-first-ts-tsx.md` 体量预算面向 `src/` 运行时代码（「常见任务一跳命中率 / 无关上下文占比 / 修改打开文件数」三指标针对特性开发读码）；scripts 是 build 期一次性脚本，访问模式是「按数据管线问题定位到具体 normalize/build 函数」（经 codegraph 一跳命中），不是「读整文件做特性开发」。强行按行数拆会割裂 normalize 字段提取的同源逻辑（如 normalize-adventures 的 monster catalog + variant restrictions 同读 `game_changes`），让数据管线修改多开文件。体量预算对 scripts 不适用，此项收口不再追踪。

## 3. 验证安全（核查无 bug，防重复审计）

| 区域 | 核查结论 |
|------|----------|
| **增量跳过逻辑**（§12） | `shouldSkipDataPipeline`（resource-sync-policy.ts:250）checksum 优先于 updatedAt：两者都提供时 `existingRawChecksum === nextRawChecksum` 决定 skip（5d5f9f3f 修复在位，无回归）。`pipelineHash` 覆盖 `scripts/data` + `src/domain/abilities` + `src/domain/effects` + 三个入口脚本——**覆盖完整**：build 管线对 `src/` 的值导入仅落在这俩目录（`planner`/`user-profile` 仅 `scripts/simulator` 用、非 build 依赖；`src/domain/types` 全部 `import type`、运行时擦除）。memory 旧坑（"src/ 归一化改动不被检测须 FORCE_DATA_REBUILD"）已修，文档 §12 描述准确。`FORCE_DATA_REBUILD=1` 逃生口在位。`buildModels` 不传 rawChecksum 是设计（依赖 normalize 的 checksum skip 使 updatedAt 稳定，两层防御） |
| **buff_upgrade 排除**（§11，13944ac8） | `collectEffectEntries`（effect-helpers.ts:737）`isPlainBuffUpgrade && isAbilitySource && !isDynamicStacks → continue`：ability 源静态 buff_upgrade（已烘进满级 effect_string snapshot）不派生计分信号，避免 22× 双重计数。保留三类运行时修饰：stacks_multiply 动态 / 复杂 wrapper / 外部源 loot-feat-legendary。修复在位，注释证据链完整（蔚善良榜样 4^7 实测） |
| **effect_def 解引用**（#9） | `effectDefinitionDps.ts`：`isEffectDefinitionReference` + `resolveEffectDefinitionKeys`（`effect_def,<id>` → 查 effect-definitions.json template → effectKeys）+ `resolveEffectKeyValue`（`$replace` → perLevel×actualLevel）。三路消费：`collectHeroDpsContributions` / `computeActualBlessingGlobalBuff` / `computeActualPatronPerkGlobalBuff` → `buildScoringBonusInputs`。端到端接线在位 |
| **schema 同步**（4 collection） | `collection-schemas.ts` zod schema（champions/adventures/variants/patrons passthrough 钉核心字段）+ `collectionSchemaSync.test.ts` 类型层守护（schema 钉死字段 ⊆ 前端 interface）+ `validate-data-schemas` CI exit 1。单源防漂移在位（仅 build 派生产物缺，见 §2 #3） |
| **audit-/check- 接入** | `validate-data-schemas`（test:data，真门 exit 1）/ `check-colors`+`check-color-contrast`（lint）/ `production-boundary-scan`（pretest:e2e）/ `audit-idle-champions-animations` 逻辑（.test.ts 436 行 + build-idle-champions-data 调用）均接入运行器。**唯一缺口**：signal-coverage 假门（§2 #1）——✅ 已收口（2026-08-01，基线快照 gate）。CLI 入口 / 库分离（production-boundary-scan=入口 vs scanner=库；privacy-scan=入口 vs sensitive-output-scanner=库）非重复，设计合理 |
| **幂等/确定性/重复来源** | `buildModels` skip 时读既有计数、不重写（幂等）；产物 `items` 经 `asArray`/`asRecord` 稳定遍历。collection 级重复来源无新发现（loot-catalog vs champion-details.loot 双路径是 §9 已记录的已知漂移风险，当前一致）。动画同步 manifest 增量复用（sourceGraphic+sourceVersion） |
| **数据源格式追溯**（§1-11） | 各规则（amountFunc add/mult 分流、字段值域对齐、硬编码常量逐值核对、occupiedSlotCount 全链路、文本兜底限定语义窗口、uptime normalize 预折算等）均有对应实现 + 守护测试，本轮抽样核查未发现新漂移 |

## 4. 轮 4 收口

- **P0 清零**：本轮无 P0。
- **P1 登记**：3 项（signal-coverage 假门 ✅ 已收口 2026-08-01 / 192 MB .bin 无 LFS / build 派生产物无 schema），均带动作 + ROI + 影响面 + 决策点。
- **轮 2 遗留收口**：scripts 大文件体量预算不适用，不拆（§2 末）。
- **验证安全**：§3 七项核心管线核查无 bug；5d5f9f3f / 13944ac8 / #9 三项近期修复在位无回归。
