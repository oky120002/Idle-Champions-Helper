# gameplay 调研文档对账审计

**状态**: 已确认
**类型**: change
**范围**: system
**创建日期**: 2026-08-08
**目标**：逐篇把 `docs/research/gameplay/` 的社区调研结论与游戏数据（`public/data/v1/`）交叉核对；社区是辅助，游戏数据是权威。冲突以游戏数据覆盖；过时/失效/错误能修则修，不能修则删。

## 审计范围

23 篇主题文档 + 3 篇英雄机制文档 + README/_template（结构文件）。

## 审计标准

每篇文档检查：

1. **数据快照日期 + 英雄数** — 是否与当前数据（165 英雄, 2026-07-20）一致
2. **可信度标记** — ✅/⚠️ 的判据是否可被游戏数据升级或降级
3. **具体数值声明** — 公式、百分比、英雄名等是否与游戏数据一致
4. **数据源引用** — 文件路径和字段名是否仍然有效
5. **社区-only 声明** — 是否存在可被游戏数据验证/推翻但未验证的声明

## 分批并行

| 批次 | 文档 | 主要数据源 |
|---|---|---|
| A | bud, critical-hits, armored-enemies, attack-multi-hit, enemy-special-health, aoe-survival | game-rules, hero-abilities, effect-definitions, variants |
| B | speed-mechanics, modron-automation, progression-systems, pushing-and-wall, gold-and-favor | game-rules, champion-details, trials |
| C | potions, familiars, patrons-blessings, achievements-campaign-rewards, legendary-forge, feat-and-specialization, debuff-control-mechanics | pets, patrons, patron-perks, adventures, loot-catalog, feat-catalog, specialization-catalog |
| D | formation-strategy, variant-restriction-catalog, champion-mechanics/*, README | formations, variants, champion-details |

每批产出一个审计报告（发现列表 + 建议动作：修复/删除/保留）。汇总后批量执行。

## 审计结果

2026-08-08 完成，4 批并行审计覆盖全部 23 主题文档 + 3 英雄机制文档。

### 审计结论

**无文档被删除**——所有文档的核心结论与游戏数据一致，未发现根本性错误。修复内容分三类：

| 类别 | 数量 | 代表性修复 |
|---|---|---|
| ❌ 硬错误（与游戏数据矛盾） | 6 | Gazrick 护甲剥离参数(7%→15%)、明斯克传奇效果表(6/6槽全错)、控制英雄计数(14/28/13→11/22/11)、Modron serverOnly 描述、aoe-survival 标签错误 |
| ⚠️ 数据漂移（旧快照过时） | 10 | feat/spec 计数、变体赞助人数、位置关系统计、缩放系数范围 |
| ℹ️ 精度提升（补数据源/升级可信度） | 8 | BUD 衰减参数由 game-rules 直证(⚠️→✅)、社区 URL 去重与登记 |

### ✅ 无需修改的文档

attack-multi-hit、critical-hits、progression-systems、095-vi、champion-mechanics/README

### 未修改的已知缺口（社区来源，游戏数据无法验证）

- 成就伤害加成 1%/5%（服务端追踪，无成就定义表）
- 恩宠公式指数 0.304（社区逆向）
- Modron 管道加成具体数值（服务端/存档层）
- 祝福系统效果（无 blessings.json）
- 传奇药水「全药水+15%」乘法增益（无直接字段）
