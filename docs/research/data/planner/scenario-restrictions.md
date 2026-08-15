# 场景限制数据核实

## restrictions 高频模式

**结论：restrictions 高度离散；当前稳定模板覆盖确定性占格和部分伤害来源位置，其余机制仍保留 warning，避免把自由文本误判成硬约束。**

### 数据源

- `variants.json.items[].restrictions: Array<{original, display}>`（normalize 后，双语）。当前场景产物覆盖 1424 个 variant。
- 来源字段：`adventure_defines.restrictions_text`（raw，字符串）；variant 继承自父 adventure。
- `buildOfficialScenarioModel` 只为未被模板或结构化字段覆盖的 restriction 保留 warning；`RESTRICTION_OVERRIDES`（`restrictions-parser.ts`）提供低频、可证明占格的手工补机制。

### 模式分布

restrictions 绝大多数是**独特 flavor 文本**（描述特殊冒险机制：疯牛/暗影怪/无限亡灵等），不映射到阵型约束。当前可稳定映射到阵型合法性/候选池的模式包括确定性占格、伤害来源位置和 champion-tag 限制；无法证明的机制继续保留 warning。

**① slot-occupying（→ `occupiedSlotCount`，最高价值）**：模板解析 `slots/spots`、常见占格动词变位和明确加入指定 slots；具名/歧义措辞走显式 override。当前产物有 74 个场景的 `occupiedSlotCount > 0`，区域递增占格仍不固定为单一数值：

| 模式（EN） | ZH | 锁定格数 |
|---|---|---|
| `Four slots ... occupied` / `Three ... take up slots` | 数字 + `slots` | 固定数值 |
| `take up three spots` | 数字 + `spots` | 固定数值 |
| `Two Giant Frogs join ... in slots 5 and 6` | 明确加入指定 slots | 2 |
| `Friendly animals take up slots ... every ... a new animal joins` | 区域递增实体 | 变量，保留 warning |

**② champion-tag 限制（→ allowedTagExpression，已被 mechanics 覆盖）**：「Only Evil Champions」「may only use Ranger, Druid, and/or Barbarian」等。已被结构化 `only_allow_crusaders` mechanics 捕获（scenario.allowedTagExpression/allowedHeroes），restrictions_text 版本冗余，不重复解析。

**③ 伤害来源位置（→ `damageSourcePattern`）**：当前产物稳定解析 same-column 2、adjacent 10、not-adjacent 7、within-slots 3、front-columns 4、behind-columns 2。`includeReference` 严格来自原文是否明确列出参考英雄自身；前后列只表示严格前/后方列。绝对前/后列、顶/底槽、指定槽位和运行时 buff 目标仍保留 warning，不套用相对参考英雄模型。

### 模板边界与 override 扩展

全量回扫确认以下措辞不直接泛化为模板，避免把长文本中的无关数字误当占格；其中可证明的固定数值由 override 或更具体规则处理：

| 漏匹配模式 | 原因 | 典型 variant |
|---|---|---|
| `three formation slots`（number 与 slots 间插修饰词） | `EN_NUMBER_SLOTS_RE` 要求数字紧邻 slots | v1124 |
| `take up space`（space 非 slots） | occupy 关键词与数词提取均绑 slots | v414/v444/v1589 |
| ZH `三个阵型格子`（量词/修饰词在数词与格间） | ZH regex 要求数字紧贴格 | v1124 ZH |
| ZH 数字在实体上（`三只黑猫`、`两个粉丝`） | ZH regex 只找格前的数词 | v1589/v444 ZH |
| 具名实体无数词（Rudolph + Ireena、无知向导） | 无显式数词可提取 | v682/v96 |

不把 `take up space` 等缺少可靠数值锚点的措辞泛化为正则，走 `RESTRICTION_OVERRIDES` 手工补：每条 override 的 match 子串须全量扫描命中范围，具名专属串排在泛化串前（排序约定见 `restrictions-parser.ts` 注释）。

**ZH 变量递增 vs 位置轮换**：「每经过 N 区域」既可表计数递增（v70/v116/v127/v296/v461：每周期 +1 格）也可表位置轮换（v241/v419/v137：固定 N 格换位置）甚至无关机制（v384 气味改变）。`ZH_AREA_INCREMENT_RE` 排除前须先经 `ZH_POSITION_ROTATION_RE`（阵型中移动 / 移动位置 / 改变位置 / 变换位置 / 切换位置）放行——位置轮换计数不变，正常取数。regex 只收明确位置变化短语（不收孤立「移动」，否则误匹配 v296「守望者...无法被移动或移除」这类 forcedHeroes 英雄锁定描述）。

---
