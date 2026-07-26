# 数据归一化管线规范

- 适用范围：raw `definitions` → normalize → collect → resolve → consume 全链路（`scripts/normalize-idle-champions-definitions.ts`、`scripts/data/**`、`src/domain/abilities/**`，以及 `src/domain/planner/**`、`src/domain/simulator/**` 等消费层）。
- 目标：在 100% AI 开发前提下，保证 raw 基座数据不丢、不错配、不静默漂移。
- 来源：多轮数据流审计沉淀；案例保留为规则的可操作依据，不得在精简时删除。

## 1. amountFunc 约定：解析层 add 不设字段（默认 null=add），消费层必须 `=== 'mult' ? mult : add` 分流

`buildSimplePoolSignal` 对 add 省略 amountFunc 字段；任何新维度的消费侧聚合若一律累乘（如原 `computeVulnerabilityFactor`），会把 add 类信号高估（两个 +100% 易伤算成 4 而非 3）。新增维度时核对消费侧分流与解析层约定一致，并写「多 signal 叠加」测试（单 signal 时累乘与 add 同果，漏覆盖）。

## 2. script 层（normalize + build）改动后必须重跑对应产物，否则修复停留在脚本层不生效

build 层（effect-helpers / signalSemantics 等）改动长期未重跑 build 时，产物停留在旧逻辑（signal 总数 12163→18893、字段补全后才同步）。build 层 commit 后跟一次 `buildModels` 重跑（不需 fetch/资源，直接从 normalized champion-details 生成；裸 `node` 无法解析 src/ extensionless 导入，经 `npx tsx` 或 vitest 运行），或 CI 守护产物新鲜度。

normalize 层（normalize-adventures 等）同理：改动后必须重跑 normalize 同步 `variants.json`，否则下游 `scenarios.json`（build 层读 `variant.enemyTypes`）继承旧值。`variants.json` 曾停留旧快照，null byte dedup 修复与 boss enemyTypes 修复都停留在脚本层、运行时不生效。normalize 层重跑需同快照的 source + ZH(lang-7) 双 raw，本地缺失 ZH raw 时无法忠实重生（API 现服更新版会引入无关 diff），须在拉取双 raw 的完整 `npm run data:official` 周期一并生效。

## 3. 条件性匹配前核对字段值域，排除集须与消费词表对齐

vulnerability `monsterTags`（boss/fiend）与 `scenario.enemyTypes`（怪物种族 beast/humanoid/…）做条件性匹配时，两端值域必须相交。曾误判 boss 是独立 `is_boss` 维度、不该进 enemyTypes——实际 raw `monster_defines` 用 `tags:["boss"]` 标记 boss（808/2326 怪），与 fiend 同维；boss 不在 enemyTypes 的真因是 `GENERIC_MONSTER_TAGS` 把 boss 当"非类型通用 tag"排除了（与 melee/ranged 同列），而 vulnerability 词表含 boss → 3 个 boss vulnerability 信号在 `steadyStateScoring` 永远命中不了。修复：从 `GENERIC_MONSTER_TAGS` 移除 boss（melee/ranged 由 attackMix 承载、hits_based/armor_based/static/flying 不在 vulnerability 词表，仍排除）。规则：enemyTypes 的排除集不得包含任何出现在 `monsterTags` 里的 tag——全量枚举两端值域（jq unique）取交集，排除集 ∩ vulnerability 词表 必须为空。

**UI 展示层消费 enemyTypes 须过滤非种族 tag**：enemyTypes 含 boss 是 vulnerability 词表对齐的需要（数据层），但「敌人类型」chip/过滤器/占比面向种族展示——boss 已在 `specialEnemyCount` 独立展示，melee/ranged 由 attackMix 承载。UI 所有消费点（`variant-model` 过滤器选项 + 搜索、`variant-grouping` 聚合、`variant-detail-model` 占比、`VariantAdventureSection` chip）统一经 `variant-labels.ts` 的 `NON_DISPLAY_ENEMY_TAGS` 过滤；planner 侧 `scenario.enemyTypes` 不过滤（vulnerability 匹配需要 boss）。教训：字段同时服务「vulnerability 词表」与「UI 种族展示」两个语义时，在消费层分离视图，不污染展示——别为匹配便利往展示字段塞非展示值。

## 4. 设计文档里的每个公式 / pool / 乘区都要有实现 + 测试

`Π(static_dps_mults)` 类公式写了但 `upgrade.static_dps_mult` 字段长期未读，35 个复杂 effect upgrade 的 dps 丢失。文档公式与实现定期核对，避免「设计了但没做」；`docs/research/data/game-data-source/format-quirks.md` / 加成调研里的特殊 pool 尤其易漏。

## 5. 硬编码的 raw 派生常量必须逐值核对，不能假设序列规律

