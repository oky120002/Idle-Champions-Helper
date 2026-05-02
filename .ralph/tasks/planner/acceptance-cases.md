# Planner 验收用例

下面每个 story 都刻意拆得很小，方便较弱的无人值守模型执行。Ralph 必须先编写列出的测试，只实现限定范围内的行为，运行验证命令，并为该 story 单独提交。

## 全局拒收条件

- story 没有专用 commit 却被标记为通过。
- 跳过、削弱或重写测试来隐藏错误行为。
- 真实凭证、私人快照、`.env*.local`、`tmp/private-user-data/**`、`dist/` 或生成的依赖目录被暂存。
- story 修改了允许范围外的文件，且没有记录决策。

## 阶段 0 - 文档和 Ralph 结构

`US-001` 和 `US-002` 是规划分支交付项，已经由 Codex 完成；Ralph 后续开发不应重做这两个 story。它们的验收用例保留为审计依据。

### US-001: 落库 planner 文档

范围：
- 允许文件： `docs/modules/planner/**`, `docs/modules/README.md`, `docs/README.md`.
- 禁止文件： `src/**`, `public/**`, 凭证或私人快照文件.

先写测试：
- 使用 `rg`/shell 验证，而不是 app 测试。

验收用例：
1. 给定一个干净 checkout，当运行 `rg -n "auto-formation-planner-plan|development-design|acceptance-cases|final-todo" docs/modules/planner docs/modules/README.md docs/README.md` 时，planner 文档和导航必须可发现。
2. 给定这些文档，当扫描类似真实凭证的值时，不应出现真实 user id/hash。

验证：
- `test -f docs/modules/planner/auto-formation-planner-plan.md`
- `test -f docs/modules/planner/prd.md`
- `test -f docs/modules/planner/development-design.md`
- `test -f docs/modules/planner/final-todo.md`

提交：
- `planner: US-001 persist planner docs`

### US-002: Ralph planner 任务包可运行

范围：
- 允许文件： `.ralph/**`.
- 禁止文件： `src/**`, `public/**`.

先写测试：
- 结构性 shell 检查。

验收用例：
1. 给定 `.ralph/tasks/planner`，当运行 `.ralph/scripts/validate-task.sh planner` 时，必需文件和 JSON 结构必须通过。
2. 给定 `ralph-tui` 缺失，当 `.ralph/scripts/run-task.sh planner --help` 运行时，脚本应 fallback 到旧版 Ralph，而不是静默失败。

验证：
- `bash -n .ralph/scripts/run-task.sh`
- `bash -n .ralph/tasks/planner/run.sh`
- `./.ralph/scripts/validate-task.sh planner`

提交：
- `planner: US-002 add ralph planner package`

## 阶段 1 - 隐私和私人开发数据

### US-003: 敏感输出扫描器

范围：
- 允许文件： `scripts/private-user-data/**`, `tests/unit/scripts/**`, `package.json`.
- 禁止文件： `src/**`.

先写测试：
- `tests/unit/scripts/privateUserDataScanner.test.ts`.

