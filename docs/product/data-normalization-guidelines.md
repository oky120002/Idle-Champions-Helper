# 数据归一化管线规范

- 适用范围：raw `definitions` → normalize → collect → resolve → consume 全链路（`scripts/normalize-idle-champions-definitions.ts`、`scripts/data/**`、`src/domain/abilities/**`，以及 `src/domain/planner/**`、`src/domain/simulator/**` 等消费层）。
- 目标：在 100% AI 开发前提下，保证 raw 基座数据不丢、不错配、不静默漂移。
- 来源：多轮数据流审计沉淀；案例保留为规则的可操作依据，不得在精简时删除。

## 1. amountFunc 约定：解析层 add 不设字段（默认 null=add），消费层必须 `=== 'mult' ? mult : add` 分流

`buildSimplePoolSignal` 对 add 省略 amountFunc 字段；任何新维度的消费侧聚合若一律累乘（如原 `computeVulnerabilityFactor`），会把 add 类信号高估（两个 +100% 易伤算成 4 而非 3）。新增维度时核对消费侧分流与解析层约定一致，并写「多 signal 叠加」测试（单 signal 时累乘与 add 同果，漏覆盖）。

## 2. build 层代码改动后必须重跑 `buildModels` 同步 `hero-abilities.json` 产物

build 层（effect-helpers / signalSemantics 等）改动长期未重跑 build 时，产物停留在旧逻辑（signal 总数 12163→18893、字段补全后才同步）。build 层 commit 后跟一次 `buildModels` 重跑（不需 fetch/资源，直接从 normalized champion-details 生成；裸 `node` 无法解析 src/ extensionless 导入，经 `npx tsx` 或 vitest 运行），或 CI 守护产物新鲜度。

## 3. 条件性匹配前核对字段值域

vulnerability `monsterTags`（boss/fiend）与 `scenario.enemyTypes`（怪物种族 beast/humanoid/…）是不同维度——boss 是怪物等级 `is_boss`，不在 enemyTypes，导致 3 个 boss vulnerability 静默失效。匹配前全量枚举两端值域（jq unique），发现不交即定位缺口。

## 4. 设计文档里的每个公式 / pool / 乘区都要有实现 + 测试

`Π(static_dps_mults)` 类公式写了但 `upgrade.static_dps_mult` 字段长期未读，35 个复杂 effect upgrade 的 dps 丢失。文档公式与实现定期核对，避免「设计了但没做」；`docs/research/data/game-data-source/format-quirks.md` / 加成调研里的特殊 pool 尤其易漏。

## 5. 硬编码的 raw 派生常量必须逐值核对，不能假设序列规律

monsterStats 的 dps boss spike 假设「50,100,150,200...每 50 层」，但 raw `dps_growth_rate_curve` 第 3 个 spike 在 **151**（非 150），从第 3 个起整体 +1 偏移（差值集合 {50,51}）。stepped curve / 枚举型常量（非连续函数）必须 dump 全量 key 逐个比对；「看起来有规律」的假设要 raw 证实，交叉验证用 per-area 复合 log 对比。

## 6. 新增数据字段必须同步接入消费层，否则是数据孤岛

`occupiedSlotCount` 在 build-models 产出、plannerModel 定义、注释承诺「可用容量 = total − occupiedSlotCount」，但 recommendationEngine 只过滤 mechanics `lockedSlots`，未扣减 occupiedSlotCount，65 个 scenario 推荐多填被占格高估 carryDps。字段新增时核对「产出→定义→消费」全链路，注释承诺的行为必须有测试覆盖。

## 7. 注释 / 文档声称的数据源必须真实存在

clickDamage 注释曾声称来源 `click_damage_seconds_global_dps`，但 raw `click_damage_settings` 只有 `{base_power, base_cost, cost_curve, power_curve}`，该字段在 definitions 快照不存在。引用 raw 字段/effect 时先 jq 确认存在，避免「注释声称有据、实为猜测」。

## 8. 文本解析的回退 / 兜底路径必须限定在语义锚点范围内，禁止全文本扫描取值

restrictions-parser 的「take up slots → 取首个数词」回退原对**整段文本**取首个数字，把 variant 430 后文「Only Champions with CHA of **14** or lower」的 14 当成占格数 → occupiedSlotCount=14（> 阵型总槽位 9，availableCapacity=0，该 variant 永不可推荐）。长 flavor 文本里属性要求 / 等级 / cost / 层数等无关数字必然存在，全文本「取首个数字」类兜底必然误抓。搜索范围限定到语义短语窗口（占格实体数词总在动词前 → 只搜「take up slots」之前）；无匹配走 override 或 warning，宁可保守不可误判。回归测试须覆盖「含无关数字的长文本」。

## 9. 派生数据产物与既有归一化字段同源双路径时，记录漂移风险并优先单源派生

`loot-catalog.json`（`buildLootCatalog` 从 raw `loot_defines`）与 `champion-details.loot`（`normalizeChampionLoot` 亦从 raw `loot_defines`）数据完全一致（hero 1 两边均 24 条 (slot,rarity,effect)），属两套代码路径从同一 raw 派生同一结构——当前一致，但单边改动会静默漂移。新增派生产物前先确认既有归一化字段是否已含该数据（本案 `champion-details.loot` 已保留 `slotId`+`rarity`，原注释却声称「slot_id 丢失」，注释错误掩盖了真实复用关系）；若必须另出产物（如运行时需 flat 跨 hero 索引而不载 per-hero 文件），注释须说明真实依据，并在 `m3-data-source-confirmations.md` 等归档标注双路径漂移风险。
