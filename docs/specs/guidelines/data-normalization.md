# 数据归一化管线规范

- 适用范围：raw `definitions` → normalize → collect → resolve → consume 全链路（`scripts/normalize-idle-champions-definitions.ts`、`scripts/data/**`、`src/domain/abilities/**`，以及 `src/domain/planner/**`、`src/domain/simulator/**` 等消费层）。
- 目标：在 100% AI 开发前提下，保证 raw 基座数据不丢、不错配、不静默漂移。
- 数据源格式追溯：上游格式异常先追溯 raw 源头（`tmp/idle-champions-api/definitions-*.json`），区分「数据源格式特性」vs「归一化 bug」，禁止直接在消费层兜底；合理性判据：游戏能正常线上运行即源数据大概率没坏，出现矛盾优先怀疑自己的解析假设或 normalize 脚本，raw 证实前不得下「数据源 bug」结论。已确认特性见 `docs/research/data/game-data-source/format-quirks.md`。
- 来源：多轮数据流审计沉淀；案例保留为规则的可操作依据，不得在精简时删除。

## 1. amountFunc 约定：解析层 add 不设字段（默认 null=add），消费层必须 `=== 'mult' ? mult : add` 分流

`buildSimplePoolSignal` 对 add 省略 amountFunc 字段；任何新维度的消费侧聚合若一律累乘（如原 `computeVulnerabilityFactor`），会把 add 类信号高估（两个 +100% 易伤算成 4 而非 3）。新增维度时核对消费侧分流与解析层约定一致，并写「多 signal 叠加」测试（单 signal 时累乘与 add 同果，漏覆盖）。

## 2. script 层（normalize + build）改动后必须重跑对应产物

build 层（effect-helpers / signalSemantics 等）改动后，使用 `buildModels` 从 normalized champion-details 生成对应产物（经 `npx tsx` 或 vitest 运行），或由 CI 守护产物新鲜度。

normalize 层（normalize-adventures 等）改动后必须重跑 normalize 同步 `variants.json`，下游 `scenarios.json` 读取归一化后的 `variant.enemyTypes`。normalize 层重跑需要同一快照的 source + ZH(lang-7) 双 raw；本地缺失 ZH raw 时使用完整 `npm run data:official` 周期重建。

## 3. 条件性匹配前核对字段值域，排除集须与消费词表对齐

vulnerability `monsterTags`（boss/fiend）与 `scenario.enemyTypes`（怪物种族 beast/humanoid/…）做条件性匹配时，两端值域必须相交。raw `monster_defines` 使用 `tags:["boss"]` 标记 boss，boss 与 fiend 属于同一 vulnerability 标签值域；`GENERIC_MONSTER_TAGS` 只排除不参与 vulnerability 的通用 tag。规则：enemyTypes 的排除集不得包含任何出现在 `monsterTags` 里的 tag；全量枚举两端值域（jq unique）取交集，排除集 ∩ vulnerability 词表必须为空。

**UI 展示层消费 enemyTypes 须过滤非种族 tag**：enemyTypes 含 boss 是 vulnerability 词表对齐的需要（数据层），但「敌人类型」chip/过滤器/占比面向种族展示——boss 已在 `specialEnemyCount` 独立展示，melee/ranged 由 attackMix 承载。UI 所有消费点（`variant-model` 过滤器选项 + 搜索、`variant-grouping` 聚合、`variant-detail-model` 占比、`VariantAdventureSection` chip）统一经 `variant-labels.ts` 的 `NON_DISPLAY_ENEMY_TAGS` 过滤；planner 侧 `scenario.enemyTypes` 不过滤（vulnerability 匹配需要 boss）。教训：字段同时服务「vulnerability 词表」与「UI 种族展示」两个语义时，在消费层分离视图，不污染展示——别为匹配便利往展示字段塞非展示值。

## 4. 设计文档里的每个公式 / pool / 乘区都要有实现 + 测试

`Π(static_dps_mults)` 类公式写了但 `upgrade.static_dps_mult` 字段长期未读，35 个复杂 effect upgrade 的 dps 丢失。文档公式与实现定期核对，避免「设计了但没做」；`docs/research/data/game-data-source/format-quirks.md` / 加成调研里的特殊 pool 尤其易漏。

