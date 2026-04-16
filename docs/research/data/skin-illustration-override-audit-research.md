# Idle Champions 皮肤立绘 override 候选抽样说明

- 记录日期：2026-04-16
- 当前状态：本文基于仓库当前 `public/data/v1/champion-illustrations.json`、已生成立绘产物，以及 2026-04-16 新增的抽样审计脚本整理，现阶段有效。
- 目标：先做一轮系统抽样，把“下一批最值得人工目检、最可能需要补 override 的皮肤”收敛成一份可执行清单，避免直接盲写规则。

> 如果你想看当前立绘渲染主链路、pose / slot 默认规则和覆盖层落点，请看 `docs/research/data/skin-illustration-render-pipeline-research.md`；本文只负责回答“下一批 override 应该先看哪些 skin”。

---

## 1. 结论先行

截至 2026-04-16，这一轮系统抽样得到的结论是：

- **当前清单元数据本身不能直接自动告诉我们“哪张图一定错了”。**
- `672 / 672` 个皮肤立绘当前都还是：
  - `sourceSlot = xl`
  - `render.sequenceIndex = 0`
  - `render.frameIndex = 0`
- 这意味着：仅看 `champion-illustrations.json`，无法像“查非 0 frame”那样直接筛出错误项。
- 所以这轮抽样改用“**同英雄内部尺寸偏差 + 主题分类 + 已复核样例回避**”的方法，先筛出**最值得优先肉眼复核**的候选。
- 当前建议的第一批复核顺序，优先看这 5 个**非显式主题异常**样本：
  1. `367`：半人马变异希契
  2. `452`：斑猫人变异珊蒂
  3. `520`：舞厅蔚
  4. `550`：泰尔那多贾希拉
  5. `368`：半精灵变异哨兵
- 第二批再看这 10 个**结构偏差明显、但主题上也可能天然偏大的样本**：
  - `362`、`290`、`515`、`473`、`111`、`390`、`123`、`333`、`133`、`327`
- 明显偏小的 `毛绒 / 宝宝 / 玩偶` 类样本，本轮不建议优先写 override；它们更像主题造型本意，而不是 pose 选错。

这里必须保持克制：

- 上面这些是“**高优先级人工复核候选**”，不是已经自动证明“肯定要写 override”。
- 真正是否落 override，仍应按这份顺序做逐张肉眼确认。

---

## 2. 这轮为什么不能直接从清单里找出错误图

我先核了当前立绘清单的共性字段，结果很一致：

- 皮肤总数：`672`
- `sourceSlot = xl`：`672`
- `render.pipeline = skelanim`：`672`
- `render.sequenceIndex = 0`：`672`
- `render.frameIndex = 0`：`672`

这说明当前构建产物虽然已经修正了坐标系和基础 pose 选择问题，但从元数据层面看，所有皮肤仍然统一落在：

- 同一个 slot 优先级结果
- 同一个默认 sequence
- 同一个默认 frame

因此，**现在没有任何一个简单字段可以直接指向“这张图错了”。**

也正因为如此，这一轮不能靠纯字段过滤解决，只能改成“结构偏差抽样 + 人工复核优先级排序”。

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

本轮脚本产出的高优先级样本共 `20` 个，分为四类：

- `non-obvious`：`5`
  - 结构偏差明显，但名字上又不是明显的“毛绒 / 巨人 / 飞升”主题
  - **优先级最高**
- `theme-expanded`：`11`
  - 尺寸偏差明显，但也可能是主题本来就更大 / 更宽 / 更高
  - **第二优先级**
- `theme-small`：`3`
  - 明显缩小主题
  - **低优先级**
- `reviewed-safe`：`1`
  - 结构偏差高，但已人工看过，当前可视为正常

---

## 5. 第一批建议先复核的 5 个 skin

这 5 个是当前最值得先看的一批，因为它们：

- 在同英雄组内偏差明显；
- 但名称上又不属于“天然应该缩小 / 放大”的明确主题；
- 如果真要开始补第一批 override，应该先从这里确认。

### 5.1 `367`：半人马变异希契

- 英雄：希契
- 原因：
  - 宽度是同英雄中位数的 `1.81x`
  - 面积是同英雄中位数的 `1.99x`
  - 成图尺寸 `226 x 182`
- 当前判断：
  - 这张图的“横向展开”非常明显；
  - 主题名本身没有像 `毛绒 / 飞升 / 巨人` 那样明确解释这个偏差；
  - **建议排第一批。**

