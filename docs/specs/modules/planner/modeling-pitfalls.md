# 加成建模陷阱与验证纪律

本文件沉淀 planner 加成建模中**真实踩过、代价昂贵、易重犯**的陷阱，及可执行的防范纪律。未来补建任何加成 / 机制前先读。规范陈述见 `simulator.md`，原则见 `architecture.md`「加成建模正确性原则」。

## 陷阱 1：补建加成前未证伪「未建模」

「未建模」是最危险的断言——它指引你"去加东西"，而"加东西"最易造成重复建模。

### 典型形态：baked effect 双重计数

build 管线 `collectEffectEntries`（`scripts/data/effect-helpers.ts`）会把 `champion-details.loot[].effects` 等外部源烘进 `hero-abilities.json` 的 scored signals。若又为同一来源新建 owned-aware 通道（如装备 `equipmentMult.ts`），就会双重计数：

- 未导入存档：baked 外部源全稀有度常驻（如 hero 1 solo 1 级无装备吃 +850% global_dps）。
- 导入存档：baked + owned-aware 通道**双重计数**。

此类问题常潜伏多个 commit 未被发现。

### 为什么难发现

1. 「未建模」断言被当事实，没实测证伪。
2. TDD 只测新通道孤立正确性，没测「总链路无重复」。
3. golden 只断言方向（ADR 0015），叠加性错误偏差漂移小，不门控。

### 防范纪律（可执行）

补建任何加成 / 机制前，**必须先证伪"未建模"**，按此顺序确认：

1. **数据流 grep**：目标 effect key（如 `buff_upgrade`、`global_dps_multiplier_mult`）在 build 管线（`scripts/data/`）与 runtime（`src/domain/`）的全部处理路径。确认没有"镜像"通道已在算。
2. **跑一次评估实测**：构造目标信号的最小评估（`scoreFormation` + 真实 `hero-abilities.json`），dump breakdown，确认目标信号当前 `active` 状态与贡献。`requiredLevel=null` 的信号无条件 active，是最易被忽略的"已建模"。
3. **源穿透检查**：build 管线里 wrapper 派生 signal 的 `sourceBucket` 是否透传原始来源。若被统一改名，`buildHeroModels` 的源过滤会漏拦——派生 signal 泄漏进 scored profile。

## 陷阱 2：方向性 golden 对叠加性错误盲眼

golden（ADR 0015）只断言方向（含加成收敛），偏差数值不门控。**叠加性错误**（双重计数、漏算某源）只移动偏差数值、不翻转方向 → 方向性断言全绿。

### 防范纪律

涉及加成叠加的改动，**必须有"加成只计一次"的专门断言**，不能只靠方向性偏差：

- build 管线改动：断言 scored signals 不含应外部化的源（如装备源 rawEffect 不在 `supportSignals`）。
- runtime 加成通道：断言导入 owned 数据后，目标加成在总链路的贡献等于单通道预期（非两倍）。

## 陷阱 3：wrapper 派生 signal 丢失原始来源

`collectEffectEntries` 展开 `buff_upgrade` wrapper 时，派生 signal 的 `sourceBucket` 若被统一改名（丢失原始 wrapper 来源 loot / legendary / feat / upgrade），下游 `buildHeroModels` 的源过滤只拦简单 entry，**漏拦 wrapper 派生** → 外部源 buff_upgrade 泄漏进 base profile。

同一陷阱的变体：base profile 路径过滤了，但**专精 catalog 路径**（`specialization-catalog.ts` 消费 `specializationDerived`）没接同样过滤——loot / legendary / feat 源 wrapper 全烘进 spec catalog，runtime 选专精无条件注入（不查 owned）→ overcount。

### 防范纪律

派生 / wrapper signal **必须透传原始来源的 `sourceBucket`**（或加 `originSource` 字段），且**每条消费路径**（base profile / spec catalog / 未来新路径）都必须接同样的源过滤——透传了不用等于没过滤。`sourceBucket` 是 build 管线的来源追溯键，不得在派生环节抹除，也不得在任一消费环节漏拦。

