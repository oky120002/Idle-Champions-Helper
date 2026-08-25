# 需求库可完成性审计

**审计日期**：2026-08-25  
**范围**：`docs/requirements/` 下 14 份活跃需求

## 结论

当前只有 `2026-08-visual-asset-full-audit.md` 能在现有代码、静态数据和验证工具条件下完整闭合，已完成并归档。其余 13 份需求均存在未完成子项或明确的外部数据、私有存档、运行时模型或产品决策依赖，继续留在需求库是正确的。

## 逐文件判定

| 需求文件 | 当前判定 | 不能整体完成的原因 |
| --- | --- | --- |
| `2026-08-champion-filter-extensions.md` | 暂不能 | 目标模式、规则集合、画像、细场景和解释模板仍未实现 |
| `2026-08-conditional-damage-bonus.md` | 暂不能 | 条件攻击加成需要完整过滤条件与效果作用图，不能安全当作无条件加成 |
| `2026-08-escort-slot-locking.md` | 暂不能 | 官方数据没有护送目标具体槽位，不能可靠推断 |
| `2026-08-formation-rule-expansion.md` | 暂不能 | 动态禁用槽位和护送具体槽位仍缺可靠数据 |
| `2026-08-language-id-7-secondary-fields.md` | 暂不能 | 次级字段页面价值和新变体人工覆盖尚未完成评估 |
| `2026-08-per-hero-stack-defaults.md` | 暂不能 | 缺少逐英雄逐机制的可靠默认数据，且不是正确性缺陷 |
| `2026-08-planner-area-dashboard.md` | 暂不能整体完成 | 仅层数面板可直接做；瓶颈分析和改进建议仍需生存模型接入与产品交互定义 |
| `2026-08-planner-capability-extensions.md` | 暂不能 | 表达式、综合目标、逐步模拟、输出/场景扩展和未建模来源均有未完成项 |
| `2026-08-planner-legendary-effects.md` | 暂不能整体完成 | 阶段一虽已有实现痕迹，但无存档假设和锻造优先级建议仍未完成，不能归档整体需求 |
| `2026-08-planner-viability-warning-upgrades.md` | 暂不能 | 暴击吞吐、治疗 HPS 和支援英雄阵亡传导仍是独立模型 |
| `2026-08-preset-integration-extensions.md` | 暂不能 | 常用筛选组合和个人画像集成仍未完成 |
| `2026-08-skin-animation-optimization.md` | 暂不能 | 插画页评估、候选选择规则和编码格式评估仍未完成 |
| `2026-08-system-familiar-advisor.md` | 暂不能 | 熟悉库存导入、分配建议和获取建议均未形成完整闭环 |
| `2026-08-visual-asset-full-audit.md` | 已完成 | 全量覆盖、尺寸、体积和 Pages 余量均已核验 |

## 判定规则

需求以单个 Markdown 文件为交付边界；文件存在未完成 checklist、未解决前置数据或未闭合验收项时，不因其中某个子项已落地而整体归档。部分落地需求继续保留，并以 checklist 表达剩余范围。

完整审计证据见 [`2026-08-visual-asset-full-audit.md`](./2026-08-visual-asset-full-audit.md)。
