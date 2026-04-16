# Idle Champions 皮肤立绘 override 候选抽样说明

- 记录日期：2026-04-16
- 当前状态：本文基于仓库当前 `public/data/v1/champion-illustrations.json`、已生成立绘产物，以及 2026-04-16 新增的抽样审计脚本整理，现阶段有效。
- 目标：先做一轮系统抽样，把“下一批最值得人工目检、最可能需要补 override 的皮肤”收敛成一份可执行清单，避免直接盲写规则。

> 如果你想看当前立绘渲染主链路、pose / slot 默认规则和覆盖层落点，请看 `docs/research/data/skin-illustration-render-pipeline-research.md`；如果你想看 2026-04-16 新补的一轮“alpha 连通域 / detached prop”审计，请看 `docs/research/data/skin-illustration-alpha-fragmentation-research.md`；本文只负责回答“下一批 override 应该先看哪些 skin”。

---

## 1. 结论先行

截至 2026-04-16，这一轮系统抽样与人工复核得到的结论是：

- **当前清单元数据本身仍不能直接自动告诉我们“哪张图一定错了”。**
- `672 / 672` 个皮肤立绘当前都还是 `sourceSlot = xl`。
- 在已经落地 4 条人工 override 后，当前只有这 4 个 skin 不是默认 `sequence 0 / frame 0`：
  - `368`：半精灵变异哨兵 -> `sequence 1 / frame 11`
  - `133`：星运伊芙琳 -> `sequence 0 / frame 7`
  - `473`：飞升阿斯代伦 -> `sequence 1 / frame 30`
  - `520`：舞厅蔚 -> `sequence 1 / frame 7`
- 这意味着：**即使现在已经有少量人工修正，元数据仍不足以自动判定“剩下哪张一定错”。**
- 所以这轮抽样继续使用“**同英雄内部尺寸偏差 + 主题分类 + 已复核样例回避**”的方法，先筛出**最值得优先肉眼复核**的候选。
- 第一批 `non-obvious` 样本已经全部复核：
  - `367` 暂时保留“人工待定”，但当前仍**不建议**仓促落 override；
  - `452`、`550` 当前都**不建议**写 override。
- 第二批 `theme-expanded` 样本已经全部补完复核：
  - `473` 与 `133` 已确认值得落地 override；
  - `123` 初看更紧凑，但实际成图存在手部连接断开，已**撤回 override**；
  - `362`、`290`、`515`、`111`、`390`、`333`、`327` 当前都**不建议**写 override。
- 第三批补充复核的 `396`、`409`、`470`、`471` 也都已经完成目检，当前全部**不建议**写 override。
- 将这些已复核样本并入脚本默认 `reviewedSkinIds` 后，按当前 `risk >= 4` 抽样规则复跑，**已经没有剩余未复核的高优先级候选**。
- 这意味着：当前这一轮基于“尺寸偏差 + 主题分类”的抽样已经基本跑完；如果后面还要继续系统扩样，就不能只重复现在这套阈值，而要换新的启发式或直接按用户反馈做定向复核。

这里必须保持克制：

- 上面这些是“**高优先级人工复核候选**”，不是已经自动证明“肯定要写 override”。
- 真正是否落 override，仍应逐张做肉眼确认。

---

## 2. 这轮为什么不能直接从清单里找出错误图

我先核了当前立绘清单的共性字段，结果是：

- 皮肤总数：`672`
- `sourceSlot = xl`：`672`
- `render.pipeline = skelanim`：`672`
- `render.sequenceIndex = 0`：`669`
- `render.frameIndex = 0`：`668`
- 非默认 `sequence / frame` 的只有：
  - `368`
  - `133`
  - `473`
  - `520`

这说明当前构建产物虽然已经修正了坐标系和基础 pose 选择问题，也已经开始支持人工覆盖，但从元数据层面看：

- 绝大多数皮肤仍然统一落在同一个默认 sequence / frame；
- 少量非 0 的条目来自**人工 override 结果**，不是清单自动告诉我们的“异常标记”。

因此，**现在仍然没有任何一个简单字段可以直接指向“这张图错了”。**

也正因为如此，这一轮不能靠纯字段过滤解决，只能继续依赖“结构偏差抽样 + 人工复核优先级排序”。