## 不变式（见 simulator.md「加成源唯一性」）

- 装备源 effect（loot / legendary）只走 owned-aware 通道（`equipmentMult.ts` 或 catalog + runtime 注入），build 管线**不得**把装备源信号烘进 base profile 的 scored signals 或 spec catalog。
- feat 源已外部化（`buildHeroModels` 过滤 + `feat-catalog.json`），loot / legendary 同构处理。

## 陷阱 4：stacksMultiply 短路与 stackFunc / wrapper 继承的灾难高估

`resolveSignalMultiplier` 的 dynamic-stack-multiply 短路分支须精确限定适用集——若对**任意** `stacksMultiply===true` 信号无条件用 `manualStackCount`（默认 1000）乘方，产生两类灾难高估：

1. **stacksMultiply + stackFunc 共存**：hero32 `buff_upgrade,100,11503`（stacksMultiply=true + stackFunc=per_mithral_hall_stacks）被 (1+100/100)^1000 = 2^1000≈10^301 放大进 damage 池。同类 23 条未注册 stackFunc + 23 条注册 stackFunc 信号全受影响（注册的如 hero1 `per_tagged_crusader_mult,100` 也被 2^1000，应按阵型真实计数 2^dwarf数）。根因：短路分支忽略 stackFunc——层数源本应是 stackFunc（阵型计数），却被当成 area-based manual 层数。
2. **runtime wrapper 继承 base 的 stacksMultiply**：`buildEquipmentBuffWrapper` 用 `{...base}` 构造 loot/feat wrapper，只重置 amountFunc/stackFunc，漏掉 stacksMultiply/applyManually——wrapper 继承 stacksMultiply base 的 `stacksMultiply=true`，又无 stackFunc 可回落，走短路分支 → (1+buff%/100)^1000 灾难。

### 为什么难发现

1. 出言不逊（stacksMultiply + manual_stacking，**无** stackFunc）是合法的 dynamic-stack 信号，1.0033^N≈576 正确——掩盖了「stacksMultiply 短路」对带 stackFunc 者的错误。
2. 高 value 信号在 manualStackCount=1000 下溢出 → ok:false（被 overflow 守卫静默吞掉），低/中 value 有限但灾难——前者隐藏问题，后者制造污染。
3. `signal-coverage` 的对称分类若把所有 stacksMultiply 信号判 supported（注释「实际已计入目标值」），会给「已覆盖」假象，实际是灾难高估而非正确计入目标值。

### 防范纪律（可执行）

- **短路分支须精确限定适用集**：`stacksMultiply` 短路只对「无 stackFunc 的纯 dynamic-stack 信号」（manual_stacking 类）生效；带 stackFunc 的必须落 stackFunc 路径（注册按阵型计数、未注册 honest 不计入目标值）。`signal-coverage.classifyScoringSupport` 须对称收紧。
- **wrapper 构造须显式切断 base 的机制语义**：`{...base}` 派生 wrapper 时，stacksMultiply / applyManually 这类「信号自身如何 scale/激活」的字段必须显式重置（wrapper 是固定百分比放大，非堆叠/手动信号）；amountFunc/stackFunc 按 wrapper 自身语义（loot/feat 全 plain → null）。只重置一部分会漏。
- **判「已计入目标值」前看数值合理性**：coverage 分类标 supported 不等于「计入目标值正确」——对 stacksMultiply/stackFunc 组合信号，须核对 resolve 路径产出的 multiplier 量级是否合理（(1+value/100)^count，count 来源明确），而非仅看「进了评估分支」。

## 陷阱 5：gain profile 预算与实际评估池路由漂移

`computeHeroGainProfile`（`abilityModel.ts` 的 `aggregateGainByDimension`）预计算英雄各维度收益，供 `applyComputationMode`（`computationMode.ts`）按席位排序裁剪候选（默认 p50 每席位取前 50%）。它是实际评估（`placementFit.ts` signal→pool 路由 + `signalMultiplier.ts` 折算）的**镜像预算**——文档化不变量要求「数学须与 pool 聚合一致」。

