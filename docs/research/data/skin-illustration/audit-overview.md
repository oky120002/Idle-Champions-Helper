# override 审计：方法、结果总览与已落地规则

- 日期：2026-04-16
- 目标：回答“为什么不能直接从清单里找错图”“当前抽样如何跑”“已经落了哪些 override”。

## 结论

- 当前清单元数据仍不能自动告诉我们“哪张图一定错”。
- `672 / 672` 个皮肤当前都还是 `sourceSlot = xl`。
- 在已落地 4 条人工 override 后，非默认 `sequence / frame` 的皮肤仍只有这 4 个：`368 -> sequence 1 / frame 11`、`133 -> sequence 0 / frame 7`、`473 -> sequence 1 / frame 30`、`520 -> sequence 1 / frame 7`。
- 因此这轮仍只能用“同英雄内部尺寸偏差 + 主题分类 + 已复核样例回避”筛人工优先级，而不能直接靠字段过滤判断错图。

## 为什么不能直接从清单里找错图

当前清单共性字段如下：

- 皮肤总数：`672`
- `sourceSlot = xl`：`672`
- `render.pipeline = skelanim`：`672`
- `render.sequenceIndex = 0`：`669`
- `render.frameIndex = 0`：`668`
- 非默认 `sequence / frame` 的 4 个条目全部来自人工 override，而不是清单自己标出的异常

结论：现阶段没有任何一个简单字段能直接指向“这张图错了”；仍要靠候选排序 + 人工复核。

## 抽样方法

| 项目 | 当前做法 |
| --- | --- |
| 脚本 | `scripts/audit-idle-champions-illustration-overrides.mjs` |
| 基线 | 按英雄分组，取“英雄本体 + 全部皮肤”的尺寸中位数 |
| 指标 | 宽度偏差、高度偏差、面积偏差、`visiblePieceCount` |
| 主题分类 | 明显缩小主题：`毛绒 / 宝宝 / 玩偶 / chibi / action figure`；明显扩展主题：`魔冢 / 飞升 / 夺心魔 / 神裔 / 龙枪 / 星运 / 女巫之光 / 宇宙梦魇 / 巨人` |
| 输出 | `tmp/illustration-override-audit/report.json`、`tmp/illustration-override-audit/index.html` |
| 复跑命令 | `node scripts/audit-idle-champions-illustration-overrides.mjs` |

## 当前结果总览

把已复核样本并入默认 `reviewedSkinIds` 后复跑：

- `non-obvious`：`0`
- `theme-expanded`：`0`
- `theme-small`：`0`
- `reviewed-safe`：默认 `--top 12` 会展示 `12` 个高偏差但已人工下结论的参考样本；若改用 `--top 50`，当前共可看到 `17` 个已复核高偏差样本

含义：这套“尺寸偏差 + 主题分类”的第一轮系统抽样已经基本跑空；后续若还要扩样，必须换新启发式。

## 当前已落地的 4 条 override

| skinId | 名称 | 规则 | 尺寸变化 | 当前判断 |
| --- | --- | --- | --- | --- |
| `368` | 半精灵变异哨兵 | `sequence 1 / frame 11` | `115 x 162 -> 134 x 165` | 把成图从同英雄组里明显偏窄拉回更自然宽度 |
| `520` | 舞厅蔚 | `sequence 1 / frame 7` | `139 x 134 -> 111 x 131` | 把横向展开偏大的默认 pose 收回来 |
| `473` | 飞升阿斯代伦 | `sequence 1 / frame 30` | `189 x 166 -> 177 x 167` | 收回横向外展武器，人物主体更集中 |
| `133` | 星运伊芙琳 | `sequence 0 / frame 7` | `140 x 244 -> 142 x 182` | 显著改善“画布过高、主体过小” |

这 4 条规则都已写入 `scripts/data/champion-illustration-overrides.json`。
