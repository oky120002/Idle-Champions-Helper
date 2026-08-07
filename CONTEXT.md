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

## 场景与限制规则

**场景引用**：
标识玩家目标场景的结构化引用，序列化为 `{kind}:{id}`；kind ∈ campaign（地图）/ adventure（冒险）/ variant（变体）/ trial（试炼）/ timeGate（时空门）。
代码标识符：`scenarioRef`、`ScenarioRef`
别名：scenario ref、场景 id

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

## 推荐目标

**DPS 队 / 主输出（carry）**：
推荐优化目标之一：最大化单英雄 carryDps（主输出伤害），是默认模式。carry 指承担主要输出的英雄。
代码标识符：`ScoringMode: 'carry-dps'`、`carryDps`
别名：评分（已由 scoringMode 优化目标量取代）、carry dps

**金币队**：
推荐优化目标之一：最大化全队金币发现。
代码标识符：`ScoringMode: 'team-gold'`、`teamGoldFind`
别名：金币评分

**速度队**：
推荐优化目标之一：最快过层。当前仅有速度维度信号，尚未接入 ScoringMode（登记为后续目标）。
代码标识符：`HeroAbilityDimension.speed`
别名：speed run
