# Lint 违规渐进式修复

**Status**: Accepted
**Type**: milestone
**Scope**: system
**Created**: 2026-08-04

## 目标

修复接入代码质量 lint 套件（typescript-eslint `strictTypeChecked` + sonarjs/jsx-a11y/import-x/@vitest/eslint-plugin）后暴露的 3088 违规。严格按 lint message 对症修复（禁自由发挥/禁统一模板），恢复 lint 全绿。配置基于行业共识（详见 memory `lint-rule-industry-consensus`）。

## 范围

- 3088 违规，62 规则，494 文件（src/ + scripts/ + tests/）。
- 配置就绪（eslint.config.js strictTypeChecked + 共识选项，committed `eb18bdb8`）。
- import 格式已修（`56279af1`，纯格式零语义风险）。
- typecheck 0（健康基线）。
- **修法依据**：`2026-08-system-lint-fix-rules.md`（配套修法表，同目录）。
- **配置共识**：memory `lint-rule-industry-consensus`。

## 核心原则（新 session 必读，违反会重蹈覆辙）

**三条铁律（违反任一 = 整批回退）：**

1. **语义不变**：每处修复必须保持修复前后运行时语义完全一致（相同输入 → 相同行为）。lint 修复只改写法、不改逻辑。典型陷阱：把 `string | null` 的 `if (x)` 改成 `if (x !== '')` 会让 null 漏过——必须按真实类型补全判空（`if (x != null && x !== '')`）；`obj!` 改 `obj` 时要确认运行期确实非空。eslint/tsc 都查不出这类行为漂移，只能靠人脑核对。**例外**：若某处改动确实改变了局部真值/行为，必须在邻近代码指认出补偿逻辑证明整体行为仍等价（说清哪行补偿了什么）；指认不出补偿代码的视为 bug，不得提交。拿不准语义时宁可 `eslint-disable` 带理由，不赌。每阶段主智能体跑相关单测做语义回归闸。
2. **按 message 对症，禁统一模板**：每条违规先读 message（类型词/场景），查 `2026-08-system-lint-fix-rules.md` 选修法。strict-boolean 看 message 类型词：`string`→带 `!== ''`、`number`→带 `!== 0`、`object`→`!= null`、`any`→先缩类型。**禁止**机械套 `!== null && !== undefined`（对 string 漏 `''`、对纯 string 用错——上次回退的根因，commit `2e338c21`）。
3. **禁 sd/sed/perl 批量替换**（`\1` 反向引用出错破坏代码）：所有修改用 **Edit 工具逐处精确**。

**支撑规则：**

4. **helper**：`tests/utils/dom-assertions.ts` 提供 `unwrap<T>(value, msg): T`（替代 `!`）、`queryOrFail(container, selector): Element`。
5. **每文件双重验证**：`npx eslint <file>`（该文件 0 违规）+ `npx tsc -b --pretty false 2>&1 | grep <file>`（无新 typecheck 错）。
6. **每阶段 commit + 勾选**：阶段完成后 `git commit`（中文 Conventional Commits），勾选本 checklist。

## 边界

- **只修 lint 违规**，不顺手重构无关代码。
- **不改 eslint.config.js / package.json / tsconfig**（配置已基于共识定稿）。
- **strict-boolean 配置**：`allowString: false`、`allowNumber: false`（''/0 会误会要明确）+ 默认（nullable+any 报，nullable object 不报，纯 boolean 固有允许）。
- **语义存疑不硬改**：表未覆盖或判断不准的，用行内 `// eslint-disable-next-line <rule>` **带理由注释**，或本文件记 TODO，不机械改。
- **不创建新文件**（除非自然重构提取，且完整通过 typecheck）。
- 配置文件（vite/vitest/playwright.config.ts）注意 globals（node vs browser）。

## 阶段 Checklist（17 批，每批独立 commit）

每阶段派 Agent（general-purpose）修该批文件，prompt 嵌入下方"Agent 通用指南"。Agent 完成后主智能体体检（typecheck + `\1` 残留 + 破坏）+ 修复破坏 + commit + 勾选。