验收用例：
1. 给定包含假数字 user id 和假 32 位 hash 的 fixture，当 scanner 扫描它时，必须报告发现项。
2. 给定只提到 `user_id` 和 `hash` 占位符的普通文档，当 scanner 运行时，不应仅因占位符失败。
3. 给定 `tmp/private-user-data` 下的路径，当 scanner 在已提交源码引用中看到该路径时，必须报告发现项。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-003 add sensitive output scanner`

### US-004: 私人环境变量加载器

范围：
- 允许文件： `scripts/private-user-data/**`, `tests/unit/scripts/**`.
- 禁止文件： `src/**`, `.env*.local`.

先写测试：
- `tests/unit/scripts/privateEnvLoader.test.ts`.

验收用例：
1. 给定 process env 包含 `IC_PRIVATE_USER_ID` 和 `IC_PRIVATE_HASH`，loader 返回这两个值。
2. 给定显式 `.local` env fixture，loader 能读取值，且不要求 `VITE_` 变量。
3. 给定凭证缺失，loader 返回安全错误，且不打印 secret 值。
4. 给定 key 以 `VITE_` 开头，loader 拒绝把它作为私人凭证。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-004 add private env loader`

### US-005: 私人快照 manifest

范围：
- 允许文件： `scripts/private-user-data/**`, `tests/unit/scripts/**`.
- 禁止文件： `src/**`, `public/**`.

先写测试：
- `tests/unit/scripts/privateSnapshotManifest.test.ts`.

验收用例：
1. 给定 mock payload 名称，当写入 manifest 时，输出路径必须位于 `tmp/private-user-data/<timestamp>/`。
2. 给定使用了凭证，当 manifest 序列化时，user id/hash 必须被遮蔽。
3. 给定 `tmp/private-user-data` 外的目标路径，writer 必须拒绝。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-005 add private snapshot manifest`

## 阶段 2 - 用户档案基础

### US-006: 用户档案领域类型

范围：
- 允许文件： `src/domain/user-profile/**`, `src/domain/types.ts`, `tests/unit/domain/user-profile/**`.

先写测试：
- `tests/unit/domain/user-profile/userProfileFixtures.test.ts`.

验收用例：
1. 给定最小已拥有英雄 fixture，TypeScript 接受 `UserProfileSnapshot`。
2. 给定导入阵型保存 fixture，TypeScript 接受 specialization、feat、familiar 和 scenario 引用。
3. 给定可选区块缺失，builder helper 仍能创建带 warning 的 snapshot。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-006 add user profile domain types`

### US-007: 用户档案 IndexedDB 存储

范围：
- 允许文件： `src/data/user-profile-store/**`, `src/data/localDatabase.ts`, `tests/unit/data/**`.

先写测试：
- `tests/unit/data/userProfileStore.test.ts`.

验收用例：
1. 给定 profile snapshot，保存/读取返回相同 id 和 updatedAt。
2. 给定 credential opt-in 为 false，credential vault 保持为空。
3. 给定调用 delete，snapshot 和 credential records 被删除。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-007 add user profile store`

### US-008: 官方只读客户端 allowlist

范围：
- 允许文件： `src/data/user-sync/**`, `tests/unit/data/user-sync/**`.

先写测试：
- `tests/unit/data/user-sync/officialClient.test.ts`.

验收用例：
1. 给定 `getuserdetails`、`getcampaigndetails` 或 `getallformationsaves`，URL builder 允许调用。
2. 给定 claim、purchase、save、redeem 等写入式调用，URL builder 必须拒绝。
3. 给定创建 fetch options，必须包含 `credentials: "omit"`、`cache: "no-store"` 和 `referrerPolicy: "no-referrer"`。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-008 add official read-only client`

### US-009: 用户 payload 归一化器

范围：
- 允许文件： `src/data/user-sync/**`, `src/domain/user-profile/**`, `tests/unit/data/user-sync/**`.

先写测试：
- `tests/unit/data/user-sync/userProfileNormalizer.test.ts`.

验收用例：
1. 给定 mock `getuserdetails`，normalizer 提取已拥有英雄、装备、feats、传奇信息和 warnings。
2. 给定 mock `getcampaigndetails`，normalizer 在存在时提取 favor/blessing/campaign progress。
3. 给定 mock `getallformationsaves`，normalizer 提取导入阵型保存。
4. 给定未知字段缺失，normalizer 记录 warning，且不抛错。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-009 add user payload normalizer`

### US-010: 用户数据页手动同步模型

范围：
- 允许文件： `src/pages/user-data/**`, `tests/component/userDataPage.*.test.tsx`.

先写测试：
- `tests/component/userDataPage.syncFlow.test.tsx`.

验收用例：
1. 给定没有 snapshot，页面提供凭证解析和手动同步流程。
2. 给定一个 3 天前更新的已存 snapshot，页面显示私人数据年龄。
3. 给定同步失败，页面显示不含凭证的安全错误。
4. 给定点击删除，snapshot 和可选 credential vault 被清除。

验证：
- 定向组件测试。
- `npm run typecheck`

提交：
- `planner: US-010 add user data manual sync model`

## 阶段 3 - 数字层和基线

### US-011A: GameNumber 解析和格式化

范围：
- 允许文件： `src/domain/simulator/**`, `tests/unit/domain/simulator/**`, `package.json`, lockfile.

先写测试：
- `tests/unit/domain/simulator/gameNumber.parseFormat.test.ts`.

验收用例：
1. 给定 `0`、`1.50e92`、`4.08e167` 和 `1e1000`，parser 返回有效值。
2. 给定非法输入，parser 返回错误或抛出有文档说明的错误。
3. 给定超过 JavaScript `Number.MAX_VALUE` 的值，formatter 仍返回游戏风格记数法。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-011A add game number parse format`

### US-011B: GameNumber 运算和比较

范围：
- 允许文件： `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

先写测试：
- `tests/unit/domain/simulator/gameNumber.arithmetic.test.ts`.

验收用例：
1. `1.5e92 * 2.72e75` 在数量级比较上接近 `4.08e167`。
2. 除法和幂运算保持预期排序。
3. 超大值列表排序稳定且确定。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-011B add game number arithmetic`

### US-011C: GameNumber 加法阈值

范围：
- 允许文件： `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

先写测试：
- `tests/unit/domain/simulator/gameNumber.addition.test.ts`.

验收用例：
1. `1e100 + 1e99` 会改变显示尾数。
2. `1e100 + 1e80` 在显示和排序上返回较大项。
3. 阈值有文档说明，并集中定义。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-011C add game number addition threshold`

### US-012: 最后专精基线提取

范围：
- 允许文件： `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

先写测试：
- `tests/unit/domain/simulator/specializationBaseline.test.ts`.

验收用例：
1. 给定包含三个专精等级的 upgrades，extractor 返回最高所需等级。
2. 给定没有 specialization upgrades，extractor 返回有文档说明的 fallback unlock level。
3. 给定异常 levels，extractor 忽略非法项并记录 warnings。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-012 add specialization baseline`

### US-013: 金币预算基线接口

范围：
- 允许文件： `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

先写测试：
- `tests/unit/domain/simulator/goldBudgetBaseline.test.ts`.

验收用例：
1. 给定 cost curve 和 gold budget，baseline 返回可负担等级。
2. 给定最后专精等级高于可负担等级，结果标记为 below-baseline，不能静默接受。
3. UI 默认值不暴露 100 级模式。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-013 add gold budget baseline`

## 阶段 4 - 模拟数据

### US-014: 模拟器数据覆盖报告

范围：
- 允许文件： `docs/research/data/**`, `scripts/data/**`, `tests/unit/scripts/**`.

先写测试：
- `tests/unit/scripts/simulatorDataCoverage.test.ts`.

验收用例：
1. 给定 mock definition keys，report 把已知有用 key 标记为 covered/uncovered。
2. 给定未知 keys，report 保留它们以供复查。
3. 报告包含 usefulness、current output 和 next action 列。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-014 add simulator data coverage report`

### US-015: 英雄模拟 profile 投影

范围：
- 允许文件： `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

先写测试：
- `tests/unit/domain/simulator/championSimulationProfile.test.ts`.

验收用例：
1. 给定 champion detail fixture，projection 提取 upgrades、feats、loot、legendary effects 和 raw effect strings。
2. 给定未知 effect strings，projection 将它们保存在 `unsupportedEffects`。
3. projection 包含本地化名称用于解释。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-015 add champion simulation profile`

### US-016: Effect parser 核心 DPS 组

范围：
- 允许文件： `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

先写测试：
- `tests/unit/domain/simulator/effectParser.coreDps.test.ts`.

验收用例：
1. 解析 `global_dps_multiplier_mult`。
2. 解析 `hero_dps_multiplier_mult`。
3. 把未知 prefix 解析为 unsupported result，且不抛错。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-016 add core dps effect parser`

### US-017: Effect parser 位置和标签组

范围：
- 允许文件： `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

先写测试：
- `tests/unit/domain/simulator/effectParser.positionTags.test.ts`.

验收用例：
1. 解析 adjacent target hints。
2. 解析 tagged champion multiplier hints。
3. 保留不支持的 positional formats，并带解释。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-017 add positional tag effect parser`

### US-018: 变体规则投影

范围：
- 允许文件： `src/domain/planner/**`, `tests/unit/domain/planner/**`.

先写测试：
- `tests/unit/domain/planner/variantRuleProjection.test.ts`.

验收用例：
1. 投影 `only_allow_crusaders`。
2. 投影 `disallow_crusaders`。
3. 投影 `force_use_heroes`。
4. 把未知 mechanics 保留为 warnings。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-018 add variant rule projection`

## 阶段 5 - 候选池

### US-019: 候选池模式

范围：
- 允许文件： `src/domain/planner/**`, `tests/unit/domain/planner/**`.

先写测试：
- `tests/unit/domain/planner/candidatePool.test.ts`.

验收用例：
1. owned-only 模式只返回已拥有 champions。
2. all-hypothetical 模式包含带 assumptions 的未拥有 champions。
3. manual override 模式应用显式 champion assumptions，但不改变 profile data。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-019 add candidate pool modes`

### US-020: 假设英雄公平基线

范围：
- 允许文件： `src/domain/planner/**`, `tests/unit/domain/planner/**`.

先写测试：
- `tests/unit/domain/planner/hypotheticalBaseline.test.ts`.

验收用例：
1. 同 seat median equipment 可用时使用它。
2. 同 seat 数据不可用时使用 account-wide median。
3. 空账号 fallback 明确标记为 no-equipment/no-feat。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-020 add hypothetical fairness baseline`

## 阶段 6 - 阵型评分

### US-021: 导入阵型保存归一化器

范围：
- 允许文件： `src/data/user-sync/**`, `src/domain/user-profile/**`, `tests/unit/data/user-sync/**`.

先写测试：
- `tests/unit/data/user-sync/formationSaveNormalizer.test.ts`.

验收用例：
1. 将 mock `getallformationsaves` payload 转换为 `ImportedFormationSave`。
2. 保留 specializations、feats、familiars、favorite flag 和 scenario relation。
3. 未知 formation layout id 产生 warning，而不是静默丢弃。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-021 add imported formation save normalizer`

### US-022: Planner 阵型合法性

范围：
- 允许文件： `src/domain/planner/**`, `tests/unit/domain/planner/**`.

先写测试：
- `tests/unit/domain/planner/formationLegality.test.ts`.

验收用例：
1. 检测 seat conflicts。
2. 检测 banned champions。
3. 检测缺失的 forced champions。
4. 检测 locked 或 occupied slots。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-022 add formation legality checks`

### US-023: 稳态评分 fixture

范围：
- 允许文件： `src/domain/planner/**`, `src/domain/simulator/**`, `tests/unit/domain/planner/**`.

先写测试：
- `tests/unit/domain/planner/steadyStateScoring.test.ts`.

验收用例：
1. 类似 Bruenor 的 adjacent support 放在相邻位置时提高 score。
2. Global DPS support 不受 adjacency 影响。
3. Unsupported effects 出现在 result warnings 中。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-023 add steady state scoring`

### US-024: Beam search 候选排序

范围：
- 允许文件： `src/domain/planner/**`, `tests/unit/domain/planner/**`.

先写测试：
- `tests/unit/domain/planner/beamSearchRanking.test.ts`.

验收用例：
1. 4-slot 确定性 fixture 返回预期 top result。
2. beam width 限制 candidate expansion。
3. top results 包含 score、placements、explanations 和 warnings。

验证：
- 定向单元测试。
- `npm run typecheck`

提交：
- `planner: US-024 add beam search ranking`

## 阶段 7 - Planner UI

### US-025: Planner 路由和导航

范围：
- 允许文件： `src/app/**`, `src/pages/PlannerPage.tsx`, `src/pages/planner/**`, `tests/component/app.test.tsx`, `tests/component/primaryNavigation.test.tsx`.

先写测试：
- 路由和导航标签组件测试。

验收用例：
1. `/planner` 渲染 planner 页面。
2. 导航包含 Automatic Planner。
3. 保持 HashRouter 兼容性。

验证：
- 定向组件测试。
- `npm run typecheck`

提交：
- `planner: US-025 add planner route`

### US-026: Planner profile 状态面板

范围：
- 允许文件： `src/pages/planner/**`, `tests/component/plannerPage.profileState.test.tsx`.

先写测试：
- Profile state 组件测试。

验收用例：
1. 无 profile 状态显示到用户数据页的 link/action。
2. 已有 profile 显示存在天数。
3. Sync warning 可见，但不会 auto-refresh。

验证：
- 定向组件测试。
- `npm run typecheck`

提交：
- `planner: US-026 add planner profile state`

### US-027: Planner 场景选择

范围：
- 允许文件： `src/pages/planner/**`, `tests/component/plannerPage.scenarioSelection.test.tsx`.

先写测试：
- Scenario selection 组件测试。

验收用例：
1. variant 列表可按文本筛选。
2. 选择 variant 后显示 formation 和 restriction summary。
3. 长 restriction text 仍以文本形式可访问，不隐藏在纯图片 UI 中。

验证：
- 定向组件测试。
- `npm run typecheck`

提交：
- `planner: US-027 add planner scenario selection`

### US-028: Planner 结果卡片

范围：
- 允许文件： `src/pages/planner/**`, `tests/component/plannerPage.resultCard.test.tsx`.

先写测试：
- Result card 组件测试。

验收用例：
1. result card 以游戏记数法显示 score。
2. result card 以文本显示 slot assignments。
3. result card 显示 explanation 和 unsupported warning 区块。

验证：
- 定向组件测试。
- `npm run typecheck`

提交：
- `planner: US-028 add planner result card`

### US-029: 将 planner 结果保存为 preset

范围：
- 允许文件： `src/pages/planner/**`, `src/data/formationPresetStore.ts`, `tests/component/plannerPage.savePreset.test.tsx`.

先写测试：
- 保存 preset 组件/集成测试。

验收用例：
1. 点击 save 会写入 formation preset。
2. 保存的 preset 保留 `layoutId`、`placements` 和 `scenarioRef`。
3. 结果无效时保存禁用状态可见。

验证：
- 定向组件测试。
- `npm run typecheck`

提交：
- `planner: US-029 save planner result as preset`

## 阶段 8 - 最终关卡

### US-030: Privacy scan npm 脚本

范围：
- 允许文件： `package.json`, `scripts/private-user-data/**`, `tests/unit/scripts/**`.

先写测试：
- Scanner 脚本测试。

验收用例：
1. `npm run privacy:scan` 存在。
2. scanner 检查 `src`、`public`、`docs`、`tests`，以及存在时的 `dist`。
3. scanner 对 fixture secrets 失败，对普通 placeholders 通过。

验证：
- 定向单元测试。
- `npm run privacy:scan`

提交：
- `planner: US-030 add privacy scan script`

### US-031: Planner 文档同步

范围：
- 允许文件： `README.md`, `docs/**`, `.ralph/tasks/planner/**`.

先写测试：
- Shell/rg 检查。

验收用例：
1. route 存在后，根 README 提到 automatic planner。
2. docs 索引指向 planner 模块文档。
3. final-todo 列出 speed/gem、survival、balanced scoring、step simulation 和 manual parameter panel。

验证：
- `rg -n "自动计划|planner|final-todo" README.md docs .ralph/tasks/planner`

提交：
- `planner: US-031 sync planner docs`

### US-032: 最终回归

范围：
- 允许文件： 只允许修改修复回归所需的文件。

先写测试：
- 使用失败命令输出作为测试信号。

验收用例：
1. `npm run lint` 通过。
2. `npm run typecheck` 通过。
3. `npm run test:run` 通过。
4. `npm run build` 通过。
5. `npm run privacy:scan` 通过。

验证：
- `npm run lint && npm run typecheck && npm run test:run && npm run build && npm run privacy:scan`

提交：
- `planner: US-032 final regression`