## 5. 硬编码的 raw 派生常量必须逐值核对，不能假设序列规律

monsterStats 的 dps boss spike 假设「50,100,150,200...每 50 层」，但 raw `dps_growth_rate_curve` 第 3 个 spike 在 **151**（非 150），从第 3 个起整体 +1 偏移（差值集合 {50,51}）。stepped curve / 枚举型常量（非连续函数）必须 dump 全量 key 逐个比对；「看起来有规律」的假设要 raw 证实，交叉验证用 per-area 复合 log 对比。

**守护测试也必须全量逐边界，不能采样**：`gameRulesSync.test` 原只采样 area 50 首个 dps spike + 第一段 health 增长率，漏掉其余 48 个 spike 与 2001/2251 分段边界——硬编码值当前正确但守护盲区大，上游改任意 spike 位置/倍率或分段值都发现不了。stepped curve / spike 序列的守护用「逐 area 局部增长率 `statFn(A)/statFn(A-1) === raw curve[A]`」全量遍历 raw curve 的每个 key（用 Decimal 比值避免大 area 量级溢出 number；`toBeCloseTo(6)` 容纳末位浮点误差，仍能检出 >= 1e-3 量级的真实分段/spike 漂移）。

## 6. 新增数据字段必须同步接入消费层，否则是数据孤岛

`occupiedSlotCount` 在 build-models 产出、plannerModel 定义，recommendationEngine 必须扣减（可用容量 = total − occupiedSlotCount）；若只过滤 mechanics `lockedSlots` 而漏扣 occupiedSlotCount，则 65 个 scenario 推荐多填被占格高估 carryDps。字段新增时核对「产出→定义→消费」全链路，注释承诺的行为必须有测试覆盖。

## 7. 注释 / 文档声称的数据源必须真实存在

clickDamage 的数据来源是 `click_damage_settings`，字段包括 `{base_power, base_cost, cost_curve, power_curve}`。引用 raw 字段/effect 时先用 jq 确认字段存在。

## 8. 文本解析的回退 / 兜底路径必须限定在语义锚点范围内，禁止全文本扫描取值

restrictions-parser 的「take up slots → 取首个数词」回退原对**整段文本**取首个数字，把 variant 430 后文「Only Champions with CHA of **14** or lower」的 14 当成占格数 → occupiedSlotCount=14（> 阵型总槽位 9，availableCapacity=0，该 variant 永不可推荐）。长 flavor 文本里属性要求 / 等级 / cost / 层数等无关数字必然存在，全文本「取首个数字」类兜底必然误抓。搜索范围限定到语义短语窗口（占格实体数词总在动词前 → 只搜「take up slots」之前）；无匹配走 override 或 warning，宁可保守不可误判。回归测试须覆盖「含无关数字的长文本」。

## 9. 派生数据产物与既有归一化字段同源双路径时，记录漂移风险并优先单源派生

`loot-catalog.json`（`buildLootCatalog` 从 raw `loot_defines`）与 `champion-details.loot`（`normalizeChampionLoot` 亦从 raw `loot_defines`）数据完全一致（hero 1 两边均 24 条 (slot,rarity,effect)），属两套代码路径从同一 raw 派生同一结构——当前一致，但单边改动会静默漂移。新增派生产物前先确认既有归一化字段是否已含该数据（本案 `champion-details.loot` 已保留 `slotId`+`rarity`，原注释却声称「slot_id 丢失」，注释错误掩盖了真实复用关系）；若必须另出产物（如运行时需 flat 跨 hero 索引而不载 per-hero 文件），注释须说明真实依据，并在 `docs/research/data/planner/equipment-and-abilities.md` 等证据文档标注双路径漂移风险。

## 10. 文本模板解析器漏匹配时走安全模板或 override；override 子串须全量扫描

restrictions 文本模板目前安全覆盖数字 + `slots/spots`、常见占格动词变位和“加入指定 slots”；缺少可靠数值锚点的 `take up space`、具名实体或动态递增表达仍走 `RESTRICTION_OVERRIDES` / warning。**不要为提高召回而全文取数字或泛化 space**：长文本中的属性值、费用和区域数会制造假阳性。模板 + override 是精度/召回拆分——模板负责可证明的固定数值，低频歧义模式显式补录并逐条核对。