**并行**：不同批次目录不重叠，可派多 Agent 并行（建议一次 2-3 个，避免 API 速率限制）。**每批独立 commit**。

- [x] 阶段 1: scripts/data 产品源码（340 违规，27 个非 test 文件；首批 7 大头 `0000d860` + 本批其余 20 个）—— 验证：`npx eslint scripts/data/*.ts`（非 test）0 + tsc 0 + scripts/data 227 单测全过 + diff 复核关键改动语义等价（unknown 判空 / feat-catalog 死守卫清理靠完备 Record+result.ok / io-utils 有界 throw 死代码 / Zod4 .loose() 等价）
- [x] 阶段 2: scripts/data 测试 + effect-resolvers（151 违规，23 文件：3 大 test + effect-resolvers 11 + 9 小 test）—— 验证：`npx eslint scripts/data/**/*.ts` 全清（scripts/data 至此 0 违规）+ tsc 0 + 227 单测全过 + diff 复核 build-models.test signalPreset 类型修正与生产 effect-helpers.ts:44 一致
- [x] 阶段 3: scripts/sync-pets/portraits + check-color-contrast/colors + normalize-definitions（180 违规，6 文件）—— 验证：6 文件 eslint 0 + tsc 0 + 相关单测 27 全过（check-color-contrast 18/normalize-definitions 4/check-colors 5）+ diff 复核 PetImage.format 字面量使删比较安全、像素循环 `?? 0` 与原 `!` 在 OOB 均强转 0 等价
- [x] 阶段 4: scripts/ 其余全部（333 违规，分 4a/4b：4a 顶层 sync/audit 产品+test 163 `78eb0f43`；4b private-user-data 53 + simulator 37 + 杂项顶层 56 + 漏网 test 24 = 170）—— 验证：`npx eslint scripts/**/*.ts` 全清（scripts/ 至此 0 违规）+ tsc 0 + scripts/ 48 文件 358 单测全过；顺带修 rules 表 docs-governance 合规（`2493d556`，207→92 行+Status，原 3 失败转绿）
- [x] 阶段 5: src/domain/abilities（92 违规，9 文件）—— 验证：abilities eslint 0 errors/0 warnings + tsc 0 + 111 单测全过。**no-cycle**：abilityModel.ts/signalSemantics.ts 两处 abilities↔planner 值环 disable 带理由（**临时**），破环重构记为阶段 18（用户裁定立项）
- [x] 阶段 6: src/domain/planner 产品（92 违规 + goldObjective 1 警告，16 文件）—— 验证：planner 产品 eslint 0/0 + tsc 0 + **全 planner 测试套 27 文件 214 全过**（核心评分引擎重构语义闸）+ 无 sed 残留。复杂度类驱动多处 helper 提取（scoreFormation 223→~30 行提 7 helper、buildPlannerRecommendation 提 6 helper、placementFit 5、signalMultiplier 3 等，均纯提取不改控制流）；3 处 file-level max-lines disable（核心引擎子函数已 ≤50 行、拆文件损一跳命中率）；stackCountResolver no-cycle 临时 disable 归阶段 18。（references tests 归阶段 7；PlannerScenarioSelection 若属 pages 归后续阶段）
- [x] 阶段 7: planner 测试 + domain 其他（259 违规，分 2 批：7a domain 其他 types/buffs/effects/simulator 66 `e85a3e13`；7b planner 测试 23 文件 193）—— 验证：planner 全目录 eslint 0/0 + tsc 0 + 全 planner 测试套 214 全过 + domain 其他 204 单测 + 无 sed 残留。Y1 报告的 effect-string.ts tsc 错系误报（全量 tsc exit 0）
- [x] 阶段 8: src/pages/champion-detail（157 违规，21 文件）—— 验证：champion-detail eslint 0/0 + tsc 0 + 25 单测全过 + 无 sed 残留。多处复杂度重构（effect-payload resolveCompoundToken 拆 4 helper、effect-targets 6 重||→Set、useChampionDetailSectionState 8 处提取、exhaustive-deps 改签名修依赖非 disable）；9 处复杂度 disable（effect-kind 分派器等天然复杂）；effect-targets 一处预存 dead code（_mult 不可达）保持不变。**注（2026-08-05 复核）**：仅该批 19 文件清零，champion-detail 目录共 47 文件，其余 28 文件（DetailUpgradeSection/SkinArtworkDialog/detail-cards 等）当时未在范围，归阶段 12 补清
- [x] 阶段 9: src/pages/animation-audit + variants（97 违规，10 文件）—— 验证：两目录 eslint 0/0 + tsc 0 + 53 单测全过 + 无 sed 残留。多处重构（useVariantsPageModel 257 行 hook 拆 6 子函数保 hook 调用顺序、variant-grouping cognitive 29→4、variant-model ||/&& 链→早返回、clipboard 守卫移除靠 try/catch 等价、NaN 排序保留）；零 disable。**注（2026-08-05 复核）**：仅该批 14 文件清零，animation-audit+variants 目录共 34 文件，其余 20 文件当时未在范围，归阶段 12 补清
- [x] 阶段 10: src/pages/planner + 根（实测 ~172，手册 ~100 低估；批1 21 产品 `acced618` + 批2 15 hooks/store+测试 `bee2aa5a`）—— 验证：阶段10 全范围 eslint 0 + tsc 0 + planner 19 文件 91 测试全过 + 无 sed 残留。主智能体修复组 A 重构引入的 2 处破坏：toolbarConfig 提取丢类型标注致 tsc TS2322（补 WorkbenchToolbarConfig 标注）；blockerCopy/slots 被提为早返回破坏"场景选择面板始终渲染"（恢复为 EvaluateReadyContent 内 blockerNotice 预计算 + 单个 ?? 三元，修 plannerEvaluate.route 7 测试失败）。4 处 disable 带理由（PlannerEvaluatePage/PlannerScenarioSelection max-lines 内聚组件、PlannerEvaluatePage max-lines-per-function hooks 组件、usePlannerPageModel max-lines-per-function 页面状态聚合 hook）。另：前置 `90f9633d` 修复 src/data 4 处 parseStoredRecord 调用点恢复 HEAD tsc 基线
- [x] 阶段 11: src/pages/formation + champions/illustrations/pets 根页（实测 ~125，手册 ~200 高估；`ba39e773`）—— 验证：阶段11 全范围 eslint 0 + tsc 0 + formation 6 文件 41 测试 + src/data formation 9 测试全过 + 无 sed 残留。主智能体修复组 A 2 处：FormationBoardCanvas 提取 FormationBoardSlot 时透传属性用 ?: 致 exactOptionalPropertyTypes TS2375（改 T | undefined 显式允许）；分组遗漏的 HeroPicker.test.tsx（! → unwrap）。4 处 disable（useFormationPageModel/useFormationBootstrap/useFormationPageState/useFormationPageDerived max-lines-per-function React hook 纯编排）带中文理由。**注（2026-08-05 复核）**：仅 formation 子目录 + 4 根页；champions/illustrations/pets **子目录**漏（主智能体 fd 误判"无子目录"，实际各有 14-22 文件 ~198 违规），归阶段 12 补清
- [x] 阶段 12: src/pages 剩余全部（3 轮 `e216104` + `9d1300b` + `1c6ad1c`）—— 验证：全 `npx eslint src/pages` 0 违规 + 全量 tsc 0 + vitest 1418 全过 + 无 sed 残留。3 轮 15 Agent 并行（轮1 champions/champion-detail/variants 6 Agent 252→0、轮2 pets/animation-audit/illustrations 5 Agent ~160→0、轮3 user-data/user-heroes+home/presets/根页面 4 Agent 112→0）。主智能体修复 anim-A 两个文件未落盘（useAnimationAuditPageModel.test.tsx 33 violations + AnimationAuditRowFeedback.tsx 5 violations，31×void block body + no-conditional-expect const 收窄 + restrict-template-expressions）。教训遵守：嵌套三元→if/else if 预计算 ReactNode（ChampionRosterFlyout/PresetCard/UserImportFields/DossierSection 全安全）、排序比较器 NaN 保 falsy（championRoster/VariantsFilterBar/illustration-model/pet-results-order）、strict-boolean 按 message 类型词对症（string→!== ''、object→!= null、字面量联合+null→!= null）。a11y 重构：SkinArtworkDialog backdrop div→button + DOM 同级化、SearchPage 删 autoFocus。~20 处 disable 带中文理由（max-lines 内聚组件/max-lines-per-function hook 编排/no-unnecessary-condition 类型声明必填但运行时可缺）
- [x] 阶段 13: src/components（`0c4e403`）—— 验证：eslint src/components 0 + tsc 0 + vitest 61/61。5 Agent 并行修 ~55 文件 191→0。**配置精简**：同 commit 删除 sonarjsOn 30 条手动增量（max-lines-per-function/expression-complexity/max-union-size/shorthand-property-grouping/void-use/function-return-type 等）+ 关闭 no-confusing-void-expression + 删 prefer-readonly。效果：全局违规 525→207（砍 61%）。清 45 条死 disable，4 处多规则 disable 保留 complexity/cognitive-complexity 仅去 max-lines-per-function
- [x] 阶段 14: src/features（`4fc4ab3`）—— 验证：eslint 0 + tsc 0 + vitest 33/33。3 Agent 并行修 18 文件 90→0（skelanim tests 33×no-non-null-assertion→unwrap、SkelAnimCanvas strict-boolean number、walk-selection 提取 summarizePieceMotion、search strict-boolean + unwrap）
- [x] 阶段 15: src/data + src/app + src/rules + src/domain（`db9c98f`）—— 验证：全局 eslint 0 + tsc 0 + vitest 1418。4 Agent 修 28 文件 101→0（formationLayout 提取 4 helper 解 cognitive-complexity、championPlacement/排序 NaN 保 falsy、app theme matchMedia typeof 守卫、rules complexity 降级）
- [x] 阶段 16: tests/ + 配置文件（`db9c98f`）—— 验证：同阶段15 commit。5 文件 16→0（e2e unwrap、playwright port string、vitest.setup localStorage 守卫、main.tsx 本地 throw）
- [x] 阶段 17: 收尾验证（`d528508`）—— 验证：**`npx eslint .` = 0 违规** + `npx tsc -b` = 0 错误 + `npx vitest run` = 1418/1418 全绿。修复 useWorkbenchResultsMotion scrollTo jsdom 兼容（no-unnecessary-condition 误报：TS 标注必有但 jsdom 未实现，恢复 ?. + disable 带理由）
- [x] 阶段 18: no-cycle 破环重构 —— abilities↔planner 三方值环（signalSemantics→abilityModel→stackCountResolver→signalSemantics）打断。环有三条值边，**破 Edge B**（最省）：`POOL_SCOPE_BY_KIND`+`HeroAbilityPoolScope` 下沉新叶子 `src/domain/abilities/poolScope.ts`，signalSemantics 不再值导入 abilityModel，三方环全断。`REGISTERED_STACK_FUNCS`（gain 镜像评分必要依赖，见 modeling-pitfalls）与 `matchesHeroQualifier`（3 planner 调用者）两值边保留——断 B 后 signalSemantics→abilityModel 仅余 `import type`（不计值环），两值边均不再成环。移除 3 处 `import-x/no-cycle` disable（abilityModel/signalSemantics/stackCountResolver）。导入方同步更新：placementFit/placementFitTypes/resolverShared/abilityModel.test。验证：全局 `npx eslint .` = 0 + `npx tsc -b` = 0 + `npx vitest run` = 1418/1418 全绿