### 5.2 `452`：斑猫人变异珊蒂

- 英雄：珊蒂
- 原因：
  - 宽度是同英雄中位数的 `1.47x`
  - 面积是同英雄中位数的 `1.77x`
- 当前判断：
  - 宽度扩张明显，但又不是显式大型主题；
  - **建议第一批复核。**

### 5.3 `520`：舞厅蔚

- 英雄：蔚
- 原因：
  - 宽度是同英雄中位数的 `1.48x`
  - 面积是同英雄中位数的 `1.57x`
- 当前判断：
  - 是这批里最“非主题驱动”的宽度异常之一；
  - **建议第一批复核。**

### 5.4 `550`：泰尔那多贾希拉

- 英雄：贾希拉
- 原因：
  - 宽度是同英雄中位数的 `1.55x`
  - 面积是同英雄中位数的 `1.55x`
- 当前判断：
  - 横向展开明显，但没有显式巨型主题解释；
  - **建议第一批复核。**

### 5.5 `368`：半精灵变异哨兵

- 英雄：哨兵
- 原因：
  - 宽度仅为同英雄中位数的 `0.71x`
  - 面积仅为同英雄中位数的 `0.64x`
- 当前判断：
  - 与前四张相反，它是明显“偏窄 / 偏小”的非显式主题异常；
  - **建议第一批复核。**

---

## 6. 第二批建议复核的 10 个 skin

这批结构偏差也很高，但它们的主题名本身就更像会带来自然尺寸变化，所以排在第二批：

| skinId | 名称 | 当前优先原因 |
| --- | --- | --- |
| `362` | 神裔变异弗里 | 宽度 `2.02x`，面积 `2.90x` |
| `290` | 魔冢安裘斯 | 宽度 `2.18x`，面积 `2.85x` |
| `515` | 魔冢文·乌尔萨 | 宽度 `1.61x`，高度 `1.46x`，面积 `2.33x` |
| `473` | 飞升阿斯代伦 | 宽度 `1.57x`，`visiblePieceCount = 49` |
| `111` | 女巫之光德丽娜 | 宽度 `1.55x`，面积 `1.93x` |
| `390` | 夺心魔维康妮亚 | 宽度 `1.79x`，面积 `1.79x` |
| `123` | 星运弗里 | 宽度 `1.60x`，面积 `1.77x` |
| `333` | 魔冢伊万德拉 | 宽度 `1.76x`，面积 `1.62x` |
| `133` | 星运伊芙琳 | 高度 `1.44x`，成图 `140 x 244` |
| `327` | 宇宙梦魇沃罗妮卡 | 宽度 `1.63x`，面积 `1.66x` |

说明：

- 这批不是说“当前就一定错”；
- 而是说：**如果第一批复核后，确实出现了需要 `preferredSequenceIndexes / preferredFrameIndexes` 的案例，那么第二批最值得继续看这 10 个。**

---

## 7. 当前不建议优先写 override 的样本

### 7.1 明显缩小主题

当前抽样里这 3 个样本虽然偏差高，但更像主题造型本意：

- `471`：毛绒 BBEG
- `411`：毛绒安裘斯
- `470`：盖尔宝宝

处理建议：

- 除非肉眼确认 pose 真的不对；
- 否则不建议因为“它比别的皮肤小”就直接写 override。

### 7.2 已复核正常的参考样本

这轮仍保留一个高偏差但已人工确认正常的参考样本：

- `332`：魔冢 BBEG

它的意义是：

- 结构偏差大，并不自动等于“图错了”；
- 所以后续 override 录入仍必须依赖目检，而不是只靠尺寸阈值。

---

## 8. 推荐的下一步执行顺序

如果下一轮开始真的要录 override，建议按这个顺序推进：

1. 先目检第一批 5 个：`367, 452, 520, 550, 368`
2. 只要其中有 1~2 个确认“确实应换 pose / frame”，就继续看第二批前 5 个：`362, 290, 515, 473, 111`
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
  --skinIds 367,452,520,550,368 \
  --concurrency 2
```

---

## 9. 当前记录关联文件

- `scripts/audit-idle-champions-illustration-overrides.mjs`
- `scripts/data/champion-illustration-overrides.json`
- `scripts/sync-idle-champions-illustrations.mjs`
- `public/data/v1/champion-illustrations.json`
- `tmp/illustration-override-audit/report.json`
- `tmp/illustration-override-audit/index.html`
- `docs/research/data/skin-illustration-render-pipeline-research.md`
