# Idle Champions 皮肤立绘 override 候选抽样说明

- 日期：2026-04-16
- 状态：基于当前 `public/data/v1/champion-illustrations.json`、已生成立绘产物和抽样脚本复核，当前仍有效。
- 目标：把“下一批最值得人工目检、最可能需要补 override 的皮肤”收敛成可执行清单，避免盲写规则。
- 配套文档：渲染主链路见 `docs/research/data/skin-illustration-render-pipeline-research.md`；alpha 审计见 `docs/research/data/skin-illustration-alpha-fragmentation-research.md`。

## 结论

- 当前清单元数据仍不能自动告诉我们“哪张图一定错”。
- `672 / 672` 个皮肤当前都还是 `sourceSlot = xl`。
- 在已落地 4 条人工 override 后，非默认 `sequence / frame` 的皮肤仍只有这 4 个：`368 -> sequence 1 / frame 11`、`133 -> sequence 0 / frame 7`、`473 -> sequence 1 / frame 30`、`520 -> sequence 1 / frame 7`。
- 因此这轮仍只能用“同英雄内部尺寸偏差 + 主题分类 + 已复核样例回避”筛人工优先级，而不能直接靠字段过滤判断错图。
- 当前这套高优先级样本已经基本跑完；把已复核样本并入默认 `reviewedSkinIds` 后，再按 `risk >= 4` 复跑，已没有剩余未复核的高优先级候选。

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
| 指标 | 每个皮肤计算宽度偏差、高度偏差、面积偏差、`visiblePieceCount` |
| 主题分类 | 明显缩小主题：`毛绒 / 宝宝 / 玩偶 / chibi / action figure`；明显扩展主题：`魔冢 / 飞升 / 夺心魔 / 神裔 / 龙枪 / 星运 / 女巫之光 / 宇宙梦魇 / 巨人` |
| 输出 | `tmp/illustration-override-audit/report.json`、`tmp/illustration-override-audit/index.html` |
| 复跑命令 | `node scripts/audit-idle-champions-illustration-overrides.mjs` |

### 已复核样本如何排除

默认 `reviewedSkinIds` 已覆盖：

- 初始参考：`332`、`416`、`344`、`417`、`297`
- 第一批 `non-obvious`：`367`、`452`、`550`
- 第二批 `theme-expanded`：`362`、`290`、`515`、`473`、`111`、`390`、`123`、`333`、`133`、`327`
- 第三批补充：`396`、`409`、`470`、`471`

这样复跑时会自动跳过已经有人眼结论的样本。

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

## 已复核样本结论

### 第一批 `non-obvious`

- `367` 半人马变异希契：候选更收一点，但半人马主题本来就更宽，且候选右侧手部连接不自然；暂不落 override，保留人工待定。
- `452` 斑猫人变异珊蒂：候选与当前几乎等价，不建议写 override。
- `550` 泰尔那多贾希拉：候选与当前差异很小，不建议写 override。

### 第二批 `theme-expanded`

- `362` 神裔变异弗里：候选只带来轻微变化，不建议写 override。
- `290` 魔冢安裘斯：当前图已接近最优，不建议写 override。
- `515` 魔冢文·乌尔萨：当前图已接近最优，不建议写 override。
- `473` 飞升阿斯代伦：候选 `sequence 1 / frame 30` 有明确收益，已落地 override。
- `111` 女巫之光德丽娜：候选变化极小，不建议写 override。
- `390` 夺心魔维康妮亚：主题天然外扩，候选只轻微收窄，不建议写 override。
- `123` 星运弗里：候选更紧凑，但手部与法杖断开，已撤回 override。
- `333` 魔冢伊万德拉：候选差异小，武器悬空感仍在，不建议写 override。
- `133` 星运伊芙琳：候选 `sequence 0 / frame 7` 明显改善主体过小，已落地 override。
- `327` 宇宙梦魇沃罗妮卡：候选与当前几乎等价，不建议写 override。

### 第三批补充复核

- `396` 神裔变异多纳尔：更像主题本身更窄更高，不建议写 override。
- `409` 玩偶马友夫：候选只是玩偶挥剑动作变化，不构成“当前图错了”。
- `470` 盖尔宝宝：候选只大几像素，小体型是主题本意，不建议写 override。
- `471` 毛绒 BBEG：候选只带来轻微抬手 / 抬头差异，不建议写 override。

## 当前经验点

- 高偏差只是“值得优先看”，不等于“值得立刻写 override”。
- 结构偏差高但仍不应改的代表样本：`332`（魔冢 BBEG），说明“偏差大”不自动等于“图错了”。
- `123` 是重要反例：候选更紧凑，但连接断裂，最终必须回退。

## 下一步建议

1. 停止按当前这套 `risk >= 4` 候选继续盲扩，因为这一轮已经基本看完。
2. 后续若用户明确指出某张图“不像人 / 手断开 / 武器悬空 / 主体过小”，优先做定向复核。
3. 若还要继续系统扩样，改用新启发式，例如主体占画布比例、四肢连接异常、多候选 pose 的视觉差异阈值，而不是继续只看宽高面积偏差。
4. 确实要调的样本再写进 `scripts/data/champion-illustration-overrides.json`，并只做小范围重渲染。

定向小范围命令：

```bash
node scripts/sync-idle-champions-illustrations.mjs           --input tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json           --visualsFile public/data/v1/champion-visuals.json           --illustrationOverrides scripts/data/champion-illustration-overrides.json           --outputDir tmp/render-validation           --currentVersion v1           --skinIds <需要复核的 skinId 列表>           --concurrency 2
```

## 关联文件

- `scripts/audit-idle-champions-illustration-overrides.mjs`
- `scripts/data/champion-illustration-overrides.json`
- `scripts/data/champion-illustration-audit-config.mjs`
- `tmp/illustration-override-audit/report.json`
- `tmp/illustration-override-audit/index.html`
- `docs/research/data/skin-illustration-render-pipeline-research.md`
- `docs/research/data/skin-illustration-alpha-fragmentation-research.md`