## Agent 通用指南（每阶段派 Agent 时嵌入 prompt）

```
修复 <文件列表或目录> 的所有 ESLint 违规。工作目录是仓库根。

铁律（违反任一 = 整批回退）：
1. **语义不变**：每处修复保持修复前后运行时语义完全一致，只改写法不改逻辑。典型陷阱：`string | null` 的 `if (x)` 改成 `if (x !== '')` 会让 null 漏过，必须 `if (x != null && x !== '')`；`x!` 去感叹号要确认运行期非空。eslint/tsc 查不出行为漂移，靠人脑核对。若局部改动改变局部真值/行为，必须指认邻近补偿代码证明整体等价（哪行补什么），指认不出即 bug。拿不准就 eslint-disable 带理由，不赌。
2. 绝对禁止 sd/sed/perl 批量替换（\1 出错）。所有修改用 Edit 工具。
3. 每条违规先读 message，按 docs/changes/2026-08-system-lint-fix-rules.md 对症。
   - strict-boolean 看 message 类型词：string→!== ''，number→!== 0，object→!= null，any→缩类型。
   - 禁止统一 !== null && !== undefined（对 string 漏 ''）。
4. 不创建新文件。每改一文件跑 npx eslint <file>（0 违规）+ npx tsc -b（无新错误）。
5. 不改 eslint.config.js/package.json/tsconfig。
6. helper：tests/utils/dom-assertions.ts（unwrap/queryOrFail 替代 !）。
7. 语义存疑不硬改：行内 // eslint-disable-next-line <rule> 带理由。

背景：配置 strictTypeChecked + 行业共识选项。typecheck 当前 0。
报告：修了哪些文件、每文件主要规则、残留什么（标注原因）。
```

