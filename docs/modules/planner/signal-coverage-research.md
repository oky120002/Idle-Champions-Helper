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
  - tag: `182`
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
- `floor(max(has_tag_acqinc,has_tag_cteam)*min(hero_level,hero_softcap+max_levels_past_soft_cap))`: `2`
- `!HasTag(\`aasimar\`) && ... && (!HasTag(\`human\`) || hero_id==75) && ...`: `1`
- `as_int(GetStat(\`int\`) >= min_stat_value)`: `1`
- `base_attack_cooldown`: `1`

结论：

- `HasAttackDamageType(...)`、最小否定 `!HasAttackDamageType(...)`、`is_undead -> undead tag`、`!HasTag(...)`、简单 `tag && stat/age` 组合、`as_int(HasTag(...))` / `as_int(!HasTag(...))` 包装，以及 `base_attack_cooldown<=N` 这类冷却比较表达式已落地。
- 当前解析率回到 `67.21%`，但这次口径比之前更可信：parser 已经不再把复杂包装公式误判成“已解析”，新增覆盖来自明确可落到静态事实源的受控子集。
- `!HasEffect(\`vampire_spawn\`)` 继续保持未解析：它描述的是运行时是否已被特殊效果标记，不是稳定静态英雄事实，当前不应硬塞进 planner model。
- 如果继续补 parser，下一优先级不再是简单 `as_int(tag)` 或 cooldown 比较，而是继续审计 `EligibleForPatron(...)`、裸 `base_attack_cooldown` 与其余简单运行时变量到底能否稳定落到静态事实源。
- 含公式、等级、装备平均值、动态变量的表达式，仍应继续降级 warning，不值得现在硬算。

## 下一刀建议

1. 审计 `EligibleForPatron(...)` 是否存在稳定、公开且不依赖用户私有状态的事实源。
2. 保持 `!HasEffect(...)` 这类运行时状态表达式为 warning，不做静态猜测。
3. 继续保持裸 `base_attack_cooldown`、私有 stack、动态公式和复杂运行时表达式为 warning，不做猜测。
