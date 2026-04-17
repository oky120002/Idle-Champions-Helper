# override 审计：信号与抽样方法

- 日期：2026-04-16
- 目标：回答“为什么不能直接从清单字段里找错图”“当前第一轮抽样怎么做”。

## 为什么不能直接从清单里找错图

- 皮肤总数：`672`
- `sourceSlot = xl`：`672`
- `render.pipeline = skelanim`：`672`
- `render.sequenceIndex = 0`：`669`
- `render.frameIndex = 0`：`668`
- 非默认 `sequence / frame` 的条目只有 4 个，且全部来自人工 override，而不是清单自己标出的异常

结论：现阶段没有任何一个简单字段能直接指向“这张图错了”；仍要靠候选排序 + 人工复核。

## 抽样方法

- 脚本：`scripts/audit-idle-champions-illustration-overrides.mjs`
- 基线：按英雄分组，取“英雄本体 + 全部皮肤”的尺寸中位数
- 指标：宽度偏差、高度偏差、面积偏差、`visiblePieceCount`
- 主题分类：明显缩小主题 `毛绒 / 宝宝 / 玩偶 / chibi / action figure`；明显扩展主题 `魔冢 / 飞升 / 夺心魔 / 神裔 / 龙枪 / 星运 / 女巫之光 / 宇宙梦魇 / 巨人`
- 输出：`tmp/illustration-override-audit/report.json`、`tmp/illustration-override-audit/index.html`
- 复跑命令：`node scripts/audit-idle-champions-illustration-overrides.mjs`