但新增 signal 机制时容易只改实际评估、漏改 gain profile 镜像：`bonusScaleOfSignal`（buff_upgrade wrapper 联动）实际评估贡献 = `base.value × wrapper.value / 100`（`applySignalPercent` 折算后 `(multiplier−1)×100` 进 addPercent）；gain profile 须按同公式折算，若直接 `+= signal.value`（wrapper 百分比）会忽略 base——base.value>100 时严重低估（base=300、wrapper=100：实际 +300%，错算 +100%，3× 低估）→ 强候选被 p50 误裁，beam search 永不试到。

该不变量有**两维度**——路由（add/mult/stacksMultiply 走 addPercent 还是 multFactor，上方 bonusScaleOfSignal 案例）与**丢弃条件**（实际评估 `resolveSignalMultiplier` 返回 `ok:false` 恒不计入目标值的信号，gain 须对称跳过，否则幻影增益挤掉同席位真实候选）：

- `applyManually`（手动触发/专精门控）：`resolveSignalMultiplier` 首分支 `ok:false`，稳态永不触发。
- 未注册 `stackFunc`（`per_mithral_hall_stacks` / `get_stat` 等，不在 `STACK_COUNT_RESOLVERS`）：走 stackFunc 路径找不到 resolver → `ok:false`。注册名集合 `REGISTERED_STACK_FUNCS`（`Object.keys(STACK_COUNT_RESOLVERS)` 派生）从 `planner/mechanics` 导入到 `abilityModel`——`stackFunc` 是本层字段但「哪些已注册」是 scorer 能力，此导入是 gain 镜像评估的必要依赖。

未排除时部分英雄 damage gain 含幻影信号（72 vs 36、80 vs 40 级别偏差），约一半表观强度来自幻影信号。

### 为什么难发现

1. gain profile 是**预算**（非最终评估），不改 `scoreFormation` 输出 → 方向性 golden / breakdown 不受影响，全绿。
2. 影响是「裁掉谁」而非「算成多少」——被误裁的英雄不出现在结果里，无对照无感知。
3. 只有 base.value≠100 的 wrapper 受影响（base=100 时巧合一致：100×value/100 = value），随机性掩盖系统性。applyManually 变体同理：只有当 phantom 强英雄与真强候选**同席位且贴近 p50 边界**时才可见损，窄条件掩盖系统性。
4. 增量审计聚焦数据盲区 / 运行时边界 / 性能，未逐 signal 对比 gain profile 与实际评估的路由。

### 防范纪律（可执行）

- **新增 signal 机制须同步 gain profile 镜像**：任何改变 signal→pool 折算的字段（amountFunc / stacksMultiply / bonusScaleOfSignal / stackFunc）在 `placementFit.ts` + `signalMultiplier.ts` 改完后，必须检查 `aggregateGainByDimension` 是否对称处理。三处是同一不变量的三个落点。
- **gain profile 须镜像评估的「丢弃条件」而非仅「路由」**：实际评估 `resolveSignalMultiplier` 恒丢弃的信号（applyManually、未注册 stackFunc）不计入 gain 上界，否则幻影增益挤掉真实候选。两类守卫均在 `aggregateGainByDimension` 内：applyManually（信号自身字段，abilities 层内）；未注册 stackFunc（`REGISTERED_STACK_FUNCS` = `Object.keys(STACK_COUNT_RESOLVERS)` 派生，从 planner/mechanics 导入 abilities——`computeHeroGainProfile` 本就含评估语义，此导入是镜像评估的必要依赖）。
- **gain profile 测试须覆盖与评估一致的逐 signal 案例**：不只在 gain profile 孤立测加法 / 乘法，还要对 wrapper 等机制断言「gain = 实际评估单 signal 贡献」（见 `abilityModel.test.ts` bonusScaleOfSignal 用例），以及「恒丢弃信号（applyManually）不计入」。
- **改 gain profile 折算后强制重建数据**：gainProfile 烘进 `hero-abilities.json`（build 期 `computeHeroGainProfile`），代码改完须 `FORCE_DATA_REBUILD=1` 重跑 `buildModels`（或改 `abilityModel.ts` 触发 `computePipelineHash` 变化自动重跑），否则 build-time 烘值仍是旧的（runtime wrapper 注入会重算，但 `applyComputationMode` 裁剪用的是 build-time 值——wrapper 在裁剪之后才注入）。