monsterStats 的 dps boss spike 假设「50,100,150,200...每 50 层」，但 raw `dps_growth_rate_curve` 第 3 个 spike 在 **151**（非 150），从第 3 个起整体 +1 偏移（差值集合 {50,51}）。stepped curve / 枚举型常量（非连续函数）必须 dump 全量 key 逐个比对；「看起来有规律」的假设要 raw 证实，交叉验证用 per-area 复合 log 对比。

**守护测试也必须全量逐边界，不能采样**：`gameRulesSync.test` 原只采样 area 50 首个 dps spike + 第一段 health 增长率，漏掉其余 48 个 spike 与 2001/2251 分段边界——硬编码值当前正确但守护盲区大，上游改任意 spike 位置/倍率或分段值都发现不了。stepped curve / spike 序列的守护用「逐 area 局部增长率 `statFn(A)/statFn(A-1) === raw curve[A]`」全量遍历 raw curve 的每个 key（用 Decimal 比值避免大 area 量级溢出 number；`toBeCloseTo(6)` 容纳末位浮点误差，仍能检出 >= 1e-3 量级的真实分段/spike 漂移）。

## 6. 新增数据字段必须同步接入消费层，否则是数据孤岛

`occupiedSlotCount` 在 build-models 产出、plannerModel 定义、注释承诺「可用容量 = total − occupiedSlotCount」，但 recommendationEngine 只过滤 mechanics `lockedSlots`，未扣减 occupiedSlotCount，65 个 scenario 推荐多填被占格高估 carryDps。字段新增时核对「产出→定义→消费」全链路，注释承诺的行为必须有测试覆盖。

## 7. 注释 / 文档声称的数据源必须真实存在

clickDamage 注释曾声称来源 `click_damage_seconds_global_dps`，但 raw `click_damage_settings` 只有 `{base_power, base_cost, cost_curve, power_curve}`，该字段在 definitions 快照不存在。引用 raw 字段/effect 时先 jq 确认存在，避免「注释声称有据、实为猜测」。

## 8. 文本解析的回退 / 兜底路径必须限定在语义锚点范围内，禁止全文本扫描取值

restrictions-parser 的「take up slots → 取首个数词」回退原对**整段文本**取首个数字，把 variant 430 后文「Only Champions with CHA of **14** or lower」的 14 当成占格数 → occupiedSlotCount=14（> 阵型总槽位 9，availableCapacity=0，该 variant 永不可推荐）。长 flavor 文本里属性要求 / 等级 / cost / 层数等无关数字必然存在，全文本「取首个数字」类兜底必然误抓。搜索范围限定到语义短语窗口（占格实体数词总在动词前 → 只搜「take up slots」之前）；无匹配走 override 或 warning，宁可保守不可误判。回归测试须覆盖「含无关数字的长文本」。

## 9. 派生数据产物与既有归一化字段同源双路径时，记录漂移风险并优先单源派生

`loot-catalog.json`（`buildLootCatalog` 从 raw `loot_defines`）与 `champion-details.loot`（`normalizeChampionLoot` 亦从 raw `loot_defines`）数据完全一致（hero 1 两边均 24 条 (slot,rarity,effect)），属两套代码路径从同一 raw 派生同一结构——当前一致，但单边改动会静默漂移。新增派生产物前先确认既有归一化字段是否已含该数据（本案 `champion-details.loot` 已保留 `slotId`+`rarity`，原注释却声称「slot_id 丢失」，注释错误掩盖了真实复用关系）；若必须另出产物（如运行时需 flat 跨 hero 索引而不载 per-hero 文件），注释须说明真实依据，并在 `docs/specs/modules/planner/data-source-confirmations.md` 等归档标注双路径漂移风险。

## 10. 文本模板解析器漏匹配时走 override，不拓宽 regex；override 子串须全量核爆半径扫描

restrictions 文本模板（"数字 + slots + occupy 动词"）对动词变位（takes/taking up 不含 take up 子串）、number 与 slots 间插修饰词（three formation slots）、同义词（take up space/spots）、ZH 量词位置（三只黑猫 / 三个阵型格子，数字不在格上）等措辞**双侧漏匹配**——这些是可定数的真实占格数据被静默丢弃。**根因修复走 `RESTRICTION_OVERRIDES` 手工补，不拓宽 regex**：拓宽 number-slot 间距或加 space 同义词会引入 variant 430 式数词误抓与假阳性（详见 §8），精度损失 > 召回收益。模板 + override 是既定的精度/召回拆分——模板保守保精度，漏匹配的低频模式进 override（显式、可逐条核对、零假阳性风险）。

override 用 `includes` 子串匹配，**一条 match 可能命中多个 variant**（"barovian wedding" 同时命中 v414 宾客与 v682 婚礼客、"bronze dragon joins the formation" 同时命中 v1261 三格与 v1629 两格）。新增 override 时必须全量扫整个语料核对每条 match 的命中 variant 列表：① 具名专属串（"rudolph van richten and his ally"）排在泛化串（"barovian wedding"）前——`matchOverride` 取首个命中；② 区分 NPC 占格 vs 英雄 forcedHeroes（v682 Rudolph+Ireena 是 NPC→2 格，v1977/78/79 Rudolph 是 forcedHeroes 英雄→0，泛化串 "rudolph van richten" 会把后者误判为 2）。

