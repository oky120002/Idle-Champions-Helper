# 阵型模拟器演进 goal 提示词（按里程碑）

按 `evolution-plan.md` 的 16 阶段拆成 4 个里程碑 goal。每个 goal 设置后 Claude 从该里程碑的第一个未完成阶段开始推进，40 turns 后未完成则 stop，用 `claude --resume <session>` 或 `--continue` 恢复继续（goal 会恢复，回合数重置）。`evolution-plan.md` 的 `[ ]`/`[x]` 进度追踪是跨 session 衔接的唯一事实源。

**执行顺序**：M2 → M3 → M4（M1 已完成；依赖链，不可跳）。每个 goal 复制对应代码块（含 `/goal`）粘贴到 Claude Code 即可。

**文档同步硬约束**：每个里程碑收口必须按 `evolution-plan.md` 的『文档同步硬约束』执行——改动全链路同步到所有引用受影响概念的架构文档与说明文档（步骤级 `[x]` 勾选 + 全文档 grep 修正陈旧引用 + 测试覆盖 + 收口验证），不只勾 evolution-plan 的 `[x]`。

---

## 里程碑 2·数据补全（阶段 3 金币 + 4 crit + 5 health + 6 vulnerability + 7 speed+BUD + 8 buff_upgrade + 9.2/9.3）

```
/goal 按 docs/modules/planner/evolution-plan.md 执行里程碑 2·数据补全（阶段 3 金币 + 4 crit + 5 health/survival + 6 vulnerability + 7 speed+BUD + 8 buff_upgrade + 9.2/9.3 scenario/schema）。先展示 evolution-plan.md 进度追踪（确认 M1 已 [x]）+ 第一个未完成阶段。
需要展示的证据：
- 每阶段完成：evolution-plan.md 勾选 [x] + npm run data:planner-coverage 显示该 effect 覆盖率提升 + test/typecheck/build 输出。
- 阶段 7 完成：src/domain/simulator/budCalculation.ts（BUD=max 单次伤害）+ docs/modules/planner/bud-verification.md 实测对照游戏。
- 最终：M2 阶段全 [x] + coverage 报告（gold/crit/health/vulnerability/speed 覆盖）+ npm run test:run && typecheck && build。
完成条件：
- 阶段 3.1-3.6 + 4.1-4.4 + 5.1-5.3 + 6.1-6.4 + 7.1-7.5 + 8.1-8.4 + 9.2/9.3 全完成（[x]）。
- effect 解析进 pool：gold（49 条）/crit（~200）/health+healing+damage_reduction（~620）/vulnerability（~150）/speed+cooldown（~2000）/buff_upgrade wrapper top N（解析率 60%→>80%）。
- pool 扩展：crit_factor 进 DPS（1+chance×(damage_mult−1)）/ vulnerability 进 DPS（条件性按怪物 tag）/ survival 约束（effectiveHealth+damage_reduction）/ speed（按 2.0 spike 结论决定范围）。
- BUD 计算（7.4）+ 实测验证（7.5，偏差 <30%）。
- 9.2 championEligibility→banned + 手工 override；9.3 champion-details zod schema + CI 校验。
- npm run test:run && typecheck && build 退出码 0。
约束：按 evolution-plan.md（A1 命名/TDD/不动量）；不跳过任何 effect 类型；crit 期望值近似标注 BUD 局限；vulnerability 按怪物 tag 条件匹配（非全局无条件，add 类同 pool 相加）；restrictions 留 M3；不削弱测试；每阶段 commit + [x]。
or stop after 40 turns
```

---

## 里程碑 3·补强（阶段 10 推图预估 + 11 全局加成 + 12 restrictions + 13 装备精细 + 14 click+modron）

