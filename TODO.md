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

- IC 英雄谓词布尔表达式建统一解析器（tags/per_hero_expr 合一；复合表达式精确求值） <!-- auto-todo:id=atd_5ec6e216f0 -->
  - 记录时间: `2026-07-20T15:46:32+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/signalSemantics.js:278`
  - 备注: IC 数据有一个统一的「英雄谓词布尔表达式」语言，当前 4 个分散解析器各处理一部分，且 HeroQualifier 扁平结构表达不了布尔树（复合表达式 mergeTagRequirements 返回 null）。建议建统一布尔 AST 解析器，但只合语义同源字段，不强制全合一。
    - 语法 spec：操作符 |（OR）、^（AND，IC 用 ^ 非 &&）、!（NOT）、() 分组；操作数两种 surface——简写裸 tag（tags 字段：cleric|wizard、lawful^good、!evil^!blackdicesociety）和函数式（per_hero_expr：HasTag(\`x\`)、GetStat(\`CHA\`)>=11、age<=20、is_undead、HasAttackDamageType、!HasTag）
    - 字段×surface 实测（raw upgrade_defines/effect_defines）：tags 字段 |×112 ^×30（含复合 20）；per_hero_expr |×53 &×23（||/&&）；requirements |×111（属性比较 OR，如 Campaign3FreePlayHighestArea>=175|Champion14HighestAdventureArea>=250）；condition ^×25（UI 前缀式 not x^y，不影响评分）；effect_string args 内 |×17（多 tag 目标）
    - 项目 4 解析器现状：① normalizeTargetQualifier（signalSemantics.js:278）处理 targets/filter_targets.tags，已支持 | OR + ^ AND + ! NOT + 复合保守（本轮修）；② parseTagQualifierFromArg（effect-helpers.mjs:61）处理 effect_string args tag，只 | split；③ parseTagDisjunction（qualifierParsing.js:83）处理 HasTag||HasTag 函数式 OR；④ parsePerHeroExpr（signalSemantics.js:345）处理 per_hero_expr 最全（HasTag/GetStat/age/&&/||/!/as_int/is_undead）但不含 ^ AND
    - 架构限制：HeroQualifier 扁平（abilityModel.ts:63 的 requiredTags+matchMode+excludedTags），mergeTagRequirements（qualifierParsing.js:104）遇 (a|b)^c 复合返回 null；matchesHeroQualifier（signalSemantics.js:495）扁平求值，无布尔树
    - 合一建议（合理才合）：合理合一——tags 字段简写（|/^/!）与 per_hero_expr 函数式同属英雄谓词，统一到布尔 AST（or/and/not/leaf），parseTagsExpression（signalSemantics.js）是雏形；不合适强合——requirements（战役进度属性比较，语义独立，归 stage 12 restrictions）、condition（UI 描述显示条件，不参与 effect 评分）、effect_string args（格式化串，parseTagQualifierFromArg 已独立处理，可后续并入但非必须）
    - 方案：① Expr AST 节点 {op:'or'/'and'/'not'/'tag'/'stat'/'age'/'attack_type'}；② 统一 parser 把 tags 简写 + per_hero_expr 函数式都解析到 AST（复用 splitTopLevel/stripOuterParentheses，parseTagsExpression 扩展支持括号递归）；③ matchesHeroQualifier 改 AST 递归求值；④ HeroQualifier 新增 targetExpr?:Expr 字段或整体替换；⑤ 迁移 4 解析器到统一入口；⑥ 复合表达式从「保守永真假」升级精确求值（恢复 20 条 effect_keys 复合 + rules/game_changes 16 条归 stage 12）
    - 已做过渡修复（本轮 commit）：normalizeTargetQualifier 补 ^ AND + ! NOT（parseTagsExpression），覆盖 10 条纯 ^ AND（8 排除型如 !evil^!blackdicesociety + 2 AND 型如 lawful^good）；复合表达式降级 UNSUPPORTED_TARGET_QUALIFIER（__ic_unsupported_target_expr__ 永真假）保守不评分。实测恢复：排除目标 6 条；复合标记覆盖 effect_keys.filter_targets 4 条
    - 探索入口：raw 快照 tmp/idle-champions-api/definitions-*.json；关键文件 src/domain/abilities/{signalSemantics.js,qualifierParsing.js,abilityModel.ts} + scripts/data/effect-helpers.mjs；AGENTS.md 1.3 记 IC 布尔语法约定

<!-- auto-todo:end -->
