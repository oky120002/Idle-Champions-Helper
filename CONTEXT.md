# Idle Champions 辅助站 统一语言

本站是《Idle Champions of the Forgotten Realms》个人成长导向的阵型决策台。游戏术语与代码标识符（英文 key）常不一致——面向用户对话先用游戏术语或中文讲清概念，不直接搬代码 key（详见 `AGENTS.md` 沟通用语）；本表是两者的权威映射。

> 加粗术语是唯一推荐用词；「别名」行仅登记同义词与口语词用于识别与消解，不是推荐叫法。

## 阵型与站位

**阵型**：
玩家布置英雄的战斗站位布局。每个阵型布局由若干阵型位按行列坐标组成。
代码标识符：`FormationLayout`
别名：阵容、阵型表

**阵型位**：
阵型布局中的一个位置，按行列坐标定义；英雄被分派到阵型位上。
代码标识符：`FormationSlot`
别名：座位、slot（slot 在代码里指阵型位，不是英雄的座位）

**座位**：
英雄所属的游戏座位编号（bench seat），决定英雄能站哪些阵型位；是英雄的固有属性，不是阵型位。
代码标识符：`seat`（英雄数据字段）
别名：位置、slot（与阵型位是不同概念）

**候选池**：
推荐引擎在某次推荐中考虑的英雄范围。两种模式：仅拥有（`owned-only`，只算用户存档里已拥有的英雄）与全假设（`all-hypothetical`，含未拥有英雄，按默认装备配置计算，给"如果拥有会怎样"的公平基线）。
代码标识符：`buildCandidatePool`、`candidateMode`
别名：候选英雄、candidate pool

## 场景与限制规则

**场景引用**：
标识玩家目标场景的结构化引用，序列化为 `{kind}:{id}`；kind ∈ campaign（地图）/ adventure（冒险）/ variant（变体）/ trial（试炼）/ timeGate（时空门）。
代码标识符：`scenarioRef`、`ScenarioRef`
别名：scenario ref、场景 id

**战役 / 冒险 / 变体**：
场景引用指向的三层嵌套对象：战役（campaign，即地图）包含若干冒险（adventure），冒险下再有变体（variant）附加限制规则；试炼（trial）与时空门（timeGate）是另两种独立场景类型。
代码标识符：`campaign` / `adventure` / `variant` / `trial` / `timeGate`（scenarioRef 的 kind）
别名：地图 / 冒险 / 变体

**强制英雄**：
场景规则要求必须上场的英雄，不受拥有状态或白名单限制。
代码标识符：`forcedHeroes`（planner scenario 字段），派生自游戏 `force_use_heroes`
别名：forced heroes

**护送占位**：
变体规则：护送单位占用阵型位，挤占可上场英雄数量。
代码标识符：变体规则 key `slot_escort`；派生计数 `escortCount`
别名：escort blockers（英文 UI 文案，对话用中文）

**赞助人**：
游戏限制层：选定赞助人后，只有符合资格的英雄可上场，并提供 perk / blessing 加成。
代码标识符：`patronId`（0 = 自由玩，null = 未导入存档）
别名：patron（英文，对话用「赞助人」）

**白名单**：
场景或变体规则：只允许列表中的英雄上场，与赞助人资格是叠加的不同限制层（需同时满足）。
代码标识符：`only_allow_crusaders`、`by_ids`、`by_tags`、`allowedHeroes`
别名：only allow crusaders、限定英雄

**标签**：
英雄或怪物的分类标记，三种用途：(1) 限定条件——白名单或专精解锁按标签筛选可上场英雄；(2) 易伤匹配——按怪物标签条件触发额外伤害；(3) 按标签计数加成——如「每个 [tag] 英雄 +X% 伤害」（count-only 自增益）。英雄标签与怪物标签是不同集合，不互通。
代码标识符：`tag`/`tags`、`by_tags`、`has_tag_X`、`per_tagged_crusader`（英雄）；`monsterTags`、`enemyTypes`（怪物）
别名：tag、标记

## 战斗机制

**BUD（基础大招伤害）**：
Biggest Unique Damage，阵型近期造成过的最高单次伤害值，游戏用作大招（ult）伤害结算基准。推荐引擎区分两个口径：阵型间相对比较用 DPS，推图层数绝对预估用 BUD（怪物血量按 BUD 缩放，见 ADR 0012）。
代码标识符：`BUD`、`computeSingleHitDamage`、`budCalculation.ts`
别名：biggest unique damage、大招基准

**易伤**：
按怪物标签条件匹配的额外伤害加成；只有当场景敌人类型匹配时才生效，是主输出伤害的大头之一。
代码标识符：`vulnerability`、`computeVulnerabilityFactor`、`isVulnerabilityMatched`
别名：vulnerability、弱点

**减伤**：
降低英雄受到伤害的加成，并入生命值通道参与生存评分。代码里中英双形态共存，对话统一用「减伤」。
代码标识符：`damage_reduction_mult`、`damage_reduction`（effect_string）、`damageReduction`
别名：damage reduction、免伤