override 用 `includes` 子串匹配，**一条 match 可能命中多个 variant**（"barovian wedding" 同时命中 v414 宾客与 v682 婚礼客、"bronze dragon joins the formation" 同时命中 v1261 三格与 v1629 两格）。新增 override 时必须全量扫整个语料核对每条 match 的命中 variant 列表：① 具名专属串（"rudolph van richten and his ally"）排在泛化串（"barovian wedding"）前——`matchOverride` 取首个命中；② 区分 NPC 占格 vs 英雄 forcedHeroes（v682 Rudolph+Ireena 是 NPC→2 格，v1977/78/79 Rudolph 是 forcedHeroes 英雄→0，泛化串 "rudolph van richten" 会把后者误判为 2）。

**歧义标记须用二级标记消歧**：排除「变量递增占格」时，"每经过 N 区域" 既可表计数递增（每周期 +1 格）也可表位置轮换（固定 N 格换位置）甚至无关机制（气味/伤害改变）。必须先用位置轮换标记放行再判递增——否则固定 N 格换位置的 variant（v241 两格换位置）被 "每经过" 误清零。任何"看起来有规律"的排除标记都要 raw 全量核对两类语义后再生效。

**位置轮换标记不能用孤立短词**：孤立「移动」会误匹配 v296「守望者...无法被移动或移除」（forcedHeroes 英雄锁定，非 NPC 换位置），把变量递增（每 50 区域 +1 格）误判为位置轮换、跳过排除、误产 occ=1。位置轮换标记须只收明确的位置变化短语（阵型中移动 / 移动位置 / 改变位置 / 变换位置 / 切换位置）。标记词越短（单字「移动」），命中否定语境（无法被移动 / 可以被移动 / 移动速度）的概率越高——位置轮换标记须与实体主动换位置的动作绑定，不留孤立短词。

## 11. 派生值的折算/缩放收敛在 normalize 层，不分散到消费层多路径

ability ult buff 的 uptime 折算（`value × duration/base_cooldown`）若放消费层，会因 `collectEffectEntries` 的多派生路径（wrapper 派生 `upgrade-buffed-signal` / static-dps fallback / 直接 entry）各自折算或丢失 entry 标记——Channel Divinity（`buff_upgrades` wrapper）派生 signal 会丢原 entry 的 duration/base_cooldown，无法折算。**根因方案**：折算收敛在 normalize 层（`normalizeChampionAbility` 把 `value × uptime` 预折算进 effect_string），消费层（`collectRawEffectEntries` `'ability'` 源）按折算后串正常处理——wrapper 派生自动用折算后 magnitude，所有路径一致。规则：当派生值（uptime / rarity 缩放 / level 折算等）需穿越消费层多路径时，在 normalize 层预折算进 effect_string，而非要求每个消费路径各自识别 + 折算。

## 12. 数据管线增量跳过（资源同步 + normalize/build）

**资源同步侧（两层跳过）**：先比全局资源更新时间，再比单资源 `sourceGraphic`/`sourceVersion`/`path`/本地存在性；全量流水线（如 `data:official`）先比 definitions `updatedAt`，未变整批跳过下载、覆盖、重生成。单资源脚本有可持久化 manifest/collection 就必须基于它增量复用，禁止无条件清空目录后全量重下。

**normalize/build 侧（checksum + pipelineHash 双判定）**：`normalizeDefinitionsSnapshot` 与 `buildModels` 经 `shouldSkipDataPipeline` 判定 skip：raw `checksum` 与管线源码指纹 `pipelineHash` 均未变化时跳过。`checksum` 缺失时使用 `current_time` 作为 `updatedAt` 回退值。三种重跑触发：

- **raw 更新**（游戏数据更新）：raw `checksum` 变（`current_time` 亦单调前进）→ 重跑。
- **逻辑改动**（开发者改 normalize/build/数据脚本或归一化语义）：`pipelineHash` 变（`scripts/data` + `src/domain/abilities` + `src/domain/effects` 下非 test 的 .ts + normalize/fetch/build 三入口 sha256）→ 自动重跑，**不依赖开发者记得 force**——这是核心，避免「改了 normalize 逻辑但产物没刷新」的陷阱（如本次 14.4 ability：若只比 updatedAt，raw 没变则 skip，ability 不进产物；pipelineHash 检测到 normalize-champions.ts 改动 → 自动重跑）。
- **`FORCE_DATA_REBUILD=1`**：手动强制逃生口，覆盖「调试 / 嫌疑产物脏」等需要无条件重跑的场景。

