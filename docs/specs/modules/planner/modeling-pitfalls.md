# 加成建模陷阱与验证纪律

本文件沉淀 planner 加成建模中**真实踩过、代价昂贵、易重犯**的陷阱，及可执行的防范纪律。未来补建任何加成/机制前先读。规范陈述见 `simulator.md`，原则见 `architecture.md`「加成建模正确性原则」。

## 陷阱 1：补建加成前未证伪「未建模」

「未建模」是最危险的断言——它指引你"去加东西"，而"加东西"最易造成重复建模。

### 实例（2026-08-01，baked loot 双重计数）

交接提示词 + 记忆三处记述「loot buff_upgrade 未建模，1824 大头」。B1-a/b/c/d 据此为装备 hero_dps/global_dps/gold/health/crit 建 owned-loot 通道（`equipmentMult.ts`）。**真相**：build 管线 `collectEffectEntries`（`scripts/data/effect-helpers.ts`）早已把 `champion-details.loot[].effects` 烘进 `hero-abilities.json` 的 scored signals 无条件评分（`buildHeroModels.ts` 只过滤 feat 源、漏 loot）。于是：

- 未导入存档：baked loot 全稀有度常驻（hero 1 solo 1 级无装备吃 +850% global_dps）。
- 导入存档：baked loot + equipmentMult owned-loot **双重计数**。
- 若 B1-e 再建 buff_upgrade 通道：**三重计数**。

潜伏 4 个 commit + 多个 session 未被发现。

### 为什么没早发现

1. 交接/记忆的「未建模」被当事实，没实测证伪。
2. TDD 只测新通道孤立正确性，没测「总链路无重复」。
3. golden 只断言方向（ADR 0015），叠加性错误偏差漂移小，不门控。

### 防范纪律（可执行）

补建任何加成/机制前，**必须先证伪"未建模"**，按此顺序确认：

1. **数据流 grep**：目标 effect key（如 `buff_upgrade`、`global_dps_multiplier_mult`）在 build 管线（`scripts/data/`）与 runtime（`src/domain/`）的全部处理路径。确认没有"镜像"通道已在算。
2. **跑一次评分实测**：构造目标信号的最小评分（`scoreFormation` + 真实 `hero-abilities.json`），dump breakdown，确认目标信号当前 `active` 状态与贡献。`requiredLevel=null` 的信号无条件 active，是最易被忽略的"已建模"。
3. **源穿透检查**：build 管线里 wrapper 派生 signal 的 `sourceBucket` 是否透传原始来源。若被统一改名（如历史上的 `'upgrade-buffed-signal'`），`buildHeroModels` 的源过滤会漏拦——派生 signal 泄漏进 scored profile。

## 陷阱 2：方向性 golden 对叠加性错误盲眼

golden（ADR 0015）只断言方向（含加成收敛），偏差数值不门控。**叠加性错误**（双重计数、漏算某源）只移动偏差数值、不翻转方向 → 方向性断言全绿。

### 防范纪律

涉及加成叠加的改动，**必须有"加成只计一次"的专门断言**，不能只靠方向性偏差：

- build 管线改动：断言 scored signals 不含应外部化的源（如装备源 rawEffect 不在 `supportSignals`）。
- runtime 加成通道：断言导入 owned 数据后，目标加成在总链路的贡献等于单通道预期（非两倍）。

## 陷阱 3：wrapper 派生 signal 丢失原始来源

`collectEffectEntries` 展开 `buff_upgrade` wrapper 时，派生 signal 的 `sourceBucket` 曾被统一改成 `'upgrade-buffed-signal'`，丢失原始 wrapper 来源（loot/legendary/feat/upgrade）。下游 `buildHeroModels` 的源过滤（`entry.sourceBucket === 'feat'`）只拦简单 entry，**漏拦 wrapper 派生** → 外部源（装备/feat）的 buff_upgrade 泄漏进 base profile。

### 防范纪律

派生/wrapper signal **必须透传原始来源的 `sourceBucket`**（或加 `originSource` 字段），保证下游源过滤统一生效。`sourceBucket` 是 build 管线的来源追溯键，不得在派生环节抹除。

## 不变式（见 simulator.md「加成源唯一性」）

- 装备源 effect（loot/legendary）只走 owned-aware 通道（`equipmentMult.ts` 或 catalog + runtime 注入），build 管线**不得**把装备源信号烘进 base profile 的 scored signals。
- feat 源已外部化（`buildHeroModels` 过滤 + `feat-catalog.json`），loot/legendary 同构处理。