---

## 3. 本轮抽样方法

### 3.1 已新增的可复跑脚本

本轮新增了：

- `scripts/audit-idle-champions-illustration-overrides.mjs`

作用：

1. 读取 `public/data/v1/champion-illustrations.json`
2. 按英雄分组，取“英雄本体 + 该英雄全部皮肤”的尺寸中位数作为基线
3. 对每个皮肤计算：
   - 宽度偏差
   - 高度偏差
   - 面积偏差
   - `visiblePieceCount`
4. 根据皮肤名称做主题分类：
   - 明显缩小主题：`毛绒 / 宝宝 / 玩偶 / chibi / action figure`
   - 明显扩展主题：`魔冢 / 飞升 / 夺心魔 / 神裔 / 龙枪 / 星运 / 女巫之光 / 宇宙梦魇 / 巨人` 等
5. 输出：
   - `tmp/illustration-override-audit/report.json`
   - `tmp/illustration-override-audit/index.html`

当前复跑命令：

```bash
node scripts/audit-idle-champions-illustration-overrides.mjs
```

### 3.2 抽样规则本质上是什么

当前脚本不是在“自动判断错图”，而是在回答：

- 哪些皮肤在同英雄皮肤组里，尺寸 / 占幅 / 分件复杂度偏差特别大？
- 这些偏差更像是主题本意，还是更值得优先怀疑 pose / frame / 资源选择？

所以它产出的不是最终 override，而是**候选优先级**。

### 3.3 已知人工复核样例如何处理

本轮脚本默认把前几轮已经人工下结论的样例都视为“已看过，不优先重复排查”。

当前默认 `reviewedSkinIds` 已覆盖：

- 初始参考样本：`332`、`416`、`344`、`417`、`297`
- 第一批 `non-obvious`：`367`、`452`、`550`
- 第二批 `theme-expanded`：`362`、`290`、`515`、`473`、`111`、`390`、`123`、`333`、`133`、`327`
- 第三批补充样本：`396`、`409`、`470`、`471`

这样做的目的，是让审计脚本在复跑时直接跳过“已经有人眼结论”的样本，把输出集中到真正还没看过的对象。

---

## 4. 当前抽样结果总览

把当前已经复核完的样本并入默认 `reviewedSkinIds` 后，再复跑：

- `non-obvious`：`0`
- `theme-expanded`：`0`
- `theme-small`：`0`
- `reviewed-safe`：
  - 默认 `--top 12` 下会展示前 `12` 个高偏差但已人工下结论的参考样本；
  - 如果改用 `--top 50` 复跑，当前一共能看到 `17` 个已复核的高偏差样本。

这说明：

- 当前这套抽样规则下，已经没有“还没看、又值得优先看”的剩余样本；
- 后续若继续扩样，必须切换到新的筛选逻辑，而不是继续在同一份候选池里打转。

---

## 5. 当前已落地的 override

### 5.1 `368`：半精灵变异哨兵

- 落地规则：
  - `preferredSequenceIndexes = [1]`
  - `preferredFrameIndexes = [11]`
- 落地后结果：
  - `render.sequenceIndex: 0 -> 1`
  - `render.frameIndex: 0 -> 11`
  - 尺寸从 `115 x 162` 调整为 `134 x 165`
- 当前判断：
  - 这条调整把成图从“同英雄皮肤组里明显偏窄”拉回到更接近哨兵组中位尺寸；
  - 已写入 `scripts/data/champion-illustration-overrides.json`。

### 5.2 `520`：舞厅蔚

- 落地规则：
  - `preferredSequenceIndexes = [1]`
  - `preferredFrameIndexes = [7]`
- 落地后结果：
  - `render.sequenceIndex: 0 -> 1`
  - `render.frameIndex: 0 -> 7`
  - 尺寸从 `139 x 134` 调整为 `111 x 131`
- 当前判断：
  - 这条调整把成图从“横向展开偏大”拉回到更接近蔚皮肤组中位尺寸；
  - 已写入 `scripts/data/champion-illustration-overrides.json`。

### 5.3 `473`：飞升阿斯代伦

- 落地规则：
  - `preferredSequenceIndexes = [1]`
  - `preferredFrameIndexes = [30]`
