<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- css/tsx 体量预算超限，4 文件需按业务边界拆 <!-- auto-todo:id=atd_5fbbb7ac36 -->
  - 记录时间: `2026-07-20T11:43:52+08:00`
  - 类型: optimization
  - 位置: `src/styles/pages/champions.css:1`
  - 备注: champions.css 647 行（>520 必须拆）、planner.css / shared/results/card.css / shared/workbench/toolbar.css 约 407 行（应拆）；PageWorkbenchShell.tsx 271、WorkbenchScaffold.tsx 266（应拆）
    - 策略：下次触碰对应文件时按业务边界拆，不强制现在拆

- deleteUserProfileData 未清 heroAbilityOverrides + generateCoverageReport 孤儿 <!-- auto-todo:id=atd_d15fc2acfd -->
  - 记录时间: `2026-07-20T11:43:52+08:00`
  - 类型: follow-up
  - 位置: `src/data/user-profile-store/userProfileStore.ts:68`
  - 备注: deleteUserProfileData 语义是删 profile snapshot（handleDelete 后 setSyncState no-snapshot），不清 heroAbilityOverrides；override 是否随 profile 删待产品决策
    - generateCoverageReport：simulator-data-coverage.mjs 孤儿无 CLI 入口，保留作 M2/M3 definition-key 覆盖审计或删

- formation-persistence validation 不校验 scenarioRef <!-- auto-todo:id=atd_c6d7b8b82a -->
  - 记录时间: `2026-07-20T11:43:52+08:00`
  - 类型: follow-up
  - 位置: `src/data/formation-persistence/validation.ts`
  - 备注: validation.ts 只校验 slotIds/championIds，不校验 scenarioRef.kind/id（文档已按代码事实修正）
    - 处置：若产品需识别失效场景身份，再补 scenarioRef 校验

- 9.1 escort 锁槽按 column 降序启发式，官方未标注具体槽位 <!-- auto-todo:id=atd_492b5b61bd -->
  - 记录时间: `2026-07-20T11:43:52+08:00`
  - 类型: issue
  - 位置: `scripts/data/build-models.mjs`
  - 备注: projectMechanicsToScenario 对 slot_escort* mechanic 按 column 降序锁前排首槽（启发式，官方未标注护送具体槽位）
    - 处置：精确槽位需官方 formation 元数据或人工校准后替换

- placementFit.ts 仍超体量预算（567 行，>480 必须拆） <!-- auto-todo:id=atd_f1c3d69582 -->
  - 记录时间: `2026-07-20T12:52:00+08:00`
  - 类型: optimization
  - 位置: `src/domain/planner/placementFit.ts:1`
  - 备注: 第三轮审计重构已减 213 行（消除 stackFunc 分支重复），但文件仍承载 pool 聚合 + 位置关系匹配 + stack 计数解析三职责。
    - 处置: 下次触碰时按职责拆分（positionMatching / stackResolution / poolAggregation），不强制现在拆

- mobile-header-layout E2E 预存在失败：menuToggle.click 被 .app-shell--workbench 拦截 <!-- auto-todo:id=atd_3bd0ba66aa -->
  - 记录时间: `2026-07-20T14:37:58+08:00`
  - 类型: bug
  - 位置: `tests/e2e/mobile-header-layout.spec.ts:68`
  - 备注: M1 第四轮审计期间运行 test:regression 时发现；stash 改动后在干净 base（5b3fdd78）上同样失败，确认与 planner 攡动无关。
    - 影响：test:regression 关卡的 test:e2e 步骤始终红，掩盖后续真实 E2E 回归
    - 证据：menuToggle.click 被 .app-shell--workbench intercepts pointer events；可能是 z-index/overlay/工作台 shell 在移动端视口下覆盖了 nav toggle
    - 排查方向：移动端视口下 .app-shell--workbench 与 .site-nav 的堆叠上下文与 pointer-events

