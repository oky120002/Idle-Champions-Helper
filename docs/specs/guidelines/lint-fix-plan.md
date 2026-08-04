# Lint 违规渐进式修复计划

本计划是 3088 个 lint 违规修复的执行手册。**自包含**——新 session 读此文件 + `lint-fix-table.md` + memory `lint-rule-industry-consensus` 即可执行，无需其他上下文。

## 前因后果

项目接入代码质量 lint 套件（eslint-plugin-sonarjs/jsx-a11y/import-x/@vitest/eslint-plugin + typescript-eslint `strictTypeChecked`），基于**行业共识**配置（详见 memory `lint-rule-industry-consensus`：配置层级、strict-boolean 默认选项、prefer-nullish-coalescing ignorePrimitives、sonarjs 测试规则对 vitest 关闭等）。

接入后暴露 3088 违规（62 规则，494 文件）。此前曾让子智能体批量修复，但它们**没按 lint message 对症**（统一套 `!== null && !== undefined` 模板），导致 string 类型丢失 empty 检查等**语义偏差**——已全部回退（commit 2e338c21）。本计划是严格重做。

**为什么渐进 + 每步 commit**：5 小时 API 额度限制下无法一次修完。每步独立 commit + checked 标识，中途超额中断后，新 session 读本计划即知进度，接着未完成的步骤修。

## 当前状态（2026-08-04）

- **配置就绪**：eslint.config.js（strictTypeChecked + 手动加回 strict-boolean/prefer-optional-chain/prefer-readonly + 选项共识 + sonarjs 测试规则关闭 + import-x/first 关闭）。**勿改**。
- **import 格式已修**：commit 56279af1（纯格式，零语义风险，已提交）。
- **typecheck 0**（健康基线）。
- **3088 违规待修**，62 规则，494 文件。
- **修法依据**：`docs/specs/guidelines/lint-fix-table.md`（每条规则的 message → 修法）。

## 核心原则（新 session 必读，违反会重蹈覆辙）

1. **按 message 对症**：每条违规先读它的 message（类型词/场景），查 `lint-fix-table.md` 选修法。strict-boolean 看 message 类型词：`string`→带 `!== ''`、`number`→带 `!== 0`、`object`→`!= null`、`any`→先缩类型。
2. **禁统一模板**：**禁止**机械套 `!== null && !== undefined`（对 string 漏 `''`、对纯 string 用错——这是上次回退的根因）。
3. **禁 sd/sed/perl 批量替换**（`\1` 反向引用会出错破坏代码）：所有修改用 **Edit 工具逐处精确**。
4. **helper**：`tests/utils/dom-assertions.ts` 提供 `unwrap<T>(value, msg): T`（替代 `!`）、`queryOrFail(container, selector): Element`。
5. **每文件双重验证**：`npx eslint <file>`（该文件 0 违规）+ `npx tsc -b --pretty false 2>&1 | grep <file>`（无新 typecheck 错）。
6. **每步 commit + checked**：步骤完成后 `git commit`（中文 Conventional Commits），把本计划该步 `checked: false` 改 `true`。

## 边界

- **只修 lint 违规**，不顺手重构无关代码。
- **不改 eslint.config.js / package.json / tsconfig**（配置已基于共识定稿）。
- **strict-boolean 配置**：`allowString: false`、`allowNumber: false`（''/0 会误会要明确）+ 默认（nullable+any 报，nullable object 不报，纯 boolean 固有允许）。
- **语义存疑不硬改**：遇到表未覆盖或语义判断不准的，用行内 `// eslint-disable-next-line <rule>` **带理由注释**，或在本计划该步记 TODO，不机械改。
- **不创建新文件**（除非自然重构提取，且完整通过 typecheck）。
- **配置文件 vite/vitest/playwright.config.ts**：注意它们的 globals（node vs browser）。

## 通用 Agent 指南（每步派 Agent 时嵌入 prompt）