- 落地后结果：
  - `render.sequenceIndex: 0 -> 1`
  - `render.frameIndex: 0 -> 30`
  - 尺寸从 `189 x 166` 调整为 `177 x 167`
- 当前判断：
  - 这条调整把默认 pose 里横向外展过大的武器收回来一些，人物主体更集中；
  - 它落地后仍会被结构偏差脚本列进 `theme-expanded`，这也再次说明审计脚本只能做“候选排序”，不能替代人工目检；
  - 已写入 `scripts/data/champion-illustration-overrides.json`。

### 5.4 `133`：星运伊芙琳

- 落地规则：
  - `preferredSequenceIndexes = [0]`
  - `preferredFrameIndexes = [7]`
- 落地后结果：
  - `render.sequenceIndex: 0 -> 0`
  - `render.frameIndex: 0 -> 7`
  - 尺寸从 `140 x 244` 调整为 `142 x 182`
- 当前判断：
  - 这条调整显著改善了“画布过高、主体过小”的问题，人物站姿更完整，主体占比明显更合理；
  - 落地后它已经不再出现在 `theme-expanded` 候选里；
  - 已写入 `scripts/data/champion-illustration-overrides.json`。

---

## 6. 第一批 non-obvious 样本复核结果

这 3 个样本都已经做过 `current vs 候选 pose` 的对比图复核。当前结论如下：

### 6.1 `367`：半人马变异希契

- 英雄：希契
- 当前图：
  - `sequence 0 / frame 0`
  - 成图尺寸 `226 x 182`
- 目检过的候选：
  - `sequence 1 / frame 2`
  - 候选成图尺寸 `199 x 186`
- 当前判断：
  - 候选图确实更收敛一些；
  - 但对照希契其他皮肤一起看，`半人马` 主题本身就天然更宽，当前候选并没有形成“明显更对”的压倒性优势；
  - 候选 pose 里靠右侧的手部连接也不自然；
  - **暂不落 override，继续保留人工待定。**

### 6.2 `452`：斑猫人变异珊蒂

- 英雄：珊蒂
- 当前判断：
  - 候选 pose 与当前图几乎等价；
  - 当前没有看到足够明确的视觉收益；
  - **不建议写 override。**

### 6.3 `550`：泰尔那多贾希拉

- 英雄：贾希拉
- 当前判断：
  - 候选 pose 与当前图差异很小；
  - 当前没有看到足够明确的视觉收益；
  - **不建议写 override。**

---

## 7. 第二批前 5 个样本复核结果

这批样本都属于“结构偏差高，但主题上也可能天然偏大”的情况。前 5 个样本当前复核结论如下：

| skinId | 名称 | 当前结论 |
| --- | --- | --- |
| `362` | 神裔变异弗里 | 候选 `sequence 1 / frame 0` 只带来轻微变化，**不建议写 override** |
| `290` | 魔冢安裘斯 | 当前图基本已经是最优，**不建议写 override** |
| `515` | 魔冢文·乌尔萨 | 当前图基本已经是最优，**不建议写 override** |
| `473` | 飞升阿斯代伦 | 候选 `sequence 1 / frame 30` 视觉收敛更明显，**已落地 override** |
| `111` | 女巫之光德丽娜 | 候选 `sequence 0 / frame 37` 变化极小，**不建议写 override** |

说明：

- 第二批前 5 个里，真正值得落地的目前只有 `473`；
- 这也说明“结构偏差高”并不等于“当前 pose 一定错”。

---

## 8. 第二批剩余 5 个样本复核结果

这 5 个样本也已经全部补做 `current vs 候选 pose` 复核。当前结论如下：

| skinId | 名称 | 当前结论 |
| --- | --- | --- |
| `390` | 夺心魔维康妮亚 | 候选 `sequence 1 / frame 0` 只比当前轻微收窄，但夺心魔主题本来就天然外扩，**不建议写 override** |
| `123` | 星运弗里 | 候选 `sequence 1 / frame 28` 虽然更紧凑，但手部与法杖连接断开，**已撤回 override** |
| `333` | 魔冢伊万德拉 | 候选 `sequence 1 / frame 19` 与当前只有轻微差异，而且武器看起来仍然像悬空，**不建议写 override** |
| `133` | 星运伊芙琳 | 候选 `sequence 0 / frame 7` 明显改善主体过小的问题，**已落地 override** |
| `327` | 宇宙梦魇沃罗妮卡 | 候选 `sequence 1 / frame 0` 与当前几乎等价，只是轻微收窄，**不建议写 override** |

