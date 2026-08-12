# 数据解析与运行时模型陷阱

本文件沉淀 planner 数据解析（restriction 文本 / 正则覆盖）与运行时模型（吞吐量约束 / 过滤条件 / 理论验证）中**真实踩过、代价昂贵、易重犯**的陷阱。加成建模陷阱见 `modeling-pitfalls.md`。

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

## 陷阱 10：理论推测「需迭代求值」未经数据验证

HasEffect/HasEffectByID 谓词最初经理论分析判定为「阵型运行时另案——effect 跨英雄共享，count qualifier 对全 Y 求值致 cross，需 effect 作用图 + 迭代求值直到收敛」。但实际实现前逐条审计 7 个去重实例后发现：**全部是单向依赖，无一需迭代**。

- Knox `HasEffect(celeste_heal)` ← Celeste 在阵型 + Knox 在 next_col（单向位置判定）
- Skylla `HasEffectByID(2474)` ← 自身 ability targets next_col（自引用但非循环）
- Alyndra `HasEffect(alyndra_portented_v2)` ← changing_effect_keys 派生，全队（单向）
- 其余同理——均为「授予英雄在场 + targeting 匹配」的一次性判定

### 为什么会发生

1. 理论推测基于通用模型（effect 作用图可能有循环），但真实数据中 7 个实例碰巧都是无环的。
2. 「需迭代求值」被当作定论记录到记忆和文档中，后续无人质疑。
3. 延迟了实现——被归为「最复杂的剩余任务」，实际上只需 build 期提取 + runtime 一次扫描。

### 防范纪律（可执行）

- **复杂架构设计前先枚举所有真实实例**：用 `rg`/`jq` 在数据中穷举目标谓词/模式的全部出现，逐条判定是否真有理论推测的复杂依赖。通用模型的最坏情况 ≠ 真实数据的实际情况。
- **理论推测标注「未经数据验证」**：记忆和文档中记录推测时须显式标注，避免后人当作事实。实现前须回溯验证。
- **先建最小可行路径再按需升级**：即使理论上可能需迭代，先按无迭代实现（一次扫描），数据验证后如确有循环再升级。避免预建复杂度。