```
/goal 按 docs/modules/planner/evolution-plan.md 执行里程碑 3·补强（阶段 10 推图预估 + 11 全局加成 + 12 restrictions + 13 装备精细 + 14 click+modron）。先展示 evolution-plan.md 进度追踪（确认 M1/M2 已 [x]）。
需要展示的证据：
- 阶段 10 完成：src/domain/planner/areaEstimation.ts（推图层数预估）+ 怪物 stats 数据源确认报告。
- 阶段 11 完成：全局加成 pool（patron-perks + blessings 若可行）+ blessings/patron effect 结构确认报告。
- 阶段 13 完成：装备精细 carryDps（baseDamage×levelCurve×equipment×feat×legendary×pool）+ 对照真实游戏。
- 最终：M3 阶段全 [x] + npm run test:run && typecheck && build。
完成条件：
- 阶段 10.1-10.3 + 11.1-11.4 + 12.1-12.3 + 13.1-13.4 + 14.1-14.3 全完成（[x]）。
- 推图层数预估（BUD/carryDps vs monster_base_stats.dps_growth_rate_curve by area，结合 survival 约束）。
- 全局加成 pool（patron-perks 解析 + blessings 若 11.1 确认可行；final_dps × global_buff_pool）。
- restrictions 模板匹配（高频关键词中英，不 NLP）+ 手工补 semantic-overrides.json。
- 装备/feat/传奇精细乘数接入 carryDps（替换 hypotheticalBaseline 近似）。
- click damage 计算（BUD×click_seconds，辅助展示不纳入模拟）+ modron 辅助信息。
- npm run test:run && typecheck && build 退出码 0。
约束：按 evolution-plan.md；数据源未确认的先确认（10.1 怪物 health / 11.1 blessings / 13.1 equipment 曲线）；restrictions 不用 NLP 用模板；click 不参与阵型评分/排序；不削弱测试；每阶段 commit + [x]。
or stop after 40 turns
```

---

## 里程碑 4·UI（阶段 15 接通 + 16 拖拽）

```
/goal 按 docs/modules/planner/evolution-plan.md 执行里程碑 4·UI（阶段 15.1-15.6 接通 + 16.1-16.5 拖拽）。先展示 evolution-plan.md 进度追踪（确认 M1/M2/M3 已 [x]）。
需要展示的证据：
- 阶段 15 完成：PlannerResultCard 复用 FormationBoardCanvas 棋盘 + carryDps/BUD + carry 标记 + Top K + carryRanking + 候选模式 + C 位/锁槽 + 推图预估展示 + 导入编辑器。
- 阶段 16 完成：HeroPicker（搜索/分组/头像）+ HTML5 DnD 拖拽 + 移动端 tap-target。
- 最终：/planner 全链路手验（选场景→Top K+棋盘+carryDps/BUD+carry 标记→候选模式/C 位指定/锁槽→推图预估→导入编辑器→存方案；桌面拖拽+移动端 tap）+ npm run test:regression（含 e2e）。
完成条件：
- 阶段 15.1-15.6 + 16.1-16.5 全完成（[x]）。
- UI 接通：抽 FormationBoardCanvas（纯渲染）+ FormationBoardGrid 改组装 + PlannerResultCard 复用棋盘 + carryDps/BUD/carry 标记 + Top K 切换 + carryRanking + 候选模式控件（owned-only/all-hypothetical/manual-override）+ C 位指定/锁槽（所有英雄候选不限 dps）+ 推图层数预估展示 + survival 约束展示 + 推荐结果导入阵型编辑器。
- 拖拽：HeroPicker + 拖拽 API（dragstart/drop 调 handleAssignChampion）+ 放入/替换/移除/槽位间（原子清原 slot）+ seat 冲突提示 + 移动端 tap-target+HeroPicker 弹层。
- npm run test:regression（lint+typecheck+test:run+build+privacy:scan+e2e）退出码 0。
约束：按 evolution-plan.md；复用 FormationBoardGrid 不破坏 formation 编辑器（formation 全量回归）；所有英雄候选（不限 dps 角色）；click damage 不影响推荐排序；移动端无原生 DnD 用 tap-target；不削弱测试；每阶段 commit + [x]。
or stop after 40 turns
```

---

## 使用

1. 新 session（工作目录 = 仓库根或对应工作树）。
2. 打开本文档，copy 当前里程碑的 goal 代码块（含 `/goal`）。
3. 粘贴到 Claude Code 作为下一条消息 → goal 设置并开始执行。
4. 40 turns 后若未完成，`claude --resume <session>` 或 `--continue` 恢复 goal 继续。
5. 每个阶段完成后 Claude 会勾选 `evolution-plan.md` 的 `[x]`；中断后续 session 从进度追踪定位第一个未完成阶段。
6. 里程碑完成后，换下一个里程碑的 goal。

**跨 session 衔接**：唯一事实源是 `evolution-plan.md` 的进度追踪 `[ ]`/`[x]`，不依赖 session 上下文。