```
修复 <文件列表> 的所有 ESLint 违规。

铁律：
1. 绝对禁止 sd/sed/perl 批量替换（\1 出错）。所有修改用 Edit 工具。
2. 每条违规先读 message，按 docs/specs/guidelines/lint-fix-table.md 对症。
   - strict-boolean 看 message 类型词：string→!== ''，number→!== 0，object→!= null，any→缩类型。
   - 禁止统一 !== null && !== undefined。
3. 不创建新文件。每改一文件跑 npx eslint <file>（0 违规）+ npx tsc -b（无新错误）。
4. 不改 eslint.config.js/package.json/tsconfig。
5. helper：tests/utils/dom-assertions.ts（unwrap/queryOrFail 替代 !）。

背景：配置 strictTypeChecked + 行业共识选项。typecheck 当前 0。
报告：修了哪些文件、每文件主要规则、残留什么（标注原因）。
```

## 步骤（17 批，每批独立 commit）

**并行策略**：不同批次目录不重叠，可派多 Agent 并行（建议一次 2-3 个，避免 API 速率限制）。但**每批独立 commit**（Agent 完成后主智能体验证+提交，再派下一批）。优先级：从上到下，但可乱序并行。

每步派 Agent 前先生成该步文件列表：`npx eslint <目录> --format json | jq -r '[.[]|select(.messages|length>0)|.filePath]|sort|uniq'`。

---

### 步骤 1: scripts/data 产品源码 — checked: false
**范围**：`scripts/data/` 下非测试的 `.ts`（official-rule-helpers 56、normalize-adventures 37、formation-layout-helpers 35、effect-helpers 29、normalize-champions 26、signal-coverage 21、build-search-index 17 等）。
**违规数**：~220。
**生成文件列表**：`npx eslint 'scripts/data/*.ts' --ignore-pattern 'scripts/data/**/*.test.ts' --format json | jq ...`

### 步骤 2: scripts/data 测试 + effect-resolvers — checked: false
**范围**：`scripts/data/**/*.test.ts`（build-models.test 28、skelanim.test 20、dpsResolver.test 19、normalize-champions.test 18、goldResolver/speedResolver/vulnerabilityResolver test、mobile-asset-codec、restrictions-parser、io-utils、resource-sync-policy 等）。
**违规数**：~200。

### 步骤 3: scripts/sync + check-color-contrast — checked: false
**范围**：sync-idle-champions-pets(59)、sync-idle-champions-portraits(43)、check-color-contrast(38)、normalize-idle-champions-definitions(34)。
**违规数**：~174。

