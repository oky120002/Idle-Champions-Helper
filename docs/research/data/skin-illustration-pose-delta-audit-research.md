# Idle Champions 皮肤立绘 pose delta 审计

- 记录日期：2026-04-16
- 当前状态：本文基于仓库当前已生成立绘 PNG、alpha 审计候选池、以及 2026-04-16 新增的 current-vs-candidate delta 审计脚本整理，现阶段有效。
- 目标：把“当前图本身看起来像 detached”进一步收敛成“候选 pose 是否真的比 current 更连贯”，减少重复人工目检。

> 如果你想看上一轮只分析 current PNG 的 detached prop 审计，请看 `docs/research/data/skin-illustration-alpha-fragmentation-research.md`；如果你想看已经沉淀下来的人工判断经验，请看 `docs/research/data/skin-illustration-manual-review-heuristics.md`。

---

## 1. 结论先行

截至 2026-04-16，这一轮 pose delta 审计得到 4 个关键结论：

- **current-only 的 alpha 审计有噪音，但 current-vs-candidate 的 delta 审计能明显继续缩小候选池。**
- 对这轮 9 个 alpha 高分样本做 delta 对比后，当前结果是：
  - `promising`：`3`
  - `weak`：`1`
  - `negative`：`5`
- 当前最值得继续人工深看的是：
  1. `112`：女巫之光守望者
  2. `351`：冒险休闲多纳尔
  3. `298`：假期地下城主
- 我继续对这 3 个 `promising` 样本做了更细一层的人眼复核，当前结论仍是：**没有新增 override**。
- 但即使是这 3 个，也只是“候选 pose 在连通域指标上明显优于 current”，**还不能直接等于应该立刻写 override**。

这条新审计目前最有价值的地方是：

- 它能把“只是主题 props 很多”的样本继续筛掉一大半；
- 把真正值得继续人工看的一批 skin 收敛到很小的清单。

---

## 2. 为什么要做 delta 审计

上一轮 alpha 审计只能回答：

- 当前正式 PNG 有没有 detached prop / 浮空组件 / 多主体包装感？

但它回答不了：

- 这种 detached 感是主题本意，还是 current pose 选错？
- 如果换一个候选 pose，会不会明显更连贯？

这正是很多样本会卡住的地方：

- `351` 看起来大剑 detached
- `282` 看起来漂浮眼和漂浮书 detached
- `298` 看起来酒杯 detached

单看 current，很难知道这些是不是错。

所以更合理的下一步就是：

1. 先保留 current
2. 再渲染 top 候选 pose
3. 比较 candidate 是否真的比 current 更连贯

---

## 3. 当前实现

### 3.1 新增脚本与 helper

这轮新增了：

- `scripts/data/illustration-pose-review.mjs`
- `scripts/data/illustration-pose-delta-analysis.mjs`
- `scripts/audit-idle-champions-illustration-pose-delta.mjs`
- `tests/unit/data/illustrationPoseDeltaAnalysis.test.mjs`

### 3.2 核心思路

当前脚本做的事情是：

1. 读取当前 `champion-visuals` / `champion-illustrations` / override 配置
2. 对指定 skin 重新渲染：
   - current pose
   - top N 候选 pose
3. 对每一张 current / candidate PNG 都跑 alpha 连通域分析
4. 计算 candidate 相对 current 的 delta：
   - detached area 是否下降
   - 第二连通域占比是否下降
   - fill ratio 是否提升
   - 显著连通域数量是否减少
   - isolation score 是否下降
5. 用一套加权分数，判断 candidate 是：
   - `promising`
   - `weak`
   - `negative`

### 3.3 当前分类含义

- `promising`
  - 候选 pose 对 current 有较明确的连贯性改善
  - 值得继续人工深看
- `weak`
  - 有轻微改进，但证据不强
  - 不建议直接写 override
- `negative`
  - 候选几乎没收益，甚至更差
  - 当前更像主题本意，不建议继续消耗人工

---

## 4. 这轮实际跑了什么

由于上一轮 alpha 审计已经把 9 个高分样本补进经验库，这里直接对这 9 个样本跑 delta 审计：

- `351`
- `282`
- `210`
- `112`
- `298`
- `103`
- `59`
- `496`
- `306`

执行命令：

```bash
node scripts/audit-idle-champions-illustration-pose-delta.mjs \
  --skinIds 351,282,210,112,298,103,59,496,306
```

输出位置：

- `tmp/illustration-pose-delta-audit/report.json`
- `tmp/illustration-pose-delta-audit/index.html`

---

## 5. 当前结果

### 5.1 promising

