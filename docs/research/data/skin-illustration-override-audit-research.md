# Idle Champions 皮肤立绘 override 候选抽样说明

- 记录日期：2026-04-16
- 当前状态：本文基于仓库当前 `public/data/v1/champion-illustrations.json`、已生成立绘产物，以及 2026-04-16 新增的抽样审计脚本整理，现阶段有效。
- 目标：先做一轮系统抽样，把“下一批最值得人工目检、最可能需要补 override 的皮肤”收敛成一份可执行清单，避免直接盲写规则。

> 如果你想看当前立绘渲染主链路、pose / slot 默认规则和覆盖层落点，请看 `docs/research/data/skin-illustration-render-pipeline-research.md`；本文只负责回答“下一批 override 应该先看哪些 skin”。

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
- 当前剩余最优先复核的**非显式主题异常**样本仍是：
  1. `367`：半人马变异希契
  2. `452`：斑猫人变异珊蒂
  3. `550`：泰尔那多贾希拉
- 第二批前 5 个样本已经做过一轮目检，其中：
  - `473` 已确认值得落地 override；
  - `362`、`290`、`515`、`111` 当前都**不建议**写 override。
- 第二批剩余 5 个样本也已经补完复核，其中：
  - `133` 已确认值得落地 override；
  - `123` 初看更紧凑，但实际成图存在手部连接断开，已**撤回 override**；
  - `390`、`333`、`327` 当前都**不建议**写 override。
- 审计脚本复跑后，`theme-expanded` 数量已从 `11` 降到 `10`；`133` 已不再出现在高优先级候选里。
- 明显偏小的 `毛绒 / 宝宝 / 玩偶` 类样本，本轮仍不建议优先写 override；它们更像主题造型本意，而不是 pose 选错。

这里必须保持克制：

- 上面这些是“**高优先级人工复核候选**”，不是已经自动证明“肯定要写 override”。
- 真正是否落 override，仍应按这份顺序做逐张肉眼确认。

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

本轮脚本默认把这些已复核样例视为“已看过，不优先重复排查”：

- `332`：魔冢 BBEG
- `416`：毛绒伊万德拉
- `344`：Venture Casual K'thriss
- `417`：毛绒妮茜
- `297`：Witchlight Nixie

其中当前真正还会继续在结构偏差里冒出来的，是：

- `332`
- `416`

但它们已经在前一轮肉眼复核中确认“当前成图正常”，所以这里只保留作校验参考，不再列入下一批优先 override 清单。

---

## 4. 当前抽样结果总览

在落地 `368`、`133`、`473` 与 `520` 之后，本轮脚本最新产出的高优先级样本还有 `17` 个，分为四类：

- `non-obvious`：`3`
  - 结构偏差明显，但名字上又不是明显的“毛绒 / 巨人 / 飞升”主题
  - **优先级最高**
- `theme-expanded`：`10`
  - 尺寸偏差明显，但也可能是主题本来就更大 / 更宽 / 更高
  - **第二优先级**
- `theme-small`：`3`
  - 明显缩小主题
  - **低优先级**
- `reviewed-safe`：`1`
  - 结构偏差高，但已人工看过，当前可视为正常

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

## 9. 当前不建议优先写 override 的样本

### 9.1 明显缩小主题

当前抽样里这 3 个样本虽然偏差高，但更像主题造型本意：

- `471`：毛绒 BBEG
- `411`：毛绒安裘斯
- `470`：盖尔宝宝

处理建议：

- 除非肉眼确认 pose 真的不对；
- 否则不建议因为“它比别的皮肤小”就直接写 override。

### 9.2 已复核正常的参考样本

这轮仍保留一个高偏差但已人工确认正常的参考样本：

- `332`：魔冢 BBEG

它的意义是：

- 结构偏差大，并不自动等于“图错了”；
- 所以后续 override 录入仍必须依赖目检，而不是只靠尺寸阈值。

---

## 10. 推荐的下一步执行顺序

如果下一轮继续录 override，建议按这个顺序推进：

1. 继续谨慎观察 `367`，但在没有更强视觉证据前不要仓促落规则
2. 若还要继续扩样，再从当前审计结果里向后看新的 `theme-expanded` / `non-obvious` 候选；其中 `123` 已确认“更紧凑但有断裂”，不应直接重复录入
3. 把确实需要调整的样本写入 `scripts/data/champion-illustration-overrides.json`
4. 每录一批，都只做小范围重渲染，不要立刻全量重建

建议的小范围命令：

```bash
node scripts/sync-idle-champions-illustrations.mjs \
  --input tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json \
  --visualsFile public/data/v1/champion-visuals.json \
  --illustrationOverrides scripts/data/champion-illustration-overrides.json \
  --outputDir tmp/render-validation \
  --currentVersion v1 \
  --skinIds 367,390,333,327 \
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
