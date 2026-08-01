# 运行时边界与错误恢复审计（轮 7）

度量基准日：2026-08-01（分支 `opencode/dev1`，commit `5dceaf4`）。
透镜：失败路径的**实际运行时行为**——构造损坏/缺失/不一致数据喂入看真实降级，区别于轮 5 的「测试覆盖深度」（有测 ≠ 降级逻辑对）。每条结论均有实测证据（单测喂坏数据 / 真实数据直测），非纯读码推测。

## 1. 现状度量

| 维度 | 数值 |
|---|---|
| planner 加载数据源 | 10（`loadVersion` + `Promise.all` 9 源：variants/plannerModel/profile/champions/loot/patron-perks/effect-defs/feat-catalog/spec-catalog） |
| 任一 reject → error 态的源 | **8/9**（profile 快照内部 catch 降级，不 reject；余 8 源 + version 全 all-or-nothing） |
| IndexedDB store | 5（formationDrafts/Presets/userProfileSnapshots/credentialVault/heroAbilityOverrides），DB version=5 |
| 静默吞错（`.catch(()=>...)` 无 error 参数） | **13** 站点（src 侧，详见 §3） |
| effect_def 引用悬空 | **0**（patron-perks 70 引用全命中 effect-definitions 的 545 定义，§4） |
| bannedHeroes 非空场景 | **0/1413**（§5 死代码；字段已全链路删除） |
| 跨 collection updatedAt | 全一致（2026-07-28，§4） |

实测复现测试：`src/domain/planner/recommendationEngine.runtimeEdge.test.ts`（6 用例，全绿）。

## 2. 失败路径矩阵

| # | 场景 | 实际行为（实测） | 有测 | 用户影响 | 处置 |
|---|---|---|---|---|---|
| 1 | 某 collection 404/网络中断 | `Promise.all` reject → `loadState='error'` → `role="alert"` 可见文案（`PlannerEvaluatePage.tsx:239`） | route 测间接 | 可见报错，无重试按钮（需手动刷新） | 健康（P2：可加重试） |
| 2 | version.json 加载失败 | `loadVersion` reject（在 Promise.all 前）→ error 态同上 | 同上 | 同上 | 健康 |
| 3 | profile 快照 IndexedDB 读失败 | `resolveUserProfileSnapshot` 内部 catch → `snapshot:null`+`errorMessage`；`errorMessage` 被 `usePlannerCollections:89` 丢弃 | ✗ | planner 继续运行（owned-only→missing-profile blocker；all-hypothetical→正常） | **P2：错误信息静默丢弃** |
| 4 | profile 快照腐蚀（NaN level / wrong shape） | IndexedDB 裸 cast 无校验；scoreFormation 不崩溃，NaN dps 与 ZERO 比较恒 false→`bestCarryHeroId=null`、`objectiveValue='0'`（静默零分） | ✗（本轮补测） | DPS 显示 0 无诊断 | **P1：IndexedDB 读出无 schema 校验** |
| 5 | semantic-overrides fetch reject | `.catch(()=>EMPTY_OVERRIDE_COLLECTION)`（`plannerModel.ts:23`）静默降级 | ✗ | 无 repo override，评分照常 | 健康（静默但安全） |
| 6 | semantic-overrides valid-JSON-wrong-shape | `.catch` 不触发（非 reject）；`resolveHeroAbilityProfiles` 消费——缺 heroId 条目在 map 建键时不匹配任何英雄，静默忽略 | ✗（本轮补测） | 无影响 | 健康 |
| 7 | effect_def 引用缺失 template | `resolveEffectDefinitionKeys` 返回 null；globalBuff 路径因 `parseEffectKind('effect_def,X')≠global_dps` 跳过，externalHeroDps 路径 `if(!keys) continue` 丢弃——均低估不误用 | ✗ | 当前数据 0 悬空，不可触发 | 健康 |
| 8 | forced∩banned 同英雄冲突 | forced 让英雄进候选，`checkFormationLegality` 判 `bannedChampion`→全部 beam 结果非法→`no-legal-recommendation`（banned 胜出，不放非法阵型） | ✗（本轮补测） | 当前 bannedHeroes 恒空→不可达（§5） | 健康；防御测试随死代码删除（§5 已收口） |
| 9 | 空 placements | scoreFormation 早返回 `objectiveValue='0'`、`breakdown=null` | ✗（本轮补测） | DPS 显示 0 | 健康 |
| 10 | 候选不足填满槽位 | `insufficient-owned-heroes` blocker；`PlannerPage` `getPlannerBlockerCopy` switch 覆盖全 4 blocker 文案 | route 测 | 可见提示 | 健康 |
| 11 | 放置 plannerHeroes 外的 heroId | evaluateFormation 不崩溃，附 restriction warning「不在账号快照中，按 level 1 估算」 | ✗（本轮补测） | 可见 warning | 健康 |
| 12 | IndexedDB quota / 打开失败 | `openAppDatabase` reject；profile 路径有 catch 降级（#3）；formation/preset 路径消费方各自 catch | 部分 | profile 降级；preset 读写失败见消费方 | 部分（P2 observability） |