说明：

- 这一轮补看之后，第二批里最终保留落地的只有 `133`；
- `123` 虽然一度尝试落地，但因手部断开已回退到默认 pose；
- `390`、`333`、`327` 虽然结构偏差仍高，但目前都没有看到足够明确的视觉收益；
- 这也再次说明“候选分数变好”不等于“肉眼一定更对”。

---

## 9. 第三批补充复核结果

### 9.1 `396` 与 `409`

这两个样本都补做了 `current vs 候选 pose` 复核。当前结论如下：

| skinId | 名称 | 当前结论 |
| --- | --- | --- |
| `396` | 神裔变异多纳尔 | 候选 `sequence 1 / frame 5` 只是把宽度从 `128` 拉到约 `143`，人物主体、翅膀与法杖关系并没有出现更明确的视觉收益，**不建议写 override** |
| `409` | 玩偶马友夫 | 候选 `sequence 1 / frame 22` 会让姿态更横向一些，但更像玩偶挥剑动作变化，不构成“当前图明显错了”，**不建议写 override** |

说明：

- `396` 的偏差更像“这套神裔造型本身更窄更高”，而不是默认 pose 选错；
- `409` 虽然命中了 `action figure` 小体型主题，但候选和当前差别依旧很小，没必要为了“更宽一点”硬写规则。

### 9.2 `470` 与 `471`

这两个都属于明显缩小主题，本轮也补做了对比图复核：

| skinId | 名称 | 当前结论 |
| --- | --- | --- |
| `470` | 盖尔宝宝 | 候选 pose 只比当前大几像素，整体还是同一个宝宝造型，**不建议写 override** |
| `471` | 毛绒 BBEG | 候选 pose 只带来轻微抬手 / 抬头差异，没有形成更强主立绘优势，**不建议写 override** |

处理建议：

- `毛绒 / 宝宝 / 玩偶 / 手办` 这类样本，除非肉眼能明确看到连接错误、遮挡错误或明显更优 pose；
- 否则不建议因为“它比别的皮肤小”就直接写 override。

### 9.3 已复核正常的参考样本

当前仍然最适合作为“结构偏差不等于错误图”参考样本的，是：

- `332`：魔冢 BBEG

它的意义是：

- 结构偏差大，并不自动等于“图错了”；
- 所以后续 override 录入仍必须依赖目检，而不是只靠尺寸阈值。

---

## 10. 推荐的下一步执行顺序

如果下一轮还要继续录 override，建议改成下面这个顺序：

1. 先停止按当前这套 `risk >= 4` 候选继续盲扩，因为这一轮可疑样本已经基本看完
2. 若用户后续明确指出某张图“不像人 / 手断开 / 武器悬空 / 主体过小”，优先对那张图做**定向复核**
3. 若还想继续系统扩样，需要换新的启发式，例如“主体占画布比例”“四肢连接异常”“多候选 pose 的视觉差异阈值”，而不是继续只看宽高面积偏差
4. 把确实需要调整的样本写入 `scripts/data/champion-illustration-overrides.json`，并只做小范围重渲染，不要立刻全量重建

建议的定向小范围命令：

```bash
node scripts/sync-idle-champions-illustrations.mjs \
  --input tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json \
  --visualsFile public/data/v1/champion-visuals.json \
  --illustrationOverrides scripts/data/champion-illustration-overrides.json \
  --outputDir tmp/render-validation \
  --currentVersion v1 \
  --skinIds <需要复核的 skinId 列表> \
  --concurrency 2
```

---

## 11. 当前记录关联文件

- `scripts/audit-idle-champions-illustration-overrides.mjs`
- `scripts/data/champion-illustration-overrides.json`
- `scripts/sync-idle-champions-illustrations.mjs`
- `public/data/v1/champion-illustrations.json`
- `tmp/illustration-override-audit/report.json`
- `tmp/illustration-override-audit/index.html`
- `docs/research/data/skin-illustration-render-pipeline-research.md`