## 13. 正则交替符插值进复合模式时必须用 `(?:...)` 分组

restrictions-parser 的属性门槛正则将 STAT 名称交替符 `str|strength|con|constitution|...` 插值进复合捕获组 `(STAT_NAMES(?:\s+and\s+STAT_NAMES)*)`。**若交替符未用 `(?:...)` 包裹**，展开后变成 `(str|strength|...|charisma(?:\s+and\s+str|strength|...)*)`——复合续接 `(?:\s+and\s+...)` 只附着在最后一个分支 `charisma` 上，其余分支（str/con 等）无法匹配复合模式。实测：「STR and CON of 14+」只捕获 CON，STR 静默丢弃（7 变体属性门槛缺失）。

**规则**：正则交替符 `A|B|C` 插值进更大模式时，**每次插值都用 `(?:A|B|C)` 包裹**，禁止裸交替符直接拼接——交替符的优先级低于拼接，裸插值会把后续量词/续接错误地绑定到最后一个分支。

`pipelineHash` 粗粒度覆盖 `scripts/data/` + `src/domain/abilities/` + `src/domain/effects/`：后两个 domain 目录的全部源文件都是数据管线 build 依赖（被 effect-helpers / effect-resolvers / feat-catalog / specialization-catalog 导入），任何数据脚本或归一化语义改动都触发重跑，保守不漏优于精确但漏检。fetch 无法下载前跳过（discovery 只返回 play_server，`current_time` 在 getDefinitions 响应里），故 fetch 仍每次下载；normalize/build 的 skip 在 fetch 之后生效——raw 没变时省 normalize/build 的几秒重生成，但不省 fetch 带宽。

**只改 build 产物时单独跑 build-models，避免上游 timestamp 漂移污染 diff**：feature 只动 `build-models.ts`（新增派生字段，如 `gainProfile`）时，跑全量 `data:official` 会顺带 fetch 上游——CNE definitions `current_time` 每日 ticking（即使内容没变）→ normalize 全刷 → ~180 个 champion-details/*.json + 各 collection 纯 `updatedAt` 时间戳 churn 混进 feature commit。此时用 `FORCE_DATA_REBUILD=1 npx tsx scripts/data/build-models.ts` 单独跑，从已提交的 champion-details 只重生成 hero-abilities.json/scenarios.json，diff 干净（仅 feature 真实改动）。

## 13. 信号外部化（base→catalog）必须四项核查：base 剔除干净 + catalog 完整 + 端到端接线 + 同构注入器不变量同步

把 effect/signal 从 base（如 `hero-abilities.json`）移到独立 catalog（如 `feat-catalog.json`、`specialization-catalog.json`）供 runtime 按玩家选择注入时，必须四项核查，否则要么双重计数（base 残留 + runtime 注入）要么信号丢失：

1. **base 零残留**：grep 原始 effect 串确认在 base 产物 0 命中。如 ADR 0017 专精外部化后，明斯克 `monster_with_tag_more_damage,300,humanoid`（专精自身）与 `buff_upgrades,25,108`（靶向专精的 wrapper 派生）在 `hero-abilities.json` 均 0——证明已离开 base，runtime 注入不会双计。
2. **catalog 完整**：jq 计 catalog signal 总数与当前产物契约对齐；文档中的计数以产物实际值为准。
3. **端到端接线**：确认加载链路（fetch JSON → collections 字段 → runtime 注入函数 → engine 消费）打通，且边界安全（catalog 缺该英雄 / override 含未知 id 均降级跳过，不抛错）。
4. **同构注入器不变量同步**：feat / specialization 注入器均采用 base 剥离、runtime 按选择追加和 bucket 路由。注入器注入选中项的**全部** signal，scoring 按模式自取所需维度；维度过滤属于 scoring 层（evaluatePlacementFit 的 dimensionFilterSet），不属于注入层。

ADR 0017（专精外部化）即按此模式验证（commit dd31505f 深度审计），feat 外部化同构。