- IC 英雄谓词布尔表达式建统一解析器（tags+per_hero_expr 完全合一） <!-- auto-todo:id=atd_c079723eeb -->
  - 记录时间: `2026-07-20T16:07:10+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/signalSemantics.js:278`
  - 备注: IC 数据有一个统一的「英雄谓词布尔表达式」语言，当前 4 个分散解析器各处理一部分，且 HeroQualifier 扁平结构表达不了布尔树（复合表达式 mergeTagRequirements 返回 null）。是否合一用纯技术两层标准判断（不按需求/归属）：① 语法同构——操作符集/操作数形式/中缀或前缀一致，同一 parser 能解析；② 求值同域——表达式对同一对象求值。两层都满→完全合一（parser+evaluator）；只语法同构→合 parser 分 evaluator；都不满→不合。
    - 语法 spec：操作符 |（OR）、^（AND，IC 用 ^ 非 &&）、!（NOT）、()、||、&&；操作数两种 surface——简写裸 tag（tags 字段：cleric|wizard、lawful^good、!evil^!blackdicesociety）和函数式（per_hero_expr：HasTag(\`x\`)、GetStat(\`CHA\`)>=11、age<=20、is_undead、HasAttackDamageType、!HasTag）
    - 字段×surface×技术分类实测（raw upgrade_defines/effect_defines）：
    - tags 字段（|×112 ^×30 含复合 20）：语法=布尔中缀 + 裸 tag 操作数；求值=对英雄 tag 集 → 与 per_hero_expr 同域
    - per_hero_expr（||×53 &&×23）：语法=布尔中缀 + 函数式/比较操作数（tag/stat/age/attack_type）；求值=对英雄 → 与 tags 同域
    - requirements（|×111，如 Campaign3FreePlayHighestArea>=175|Champion14...）：语法=布尔中缀 + 属性比较（同构）；求值=对用户存档/战役进度（异域）
    - condition（^×25，如 (not incoming_desc)^(upgrade_purchased 4912)）：语法=前缀 not + ^（与中缀 ! 不同构）；求值=对渲染上下文标志（异域）
    - effect_string args（内 |×17）：语法=位置参数串（非布尔表达式，不同构）
    - 合一判断（纯技术）：① tags + per_hero_expr 完全合一——语法同构（布尔中缀+比较）+ 求值同域（英雄谓词），统一到布尔 AST（or/and/not/leaf + tag/stat/age/attack_type 叶），parseTagsExpression（signalSemantics.js）是雏形，消除 parseTagDisjunction/parseTagsExpression/parsePerHeroExpr 三解析器重复；② requirements 只合 parser——语法同构可复用布尔 parser，但求值异域（用户存档）须分立 evaluator；③ condition 不合——语法异构（前缀 not）+ 求值异域；④ effect_string args 不合——语法异构（位置参数串），但其中 tag 列表 arg 的 | split 可复用 parseTagsExpression 的 tag 叶解析
    - 项目 4 解析器现状：① normalizeTargetQualifier（signalSemantics.js:278）targets/filter_targets.tags，已支持 | OR + ^ AND + ! NOT + 复合保守（本轮修）；② parseTagQualifierFromArg（effect-helpers.mjs:61）effect_string args tag，只 | split；③ parseTagDisjunction（qualifierParsing.js:83）HasTag||HasTag 函数式 OR；④ parsePerHeroExpr（signalSemantics.js:345）per_hero_expr 最全（HasTag/GetStat/age/&&/||/!/as_int/is_undead）但不含 ^ AND
    - 架构限制：HeroQualifier 扁平（abilityModel.ts:63 的 requiredTags+matchMode+excludedTags），mergeTagRequirements（qualifierParsing.js:104）遇 (a|b)^c 复合返回 null；matchesHeroQualifier（signalSemantics.js:495）扁平求值，无布尔树
    - 方案（针对 tags+per_hero_expr 完全合一）：① Expr AST 节点 {op:'or'/'and'/'not'/'tag'/'stat'/'age'/'attack_type', ...}；② 统一 parser 把 tags 简写 + per_hero_expr 函数式都解析到 AST（复用 splitTopLevel/stripOuterParentheses，parseTagsExpression 扩展括号递归）；③ matchesHeroQualifier 改 AST 递归求值；④ HeroQualifier 新增 targetExpr?:Expr 或整体替换；⑤ 迁移 4 解析器；⑥ 复合表达式从「保守永真假」升级精确求值（恢复 20 条 effect_keys 复合）
    - 已做过渡修复（本轮 commit 4266a4c6）：normalizeTargetQualifier 补 ^ AND + ! NOT（parseTagsExpression），覆盖 10 条纯 ^ AND（8 排除 + 2 AND）；复合表达式降级 UNSUPPORTED_TARGET_QUALIFIER（__ic_unsupported_target_expr__ 永真假）保守不评分。实测恢复：排除目标 6 条；复合标记覆盖 effect_keys.filter_targets 4 条（其余 16 条在 rules/game_changes，求值域属 stage 12 restrictions，不合入）
    - 探索入口：raw 快照 tmp/idle-champions-api/definitions-*.json；关键文件 src/domain/abilities/{signalSemantics.js,qualifierParsing.js,abilityModel.ts} + scripts/data/effect-helpers.mjs；AGENTS.md 1.3 记 IC 布尔语法约定

<!-- auto-todo:end -->