## 陷阱 6：restriction 文本提取用黑名单而非白名单 + 未校验标签匹配域

restriction 文本解析（`restrictions-parser.ts`）和标签表达式解析（`normalize-adventures.ts:parseTagExpression`）有两类易重犯的假设错误：

### 形态 A：黑名单提取条件效果句

属性门槛提取最初用**黑名单**（排除含 `deal` 的句子），漏了 `take no damage`（v865 夺心魔 INT 15+ 免疫伤害）和 `placed adjacent`（v1984 邻接位限制）——这些条件效果句含属性模式 `(STAT) of N or higher` 但**非使用门槛**，被误提为硬性候选过滤。

**改用白名单**：仅从含使用门槛标记（`can/may be used`、`only use`、`take part`）的句子提取。全量验证排除 2 误报、0 漏报。

### 形态 B：标签表达式与英雄标签域不匹配

游戏 `by_tags.tags` 用复合对齐标记 `lawful_good`，英雄标签是对齐轴独立的（`lawful` + `good`）。不展开则 `lawful_good` 匹配 0 英雄——v1740 四角阵营限制候选池为空。

### 为什么难发现

1. 单元测试只验证「解析器对输入字符串的输出」，不验证「输出能匹配到真实英雄」——零匹配表达式测试全绿。
2. 黑名单天然无法穷举——每次新增一个排除模式（`deal`），就有新的条件效果模式（`take no damage`）漏网。
3. 复合标记命名直觉上像合法 tag——不查英雄标签全集不会发现 `lawful_good` 不存在。

### 防范纪律（可执行）

- **文本提取优先白名单**：区分「使用门槛」与「条件效果」时，枚举允许的模式（usage-gate 短语），而非逐个排除不允许的。白名单遇到新条件效果句型自动排除，黑名单遇到新句型自动放行。
- **解析后校验匹配域**：标签表达式解析后，用全量英雄标签集校验每个 tag 是否存在于英雄标签域。零匹配表达式（整个表达式匹配 0 英雄）是最强信号——要么标签名错（复合标记未展开），要么表达式语义错。
- **全量 `jq`/python 扫描验证**：新增任何 tag-based 提取后，跑一次 `jq` + python 脚本：对每个变体的表达式，计算匹配英雄数，找出零匹配者。比单元测试更能发现数据层面的假设错误。
- **警告抑制须句级而非条目级**：属性门槛提取成功后用条目级布尔标记 `addedAttr` 全抑制 warning，吞掉了同条目中残余的特殊机制句（敌人刷新/伤害调整等，65 变体受影响）。正确做法是句级分析——仅当全部非平凡句均被已知解析器覆盖时才抑制。粒度不匹配的抑制标记是隐蔽的信息丢失。

## 陷阱 7：正则模板只覆盖已知表面形式，未全量扫描变体数据

restrictions-parser 的正则模板从自然语言文本提取结构化数据。开发时只见过部分写法（如 `CON of 13 or higher`），正则只覆盖这些已知形式。全量 `jq`/`rg` 扫描变体数据后发现多种未覆盖的表面形式：

- **缩写 vs 全词**：`CON` vs `Constitution`（42 处遗漏）
- **方向标记变体**：`or higher` vs `+` vs `or more`（13 处遗漏）
- **近义后缀**：`armored hit points` vs `armored health`（9 处遗漏）
- **动词变位**：`"takes up".includes("take up")` === false（JavaScript 子串匹配对词形变化失效，13 处遗漏）

