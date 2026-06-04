# planner signal 覆盖率盘点

- 作用：基于真实 `public/data/v1/champion-details/*.json` 统计 planner 当前已识别 signal、叠层组合、filter 与 `per_hero_expr` 的覆盖情况，用来决定下一刀该补什么。
- 命令：`npm run data:planner-coverage`
- 结论日期：`2026-06-04`

## 核心结论

- 当前共有 `162` 个英雄详情，扫描到 `21609` 条 effect entry。
- 其中 `9860` 条已被 planner 识别成可消费 signal，`11749` 条仍属于 planner 当前不消费的 effect。
- 对已识别 signal 而言，当前评分链路的组合支持率已经很高：
  - `supported`: `9829` (`99.69%`)
  - `unsupported-composition`: `24` (`0.24%`)
  - `manual`: `7` (`0.07%`)
- 这说明下一步**不应该优先继续补更多 `stack_func`**；组合覆盖已接近饱和。

## 当前高频组合

- `none__none`: `9434`
- `per_crusader__add`: `372`
- `per_hero_attribute__mult`: `26`
- `per_hero__mult`: `4`
- `per_upgrade_targets__mult`: `4`

结论：

- 已支持的高价值组合已经覆盖了绝大多数可识别 signal。
- 继续补 `per_other_stack_count`、`per_mithral_hall_stacks`、`per_aerois_synergy` 这类低频私有 stack，当前收益很低。

## qualifier / filter 现状

- carry target qualifier：
  - `requiredTags`: `280`
  - `requiredStats`: `201`
- formation count qualifier：
  - tag: `184`
  - stat: `128`
  - age: `1`

高频 filter：

- `by_tags:female`: `49`
- `by_tags:male`: `40`
- `by_tags:human`: `32`
- `stat_score:cha>=11`: `24`
- `stat_score:con>=11`: `18`
- `stat_score:int>=11`: `18`

结论：

- 当前 tag / stat qualifier 这条线是值得的，而且已经覆盖了大部分高频场景。
- 年龄限定真实数据里很少，当前不值得把年龄表达式继续做成重体系。

## per_hero_expr 现状

- 总量：`183`
- 当前可解析：`123` (`67.21%`)
- 当前未解析：`60`

高频未解析表达式：

- `0`: `6`
- `!HasEffect(\`vampire_spawn\`)`: `2`
- `AverageILevels()`: `2`
- `(HasTag(\`female\`) || HasTag(\`non_binary\`)) && age<110`: `1`
- `1 + as_int(hero_id==75)*2`: `1`

结论：

- `HasAttackDamageType(...)`、最小否定 `!HasAttackDamageType(...)` 与 `is_undead -> undead tag` 已落地，真实覆盖率从 `59.02%` 提升到 `67.21%`。
- `!HasEffect(\`vampire_spawn\`)` 继续保持未解析：它描述的是运行时是否已被特殊效果标记，不是稳定静态英雄事实，当前不应硬塞进 planner model。
- 如果继续补 parser，下一优先级才是可落到稳定事实源的简单 `&&` 组合；涉及运行时状态、公式和动态变量的表达式继续降级 warning。
- 含公式、等级、装备平均值、动态变量的表达式，仍应继续降级 warning，不值得现在硬算。

## 下一刀建议

1. 继续审计简单二元 `&&` 组合里哪些子句都能落到稳定事实源，再决定是否做成受控子集。
2. 保持 `!HasEffect(...)` 这类运行时状态表达式为 warning，不做静态猜测。
3. 继续保持私有 stack、动态公式和复杂运行时表达式为 warning，不做猜测。
