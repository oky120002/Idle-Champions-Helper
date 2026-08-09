# 测试深度审计（行为覆盖 + 断言强度）

度量基准日：2026-08-01（分支 `opencode/dev1`，基线 `c377707d` 之后、本轮 commit 之前）。本文件是轮 5 测试深度审计的 canonical 来源；体例沿用 `test-suite-audit.md`。透镜：**行为覆盖与断言强度**——不重做 `test-suite-audit.md` 的组织整改（§3-§8）。判据对照 `testing.md` §6-§7「无测试覆盖的行为不视为已验收 / 断言可证伪」。方法：codegraph 查 handoff 点名的 4 个「无直接测试」线索 → 扫 planner/simulator/buffs 全部 `it` 块断言密度 → 核查 references 金标钉值强度 → 全仓弱断言模式（snapshot/toBeTruthy/not.toThrow）普查。

## 1. 收口结论

**P0 清零**：本轮无 P0。**P1 新增**：0 项（深度健康）。一项澄清 + 一项跨轮交叉引用 + 一项跟随 §2 修复的回归用例指引。

## 2. 验证安全（handoff 点名线索 + 断言强度）

| 区域 | 核查结论 |
|------|----------|
| `applyActiveFeats`/`applyActiveSpecializations`（recommendationEngine.ts:220/242） | 薄包装（catalog 缺省→跳过 + ownedById map → 委托 `applyFeatsToProfile`/`applySpecializationsToProfile`）。真实注入语义（append 非替换、不做 scoringMode 维度预过滤）在底层函数，已被 feat/专精注入 P0 修复 + 对应单测覆盖。包装经 `evaluateFormation`/`buildPlannerRecommendation` route 测试间接覆盖。非缺口 |
| `scoreTeamGold`（steadyStateScoring.ts:151） | team-gold scoringMode 有 3 用例（:209 全队 gold 聚合 + damage 不泄漏 / :238 carry-dps vs team-gold 分支 / :263 gold pool=3→team_gold_find=3），经 scoreFormation 间接覆盖 scoreTeamGold 全路径。非缺口 |
| `findScenarioSlot`（placementSlotRelation.ts:5） | `test-suite-audit.md` §8.1 已确认间接覆盖（placementFit.relations + stackCountResolver）。codegraph「无直接测试」是符号级判定，函数级复核已收口 |
| 断言密度 | planner/simulator/buffs 全部 `it` 块均有 ≥1 `expect`，**0 个纯 smoke 块**（无「只调不断言」） |
| 金标钉值强度 | `championReferenceVerification` 钉死具体值：善良榜样 multFactor `toBeCloseTo(16384,0)`、出言不逊 `bonusScaleOfSignal` 依赖、`perStackPercent toBe(300)`、`amountFunc toBe('mult')`、未注册 mechanicId `toEqual([])`。**非 loose snapshot、非仅非空**——可证伪 |
| 弱断言模式 | 全仓 **0 个 snapshot 测试**（无 toMatchSnapshot/InlineSnapshot 脆性）；`not.toThrow` 仅 2 处；`toBeTruthy/toBeFalsy/toBeDefined` 61 处多为带 message 的前置条件守卫（如「善良榜样未 active——carry 须 geneutral」`.toBeDefined()` 后接 `toBeCloseTo` 深断言），非弱化 |

## 3. 澄清：steadyStateScoring.test.ts:495 不是「乘法模型编码」

`correctness-audit.md` §2 登记外部加成池分裂 P1（heroDpsPool 外部池与 ability 源 `damage:hero` 池相乘，IC 应合并同池加法）。交接提示词注「该 bug 被现有测试编码为乘法模型 `:495-566`，修 bug 须同步改测试」——**此描述不准确**，深度核查纠正：

`:495` 实际断言 `heroDpsPool = 3.5`（装备 +50%→1.5 **与**外部 hero_dps +200%→2.0 **同池加法** = 3.5，非独立乘 1.5×3=4.5）。它测的是 heroDpsPool **内部** equipment+external 加法（曾修过的旧 bug——equipment/external 分列独立 × 因子，见 `test-suite-audit.md` §5.3），**不编码** §2 的 ability 池 × 外部池相乘。`:516` 全因子组合守护验证 `baseDps × Πfactors = carryDps`（breakdown 与评估公式内部一致性），同样不编码 §2。

修 §2 时须改的是 **breakdown 契约**（heroDpsPool 合并进 damagePool、不再独立因子），:495/:516 随之更新——`correctness-audit.md` §2 修复方向 #3 已记。无测试「编码错误语义」，仅编码当前 breakdown 结构。

## 4. §2 回归用例指引（跟随 §2 修复，本轮不写）

§2 修复（合并外部加成进对应 ability 池 addPercent）当前**无对应的回归测试**——现有 :495 测 heroDpsPool 内部加法，无测试断言「ability 源 hero_dps + 外部 hero_dps 跨池加法」。因 §2 须与未建模源补全协同（不可单独修，correctness §2 关键约束），**本轮不预写 TDD-red 测试**（会编码未实现行为、与协同约束冲突）。§2 修复时同步补：ability hero_dps + external hero_dps 同时非默认 → 断言 `(1+(ability%+ext%)/100)` 而非 `(1+ability%)(1+ext%)`，并更新 :495/:516 的 breakdown 契约。

## 5. 跨轮交叉引用：signal-coverage 假门（轮 4 §2 #1）

`data:signal-coverage` 接 `test:simulator` 但纯打印 JSON 无断言恒 exit 0——既是管线问题也是**测试深度问题**（核心可验证性度量无真实数据覆盖率 gate）。详见 `scripts-audit.md` §2 #1，本轮不重复登记。