**总判**：无 P0。所有失败路径均有降级或可见错误态；错误推荐/数据损坏/崩溃均未发生。最接近缺口的是 #4（腐蚀 IndexedDB→静默零分），但其触发条件（normalizer 已防 NaN，仅 stale 跨版本快照可致腐）概率低。

## 3. 静默吞错清单（13 站点）

`.catch(() => <default>)` 无 error 参数，错误信息完全丢失：

| 站点 | 降级为 | 判定 |
|---|---|---|
| `plannerModel.ts:23` semantic-overrides | EMPTY_OVERRIDE_COLLECTION | 安全（override 可选） |
| `useChampionCollectionState.ts:17,21` champion-visuals/illustrations | 空 collection | 安全（可选增强数据） |
| `useAnimationAuditPageModel.ts:79` champion-illustrations | 空 | 安全 |
| `useIllustrationCollectionState.ts:26,27,86` champions/enums | 空 collection | 安全（illustrations 页降级） |
| `useDataVersionState.ts:33` loadVersion | status='error'（消息丢） | P2（版本检查 hook，非关键路径） |
| `useScenarioLabelLookup.ts:28` | 空 lookup | 安全 |
| `useUserHeroesPageModel.ts:31` / `ChampionRosterFlyout.tsx:87,111` / `useChampionDetailResources.ts:76,113,138` / `usePetsCollectionState.ts:62` | 各自空/默认 | 安全（可选数据） |

**关键观察**：`usePlannerCollections` 的 8 数据源 **all-or-nothing**（无逐源降级），与 champions/pets/illustrations 页的逐源 `.catch(()=>empty)` 不对称。这是 planner 的**合理设计**——缺任一核心源（heroes/scenarios/feats/...）评分失真，不如整体报错让用户感知。非缺陷。

## 4. 版本一致性

- **跨 collection updatedAt**：实测 6 个核心 collection 全 `2026-07-28`，一致。`loadVersion` 首次 fetch 后缓存进 memoryCache，会话内所有 `loadCollection` 复用同一 `version.current` 目录 → **会话内跨 collection skew 不可能**。
- **`cache:'no-store'` 被 memoryCache 架空**：`loadVersion` 先查 memoryCache（`client.ts:36`），命中即返回，`no-store` RequestInit 仅在首次 fetch 生效。会话内版本不刷新（站点更新需手动刷新）。P2（会话短，低 ROI；但 `no-store` 注释易误导，可注明 memoryCache 行为）。
- **build 时非原子写**：collection 写入由 build 管线顺序产出（轮 4 已审），但部署走 GitHub Pages 原子切换，运行时不受影响。

## 5. 死代码 / 不可达

> ✅ **已收口**（2026-08-01）：`bannedHeroes` 全链路删除——场景类型字段（`OfficialPlannerScenarioModel`）、`bannedChampion` 合法性分支、`banList` 约束类型、`formatLegalityViolation` 的 `case`、build 投影（`buildScenarioModels`）、`scenarios.json` 1413 项数据及 forced∩banned 防御测试。直证：原始 variant 对象仅有 `allowedHeroIds`/`allowedTags`/`forcedHeroIds`/`restrictions`，无英雄黑名单字段；restrictions 文本内的条件性限制（tag/seat/class）由 restrictions-parser 作 warning 处理，与固定英雄黑名单语义无关。下为轮 7 原始发现，保留作删除依据（行号已失效）。

