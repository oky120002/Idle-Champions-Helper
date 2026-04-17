# alpha 审计：价值、局限与下一步

- 日期：2026-04-16
- 目标：说明 alpha 审计这层启发式适合做什么、不适合做什么，以及为什么下一步要转 delta 审计。

## 价值

它补上了尺寸审计不擅长的部分：

- detached 武器
- 漂浮 companion
- 复杂主题导致的多主体阅读感
- 宽高正常但视觉上不够整体的样本

## 局限

当前噪音主要来自两类：

1. 主题本来就有漂浮物，例如漂浮书、漂浮眼、漂浮饮料、玩具配件
2. 主题本来就是多主体包装，例如玻璃罩、特殊容器、坐骑 / companion 与角色共同构图

因此它不适合“分数高就自动写 override”，更适合“分数高 -> 进入下一轮人工目检池”。

## 下一步建议

只做 current PNG 扫描已经不够。下一步更合理的是做 current-vs-candidate 的 delta 审计：

1. 对同一个 skin 渲染 current + 候选 pose
2. 每个 pose 都算 alpha 连通域指标
3. 比较候选是否真的明显减少 detached 区域、提高主体连贯性
4. 只有候选明显更连贯时，才升级为 override 候选

也就是说，这层 alpha 审计更像“新候选池生成器”，而不是最终裁决器。

## 关联文件

- `scripts/data/champion-illustration-audit-config.mjs`
- `scripts/data/illustration-alpha-analysis.mjs`
- `scripts/audit-idle-champions-illustration-alpha-fragmentation.mjs`
- `tests/unit/data/illustrationAlphaAnalysis.test.mjs`
- `tmp/illustration-alpha-audit/report.json`
- `tmp/illustration-alpha-audit/index.html`
- `docs/research/data/skin-illustration-override-audit-research.md`
- `docs/research/data/skin-illustration-pose-delta-audit-research.md`
- `docs/research/data/skin-illustration-manual-review-heuristics.md`
