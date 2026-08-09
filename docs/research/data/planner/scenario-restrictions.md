# 场景限制数据核实

## restrictions 高频模式

**结论：restrictions 高度离散，可模板化的高频模式仅 slot-occupying 一类；其余为 flavor 文本，低频手工补。**

### 数据源

- `variants.json.items[].restrictions: Array<{original, display}>`（normalize 后，双语）。1405 variant 全部有 restrictions。
- 来源字段：`adventure_defines.restrictions_text`（raw，字符串）；variant 继承自父 adventure。
- `buildOfficialScenarioModel` 把 `variant.restrictions` 非空时标 warning「自由文本，尚未自动解析，请人工复核」；`RESTRICTION_OVERRIDES`（`restrictions-parser.ts`）提供手工补机制。

### 模式分布

restrictions 绝大多数是**独特 flavor 文本**（描述特殊冒险机制：疯牛/暗影怪/无限亡灵等），不映射到阵型约束。可操作（影响阵型合法性/候选池）的模式只有两类，且各模式频次极低（1–2 次）：

**① slot-occupying（→ lockedSlots，最高价值）**：全文仅 5 条 EN 提及 "slots" + 占据语义：

| 模式（EN） | ZH | 锁定格数 |
|---|---|---|
| Four slots...occupied by chickens | 四格会被小鸡占据 | 4 |
| Two random slots...cursed | 两格被诅咒 | 2 |
| Three friendly imps take up slots | 三个友好小鬼占据 | 3 |
| The Farmer's Daughter and Son take up two slots | 农夫之女与子占两格 | 2 |
| Friendly animals take up slots...one slot...then every... | 友好动物占格（1 + 随层数递增） | 变量（复杂，手工补） |

**② champion-tag 限制（→ allowedTagExpression，已被 mechanics 覆盖）**：「Only Evil Champions」「may only use Ranger, Druid, and/or Barbarian」等。已被结构化 `only_allow_crusaders` mechanics 捕获（scenario.allowedTagExpression/allowedHeroes），restrictions_text 版本冗余，不重复解析。

### 模板盲区与 override 扩展

全量回扫发现 EN/ZH 模板对以下措辞**双侧漏匹配**（非英雄占格、可定数，但超出模板语法）：

| 漏匹配模式 | 原因 | 典型 variant |
|---|---|---|
| `takes/taking up slots`（动词变位） | `EN_TAKE_UP_SLOTS_RE` 只匹配 `take/took up` | v682/v481 |
| `three formation slots`（number 与 slots 间插修饰词） | `EN_NUMBER_SLOTS_RE` 要求数字紧邻 slots | v1124 |
| `take up space`（space 非 slots） | occupy 关键词与数词提取均绑 slots | v414/v444/v1589 |
| `takes up two spots`（spots 非 slots） | 同上，且动词变位 | v1629 |
| ZH `三个阵型格子`（量词/修饰词在数词与格间） | ZH regex 要求数字紧贴格 | v1124 ZH |
| ZH 数字在实体上（`三只黑猫`、`两个粉丝`） | ZH regex 只找格前的数词 | v1589/v444 ZH |
| 具名实体无数词（Rudolph + Ireena、无知向导） | 无显式数词可提取 | v682/v96 |

不拓宽模板（拓宽 number-slot 间距 / 加 space 同义词会引入 variant 430 式数词误抓与假阳性），走 `RESTRICTION_OVERRIDES` 手工补：每条 override 的 match 子串须全量扫 1405 variant 核爆半径，具名专属串排在泛化串前（排序约定见 `restrictions-parser.ts` 注释）。

**ZH 变量递增 vs 位置轮换**：「每经过 N 区域」既可表计数递增（v70/v116/v127/v296/v461：每周期 +1 格）也可表位置轮换（v241/v419/v137：固定 N 格换位置）甚至无关机制（v384 气味改变）。`ZH_AREA_INCREMENT_RE` 排除前须先经 `ZH_POSITION_ROTATION_RE`（阵型中移动 / 移动位置 / 改变位置 / 变换位置 / 切换位置）放行——位置轮换计数不变，正常取数。regex 只收明确位置变化短语（不收孤立「移动」，否则误匹配 v296「守望者...无法被移动或移除」这类 forcedHeroes 英雄锁定描述）。

---