### 步骤 4: scripts/ 其他 — checked: false
**范围**：sync-animations(27)、sync-illustrations(25)、sync-console-portraits(24)、audit-animations(20)、build-idle-champions-data(19)、sync-equipment-icons(19)、sync-specialization-graphics(19)、private-user-data/*(53)、simulator/*(37)。
**违规数**：~245。

### 步骤 5: src/domain/abilities — checked: false
**范围**：heroPredicate(44)、signalSemantics(23)、其他 abilities/。
**违规数**：~100。

### 步骤 6: src/domain/planner 产品 + references — checked: false
**范围**：recommendationEngine(35)、references/championReferenceVerification.test(17)、references/damageReferenceVerification.test(21)、PlannerScenarioSelection(18)、compute/、其他 planner 非测试。
**违规数**：~120。

### 步骤 7: src/domain/planner 测试 + domain 其他 — checked: false
**范围**：steadyStateScoring.test(43)、其他 planner tests、buffs/、effects/、types/、simulator/、variant-model(21)、localizedText、championPlacement。
**违规数**：~200。

### 步骤 8: src/pages/champion-detail — checked: false
**范围**：effect-payload(28)、effect-targets(20)、upgrade-presentation-model(20)、DetailUpgradeSection(17)、detail-cards、effect-descriptor、其他。
**违规数**：~150。

### 步骤 9: src/pages/animation-audit + variants — checked: false
**范围**：animation-audit/useAnimationAuditPageModel.test(33)、variants/variant-model(21)、variants/VariantAdventureSection(20)、variants/useVariantsPageModel(26)、其他。
**违规数**：~120。

### 步骤 10: src/pages/planner + 根文件 — checked: false
**范围**：PlannerEvaluatePage(26)、usePlannerPageModel、plannerEvaluate.route.test、plannerPage.route.test、PlannerEvaluatePage、其他 planner page。
**违规数**：~100。

### 步骤 11: src/pages/formation + champions + illustrations + pets — checked: false
**范围**：FormationBoardCanvas + formation tests、champions/*tests、illustrations/*tests、pets/petsPage.state.test(17)。
**违规数**：~200。

### 步骤 12: src/pages/user-data + user-heroes + presets + 其他 pages — checked: false
**范围**：user-data/*tests、user-heroes/*tests、presets/*tests、其他 pages 剩余。
**违规数**：~120。

### 步骤 13: src/components — checked: false
**范围**：components/ 全部（workbench/、ChampionAvatar、filter-sidebar/、其他 55 文件）。
**违规数**：~191。

### 步骤 14: src/features — checked: false
**范围**：champion-filters/filter-action-builder(38)、skelanim-player/browser-codec.test(20)、其他 features/。
**违规数**：~162。

### 步骤 15: src/data + src/app + src/rules — checked: false
**范围**：data/（user-sync、client 等 95）、app/（30）、rules/（少量）。
**违规数**：~125。

### 步骤 16: tests/ + 配置文件 — checked: false
**范围**：tests/e2e/、tests/setup/、vite.config.ts、vitest.config.ts、playwright.config.ts、src/main.tsx。
**违规数**：~30。注意配置文件 globals（node）。

### 步骤 17: 收尾验证 + 文档同步 — checked: false
**范围**：全量验证 + 残留清理 + 文档。
**操作**：
1. `npx eslint .`（应 0 违规，若残留逐一修）。
2. `npm run typecheck`（0 错误）。
3. `npm run test:regression`（lint + typecheck + vitest + data + e2e 全绿）。
4. 文档同步：`docs/specs/guidelines/ai-first-ts-tsx.md`（§3 补复杂度门禁 + §5 a11y 标注 jsx-a11y 强制）、`docs/specs/guidelines/testing.md`（§4 补 lint 策略 + 分层）。
5. commit。

---

## 进度追踪

每完成一步，把该步 `checked: false` 改 `true`，并 commit 本计划文件。

- [ ] 步骤 1: scripts/data 产品源码
- [ ] 步骤 2: scripts/data 测试
- [ ] 步骤 3: scripts/sync + check-color-contrast
- [ ] 步骤 4: scripts/ 其他
- [ ] 步骤 5: src/domain/abilities
- [ ] 步骤 6: src/domain/planner 产品
- [ ] 步骤 7: src/domain/planner 测试 + 其他
- [ ] 步骤 8: src/pages/champion-detail
- [ ] 步骤 9: src/pages/animation-audit + variants
- [ ] 步骤 10: src/pages/planner + 根
- [ ] 步骤 11: src/pages/formation + champions + illustrations + pets
- [ ] 步骤 12: src/pages/user-data + user-heroes + presets
- [ ] 步骤 13: src/components
- [ ] 步骤 14: src/features
- [ ] 步骤 15: src/data + src/app + src/rules
- [ ] 步骤 16: tests/ + 配置
- [ ] 步骤 17: 收尾验证 + 文档同步

## 失败恢复

新 session 接手时：
1. 读本文件（前因后果 + 原则 + 边界 + 进度）。
2. 读 `docs/specs/guidelines/lint-fix-table.md`（修法）。
3. 读 memory `lint-rule-industry-consensus`（配置共识）。
4. 看"进度追踪"哪些 checked，从第一个未 checked 步骤继续。
5. 跑 `npx eslint . --format json | jq '[.[].messages[]]|length'` 确认当前违规数（对照进度）。
6. 派 Agent 修下一步（嵌入通用指南）+ 验证 + commit + checked。