**多段攻击**：
英雄一次基础攻击命中多个目标，每个目标算一次独立命中（hit）。游戏描述常说「召唤 X 道射线/飞弹」，代码里记录为目标数（numTargets）而非「段数」或「次数」。段数可通过升级/专长/装备的 `add_attack_targets` 效果提升。
代码标识符：`numTargets`（基础目标数）、`add_attack_targets`（段数加成效果）、`damageModifier`（每发伤害系数）
别名：multi-hit、多目标攻击、多次攻击

**伤害系数**：
多段攻击中每单发命中的伤害比例。1.0 = 每发满额，0.33 = 每发仅 1/3 伤害。总伤害 = 段数 × 系数。对护甲敌人碎甲时系数有直接影响——每发伤害必须达到护甲门槛才碎一段，系数低的英雄可能打不动护甲。
代码标识符：`damageModifier`（攻击定义字段）
别名：damage modifier、每发伤害比例

**护甲敌人**：
血条分段显示的敌人（armored hit points），每段有伤害门槛（= 总血量 ÷ 段数，boss 通常 50 段）。单发伤害 ≥ 门槛碎一段（溢出浪费），< 门槛完全无效。判定看 BUD 不看 DPS。与「命中型血量」不同——后者每次命中碎一段不看伤害。代码中无统一字段标识，需从描述文本识别。
代码标识符：无标准字段；描述关键词 `armored hit points` / `armor` / `护甲`
别名：armored enemies、armored health、分段血条

**命中型血量**：
敌人血条分段，每次命中碎一段（不看伤害数值，0 伤害也碎），N 次命中击杀。与「护甲敌人」机制不同——护甲需单发伤害达标才碎，命中型只要碰到就碎。变体描述中记为 "hits-based hit points"。
代码标识符：无标准字段；描述关键词 `hits-based` / `hit points`
别名：hits-based health、命中型

## 成长元素

**装备**：
英雄持有的战利品槽位物品，提供被动加成（DPS / 全队 / 生命 / 金币 / 暴击五通道）。玩家叫「装备」，代码与数据源用 loot（战利品）。
代码标识符：`loot`、`loot-catalog.json`、`OwnedHeroLootSlot`、`equipmentMult`
别名：loot、战利品、gear

**专长**：
英雄可装备的被动修饰器，提供额外加成或改变技能行为；与「专精」是两个不同概念。
代码标识符：`feat`、`feat-catalog.json`、`FeatEntry`
别名：feat

**专精**：
英雄升级树中的分支强化选择，由 gate 节点解锁；选定后注入对应 ability 信号。外部化为 catalog 便于维护。
代码标识符：`specialization`、`specialization-catalog.json`、`applyActiveSpecializations`
别名：specialization

**祝福**：
来自赞助人或地图的被动全局加成。赞助人祝福随赞助人 perk 解锁；地图祝福是部分战役提供的额外效果。两者都并入全队加成通道。
代码标识符：`blessing`、`blessings`、`blessingGlobalBuff`、`collectActiveBlessingEffects`
别名：blessing

**恩宠**：
战役完成后积累的永久货币，每点未花费的恩宠提供 +1% 全队金币发现。可在祝福上花费（花掉后不再计金币加成）。不同战役有各自的恩宠，互不通用。
代码标识符：`favor`、`divineFavor`、`patronObjectiveTiers`（赞助人目标层数）
别名：divine favor、神恩

**传奇装备**：
独立于普通装备（loot）的附加加成层，每英雄 6 个槽位，只提供全队伤害或英雄伤害两类加成。通过提亚马特试炼获取鳞片在熔铸中升级，等级上限 20。与装备五通道不同，传奇效果不进 loot-catalog。
代码标识符：`legendaryEffects`（champion-details 顶层字段）、`LegendaryEffect`
别名：legendary、传奇效果、熔铸

**压制**：
坦克属性：当场上敌人数量超过坦克的压制值时，所有超出的敌人对全队造成额外伤害。高区域后坦克价值从硬抗转为血量共享，极高区域后仅靠击退/免死/闪避生存。
代码标识符：`overwhelm`、`overwhelm_start_increase`
别名：overwhelm、超额敌人伤害

## 推荐目标

**DPS 队 / 主输出（carry）**：
推荐优化目标之一：最大化单英雄 carryDps（主输出伤害），是默认模式。carry 指承担主要输出的英雄。
代码标识符：`ScoringMode: 'carry-dps'`、`carryDps`
别名：评分（已由 scoringMode 优化目标量取代）、carry dps

**辅助英雄（support）**：
与主输出 carry 对应的角色：通过 buff / 全队加成 / 易伤 / 减伤等支援主输出的英雄。推荐评分按维度信号（carry / support）分别累加。
代码标识符：`HeroAbilityDimension.support`、`supportSignals`
别名：support、辅助

**金币队**：
推荐优化目标之一：最大化全队金币发现。
代码标识符：`ScoringMode: 'team-gold'`、`teamGoldFind`
别名：金币评分

**速度队**：
推荐优化目标之一：最快过层。当前仅有速度维度信号，尚未接入 ScoringMode（登记为后续目标）。
代码标识符：`HeroAbilityDimension.speed`
别名：speed run