**`bannedHeroes` 全链路不可达**：`buildScenarioModels.ts:150` 硬编码 `bannedHeroes: []`，全部 1413 场景 bannedHeroes 恒空。Variant 类型（`formation.ts:54-86`）只有 `forcedHeroIds`/`allowedHeroIds`/`allowedTags`（whitelist 语义），无 blacklist 字段——游戏用白名单（only_allow_crusaders）限制英雄，无场景级黑名单机制。后果：

- `checkFormationLegality` 的 `bannedChampion` 违规分支（`formationLegality.ts:42-50`）永不触发；
- `banList` 约束（`recommendationEngine.ts:465` `scenario.bannedHeroes.length > 0` 恒 false）永不构建；
- 本轮 #8 forced∩banned 测试覆盖的是当前数据不可达的防御路径。

## 6. 处置

### P1（登记，不当轮动手——跨模块/需决策）

> ✅ `bannedHeroes` 死代码已收口（2026-08-01，详见 §5）——全链路删除后原行移出本表。

| 项 | 动作 | ROI | 影响面 | 决策点 |
|---|---|---|---|---|
| IndexedDB 读出无 schema 校验 | 仿 `collection-schemas` 给 4 store 读出（profileSnapshot/formationPreset/formationDraft/heroAbilityOverride）加 zod 校验，腐蚀时 reject 或 coerce | 中（防御性；跨版本 shape 升级时受益；当前 normalizer 防 NaN，仅 stale 快照可致腐） | 4 store + 消费方 | 校验层级（store 读出 vs 消费方）+ 失败策略（reject 报错 vs coerce 兜底） |

### P2（顺手，低 ROI）

- `usePlannerCollections:89` 丢弃 profile `errorMessage` → 可在 error 态或 banner 提示「读取个人数据失败，已按无存档处理」。
- `loadState='error'` 无重试按钮 → 瞬态网络失败需手动刷新；可加 retry 触发 `loadPlannerCollections` 重跑。
- `handleFillRemaining`（`PlannerEvaluatePage.tsx:176`）`if(recommendation.result)` 静默跳过 insufficient/no-legal blocker → 可 toast 提示。
- `useDataVersionState:33` 丢版本检查错误消息（非关键路径）。
- 13 处静默 `.catch` 可选加 `console.warn` 提升 observability（边际收益）。

### 无需处置（健康）

- effect_def 缺失 template 降级安全（kind 守卫防 id 被当字面值；70 引用 0 悬空）。
- profile/semantic-overrides 腐蚀降级安全（不崩溃，静默忽略/零分）。
- 跨 collection 会话内无 skew 可能（version 内存 pin）。
- 空 placements / 候选不足 / 未知 heroId 均有可见 blocker 或 warning，无错误推荐。

## 7. 度量复现

- effect_def 悬空：`v=$(jq -r '.current' public/data/version.json); refs=$(jq -r '[.perks[].effects[].effectString|select(test("^effect_def,"))]|unique|.[]' public/data/$v/patron-perks.json); ids=$(jq -r '.items[].id' public/data/$v/effect-definitions.json); for r in $refs; do grep -qx "${r#effect_def,}" <<<$ids || echo "DANGLING $r"; done`
- bannedHeroes：字段已全链路删除（轮 7 原测 1413 场景恒为 `[]`）。
- 跨 collection updatedAt：`for f in champions hero-abilities scenarios loot-catalog effect-definitions variants; do jq -r '.updatedAt' public/data/$v/$f.json; done`
- 静默吞错：`rg -n '\.catch\(\(\)' src/ -g '*.ts' -g '*.tsx'`
- 失败路径行为：`npx vitest run src/domain/planner/recommendationEngine.runtimeEdge.test.ts`