### 为什么难发现

1. 单元测试只验证已知形式的解析正确性，不验证未知形式是否存在。
2. 正则的 `(?:hit\s+points|HP)` 等 alternation 是手动枚举，遗漏一个就全量静默失败（解析为 null）。
3. 失败是静默的——解析为 null 不报错，只是该约束不生效。

### 防范纪律（可执行）

- **全量 rg/jq 扫描**：新增或修改任何文本提取正则后，用 `rg -i` 在全量变体数据中搜索该模式的所有表面形式，逐一确认正则覆盖。比单元测试更能发现数据层面的表面形式变体。
- **同语义 alternation 须对称**：同类约束的不同写法（如 ARMOR 和 HITS_BASED 的后缀）应保持相同的 alternation 覆盖——不对称意味着一个覆盖了 `health` 而另一个没有，是复制遗漏的信号。
- **关键词匹配避免 includes 对词形变化**：英语动词有 take/takes/taking/took 变位，`includes("take up")` 对后三种都返回 false。用正则 `/\btak(?:e|es|ing)\s+up\b/` 或显式枚举所有变位。

## 陷阱 8：新增模型变体时未审计所有消费者

吞吐量约束模型（`computeSegmentKillableArea`）最初只支持护甲（armor），后续阶段加入命中型（hitsBased）时，`estimateMaxArea` 的吞吐量计算正确更新了（两者都传入 `computeSegmentKillableArea`），但过滤条件 `scorePlannerFormationWithLegality` 仍只检查 `armor != null`——hitsBased-only 场景的 killableArea 过滤被跳过。

### 为什么难发现

1. 新功能分阶段实施（B7 写过滤 → D3 加 hitsBased），跨阶段遗忘消费者审计。
2. 过滤条件和模型计算在不同函数、不同调用层级，修改一个不会触发另一个的类型检查或测试失败。
3. 测试只覆盖了 armor 变体的过滤行为，没覆盖 hitsBased-only 变体。

### 防范纪律（可执行）

- **新增模型变体时 grep 所有消费者**：在 `estimateMaxArea`、`ViabilityContext`、`scorePlannerFormationWithLegality`、`buildViabilityAssessment` 等所有引用处搜索新增字段，确认每个消费者都已更新。
- **过滤条件用「类型存在性」而非「具体字段名」**：`vc.armor != null || vc.hitsBased != null` 比 `vc.armor != null` 更健壮；或抽象为 `hasThroughputConstraint(vc)` 函数，新增吞吐量类型时只改一处。

## 陷阱 9：过滤条件分支遗漏新约束类型 + 绑定标签笼统化

`minSurvivableArea` 过滤原分两步：先查 `survivableArea`，再对吞吐量约束变体（`armor || hitsBased`）额外查 `killableArea`。但 `damageModifier`（伤害削减）同样降低 `killableArea`（effectiveBud = bud × damageModifier），却不在额外检查范围内——99% 减伤变体生存通过但击杀远低于阈值仍通过过滤。根因：过滤按约束来源（armor/hitsBased）而非效果（降低 killableArea）分组。

同时 `boundBy` 标签把所有段吞吐量绑定笼统标为 `'armor'`——hitsBased-only 变体（数据中 armor 与 hitsBased 不共存）显示"护甲受限"而非"命中型受限"。`AreaBound` 设计时只考虑 armor，后续加 hitsBased 未同步扩展。

### 防范纪律（可执行）

- **过滤按效果而非来源分组**：统一检查 `area = min(killableArea, survivableArea)` 代替按约束类型分别检查，新增任何影响面积的约束自动覆盖。
- **标签区分到约束类型**：`AreaBound` 须为每种绑定约束设独立值（`'armor' | 'hits-based'`），不用笼统标签。
- **数值边界不可静默丢弃**：`applyHealthDrain` 的 guard 须显式处理 `drainRate ≥ 1`（→ 零生命），不能因数学无效而静默跳过。