**歧义标记须用二级标记消歧**：排除「变量递增占格」时，"每经过 N 区域" 既可表计数递增（每周期 +1 格）也可表位置轮换（固定 N 格换位置）甚至无关机制（气味/伤害改变）。必须先用位置轮换标记放行再判递增——否则固定 N 格换位置的 variant（v241 两格换位置）被 "每经过" 误清零。任何"看起来有规律"的排除标记都要 raw 全量核对两类语义后再生效。

**位置轮换标记不能用孤立短词**：原用孤立「移动」做标记，误匹配 v296「守望者...无法被移动或移除」（forcedHeroes 英雄锁定，非 NPC 换位置），把变量递增（每 50 区域 +1 格）误判为位置轮换、跳过排除、误产 occ=1。改为只收明确的位置变化短语（阵型中移动 / 移动位置 / 改变位置 / 变换位置 / 切换位置）。标记词越短（单字「移动」），命中否定语境（无法被移动 / 可以被移动 / 移动速度）的概率越高——位置轮换标记须与实体主动换位置的动作绑定，不留孤立短词。

## 11. 派生值的折算/缩放收敛在 normalize 层，不分散到消费层多路径

ability ult buff 的 uptime 折算（`value × duration/base_cooldown`）若放消费层，会因 `collectEffectEntries` 的多派生路径（wrapper 派生 `upgrade-buffed-signal` / static-dps fallback / 直接 entry）各自折算或丢失 entry 标记——Channel Divinity（`buff_upgrades` wrapper）派生 signal 会丢原 entry 的 duration/base_cooldown，无法折算。**根因方案**：折算收敛在 normalize 层（`normalizeChampionAbility` 把 `value × uptime` 预折算进 effect_string），消费层（`collectRawEffectEntries` `'ability'` 源）按折算后串正常处理——wrapper 派生自动用折算后 magnitude，所有路径一致。规则：当派生值（uptime / rarity 缩放 / level 折算等）需穿越消费层多路径时，在 normalize 层预折算进 effect_string，而非要求每个消费路径各自识别 + 折算。

## 12. normalize/build 增量跳过：updatedAt + pipelineHash 双判定，FORCE 强制逃生

CLAUDE.md §1.2「未变整批跳过重生成」在 normalize/build 的实现：`normalizeDefinitionsSnapshot` 与 `buildModels` 开头对比 ① raw `current_time`（→ updatedAt）与产物 `updatedAt`、② 数据管线源码指纹 `pipelineHash`——两者都没变才 skip。三种重跑触发：

- **raw 更新**（游戏数据更新）：`current_time` 前进 → updatedAt 变 → 重跑。
- **逻辑改动**（开发者改 normalize/build/数据脚本）：`pipelineHash` 变（`scripts/data` 下非 test 的 .ts + normalize/fetch/build 三入口 sha256）→ 自动重跑，**不依赖开发者记得 force**——这是核心，避免「改了 normalize 逻辑但产物没刷新」的陷阱（如本次 14.4 ability：若只比 updatedAt，raw 没变则 skip，ability 不进产物；pipelineHash 检测到 normalize-champions.ts 改动 → 自动重跑）。
- **`FORCE_DATA_REBUILD=1`**：手动强制逃生口，覆盖「调试 / 嫌疑产物脏」等需要无条件重跑的场景。

`pipelineHash` 粗粒度覆盖整个 `scripts/data/`：任何数据脚本（effect-helpers / build-models / normalize-champions / patron-perk-signals / ...）改动都触发重跑，保守不漏优于精确但漏检。fetch 无法下载前跳过（discovery 只返回 play_server，`current_time` 在 getDefinitions 响应里），故 fetch 仍每次下载；normalize/build 的 skip 在 fetch 之后生效——raw 没变时省 normalize/build 的几秒重生成，但不省 fetch 带宽。

**只改 build 产物时单独跑 build-models，避免上游 timestamp 漂移污染 diff**：feature 只动 `build-models.ts`（新增派生字段，如 `gainProfile`）时，跑全量 `data:official` 会顺带 fetch 上游——CNE definitions `current_time` 每日 ticking（即使内容没变）→ normalize 全刷 → ~180 个 champion-details/*.json + 各 collection 纯 `updatedAt` 时间戳 churn 混进 feature commit。此时用 `FORCE_DATA_REBUILD=1 npx tsx scripts/data/build-models.ts` 单独跑，从已提交的 champion-details 只重生成 hero-abilities.json/scenarios.json，diff 干净（仅 feature 真实改动）。