| skinId | 名称 | best candidate | 当前理解 |
| --- | --- | --- | --- |
| `351` | 冒险休闲多纳尔 | `sequence 0 / frame 65` | 指标会把它判成强阳性，但肉眼差异很小，当前不足以写 override |
| `112` | 女巫之光守望者 | `sequence 0 / frame 28` | 候选确实更收、更连贯，但 current 也完整可读，当前仍保守不写 override |
| `298` | 假期地下城主 | `sequence 1 / frame 36` | 候选让漂浮饮料更靠近主体，但仍更像主题 props，而非 pose 错误 |

### 5.2 weak

| skinId | 名称 | best candidate | 当前理解 |
| --- | --- | --- | --- |
| `496` | 塞伦涅守望者 | `sequence 0 / frame 20` | 有轻微改善，但幅度不够强，暂不建议直接写 override |

### 5.3 negative

| skinId | 名称 | 当前理解 |
| --- | --- | --- |
| `282` | 女巫之光 BBEG | 候选基本只提升一点点 fill，没有真正消除 detached 主题 props |
| `210` | 顶点多纳尔 | 候选对玻璃罩 / 外侧 props 几乎没有根本改善 |
| `103` | 龙语者贾拉索 | 候选没有形成更连贯的持剑关系 |
| `59` | 闭门不出沃纳特 | 候选和 current 几乎等价 |
| `306` | 骄傲父亲梅亨 | 候选对酒壶 / 蝙蝠这类主题道具没有根本改善 |

---

### 5.4 对 promising 样本做二次人工复核后的结论

这一轮我又把 `112`、`351`、`298` 单独放大复看，结论如下：

- `112`
  - `sequence 0 / frame 26-30` 这一簇候选都比 current 稍微收一点，说明它不是单帧巧合；
  - 但 current 的手部、武器、轮廓关系本身并没有断裂，候选更多是在“更紧凑”和“更动态”之间取舍；
  - 当前还没有强到足以把它升级成正式 override，但如果后面要继续做更激进的人工优化，`112` 仍然是第一优先级回看样本。
- `351`
  - 指标会给出很高分，是因为大剑从“独立第二连通域”变成了“和主体接上”；
  - 但肉眼看时，当前图和候选图只是刀身角度稍微内收，人物主体几乎没变；
  - 这说明 **单个长武器刚好接触主体时，alpha 连通域分数会被明显放大**，不能只看数值。
- `298`
  - `sequence 1 / frame 36` 的饮料杯确实离身体更近一些；
  - 但它仍然明显是单独的假期主题道具，人物主体也没有出现“当前 pose 选错”的强证据；
  - 当前不建议因为这点轻微改善就写 override。

这一轮二次复核后的实际结果是：

- `promising` 很适合用来排定人工优先级；
- 但这 3 个 top 样本里，**仍然没有一个足够压倒性地值得直接落规则**。

---

## 6. 这轮人工判断后的经验补充

这轮最值得沉淀的经验有 3 条：

### 6.1 delta 审计比 current-only 审计更接近“是否值得看”

alpha current-only 审计会把很多“本来就有漂浮 props”的主题一起抓出来。

而 delta 审计能继续问一句：

- 候选 pose 是否真的把这个问题改善了？

这一层问完之后，候选池会显著变小。

### 6.2 即使是 promising，也仍然需要最后的人眼裁决

`351`、`112`、`298` 现在只是：

- 系统上比 current 更连贯

但它们还没有被证明：

- 一定更像官方正式主立绘

所以 delta 审计的职责应该是：

- **缩小人工队列**

而不是：

- **替代人工裁决**

### 6.3 负向结果同样有价值

像 `282`、`210`、`306` 这种样本，之前 alpha current-only 看起来都挺可疑。

但 delta 审计一跑就能发现：

- 候选 pose 根本没有本质改善

这类结果很重要，因为它能避免后面反复对同一类主题 props 做无效人工复核。

---

## 7. 当前建议的下一步

这一轮更合理的收尾动作已经不是继续盲目扩看，而是：

1. 把 `112`、`351`、`298` 的二次人工结论沉淀进经验库
2. 保持当前 override 列表不变
3. 后续只在下面两种情况下再继续深挖：
   - 出现新的高风险样本
   - 用户明确要求做更激进的“宁可多改，也要追求更漂亮正式立绘”的人工优化

当前保留给后续回看的优先顺序可以记成：

1. `112`
2. `351`
3. `298`

但这个顺序的含义已经变成：

- **优先回看名单**

而不是：

- **默认应该新增 override 的名单**

---

## 8. 当前关联文件

- `scripts/data/illustration-pose-review.mjs`
- `scripts/data/illustration-pose-delta-analysis.mjs`
- `scripts/audit-idle-champions-illustration-pose-delta.mjs`
- `tests/unit/data/illustrationPoseDeltaAnalysis.test.mjs`
- `tmp/illustration-pose-delta-audit/report.json`
- `tmp/illustration-pose-delta-audit/index.html`
- `docs/research/data/skin-illustration-alpha-fragmentation-research.md`
- `docs/research/data/skin-illustration-manual-review-heuristics.md`