## 验收（DoD）

- `npx eslint .` 0 违规（或仅剩带理由的行内豁免）
- `npm run typecheck` 0 错误
- `npm run test:regression`（lint + typecheck + vitest + data + e2e）全绿
- 本 milestone 17 阶段全勾选

## 落地后

- specs/ 更新点：
  - `docs/specs/guidelines/ai-first-ts-tsx.md`：§3 补"函数复杂度门禁"（complexity/cognitive/max-lines-per-function 阈值 + 分层），§5 a11y 要求标注"由 jsx-a11y 静态强制"
  - `docs/specs/guidelines/testing.md`：§4 补完整 lint 策略（strictTypeChecked + sonarjs recommended + jsx-a11y + import-x + @vitest/eslint-plugin + tseslint 选项共识）
  - `docs/specs/guidelines/ai-first-ts-tsx.md`：补"历史 lint 债务"段落——以下写法因前配置（已关闭的形式主义规则）遗留，碰到时顺手简化：
    - **高优先**（高频，明显降低可读性）：
      - `() => { fn() }`（void block body）→ `() => fn()`（箭头简写；no-confusing-void-expression 遗留）
      - 私有字段 `readonly` → 删除（prefer-readonly 遗留，非必要标注）
      - `[...].some(Boolean)` 替代 `||` 链 → 回 `a || b || c`（expression-complexity 遗留，`||` 更直观）
    - **中优先**（适度改善）：
      - 对象属性顺序被 shorthand-property-grouping 重排 → 回自然顺序
      - 参数类型 `unknown` → 恢复原联合类型（max-union-size 遗留，丢了类型信息）
      - 失效的 `eslint-disable` 注释 → 删除（max-lines-per-function 等已关闭规则的残留）
    - **低优先**（少数实例，可选）：
      - `return undefined` → bare `return`（no-inconsistent-returns 遗留）
      - 显式返回类型标注 → 删（function-return-type 遗留，TS 可推断）
    - **保留**（改动本身是良好实践）：`import { Buffer } from 'node:buffer'`（Node.js 正确写法）、`??` 替代 `||`（prefer-nullish-coalescing 仍启用）
- 本 change Status → Landed → 移 `archive/changes/`
- **specs/ 永不引用本 milestone**

## 失败恢复（新 session 接手）

1. 读本 milestone（目标 + 原则 + 边界 + 进度）。
2. 读 `2026-08-system-lint-fix-rules.md`（修法）。
3. 读 memory `lint-rule-industry-consensus`（配置共识，MEMORY.md 索引自动加载）。
4. 看"阶段 Checklist"哪些勾选，从第一个未勾选阶段继续。
5. 跑 `npx eslint . --format json | jq '[.[].messages[]]|length'` 确认当前违规数（对照进度）。
6. 派 Agent 修下一阶段（嵌入"Agent 通用指南"）+ 体检 + commit + 勾选。
