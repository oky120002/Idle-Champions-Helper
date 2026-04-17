# Idle Champions 皮肤立绘 pose delta 审计

- 日期：2026-04-16
- 状态：基于当前已生成 PNG、alpha 审计候选池和当日新增的 current-vs-candidate delta 审计脚本，当前仍有效。
- 目标：把“当前图看起来 detached”进一步收敛成“候选 pose 是否真的比 current 更连贯”，减少重复人工目检。
- 配套文档：current-only 的 detached 审计见 `docs/research/data/skin-illustration-alpha-fragmentation-research.md`；人工经验库见 `docs/research/data/skin-illustration-manual-review-heuristics.md`。

## 结论

- current-only 的 alpha 审计有噪音；current-vs-candidate 的 delta 审计能明显继续缩小候选池。
- 对 9 个 alpha 高分样本做 delta 对比后，结果为：`promising = 3`、`weak = 1`、`negative = 5`。
- 最值得继续人工深看的 3 个样本是：`112` 女巫之光守望者、`351` 冒险休闲多纳尔、`298` 假期地下城主。
- 但即使这 3 个进入 `promising`，继续放大复核后，当前仍没有新增 override。
- 这条审计最有价值的地方不是直接产出规则，而是把“值得继续肉眼看”的队列压到很小。

## 为什么要做 delta

上一轮 alpha 审计只能回答“当前 PNG 有没有 detached prop / 浮空组件 / 多主体包装感”，却回答不了：

- detached 感是不是主题本意
- 如果换一个 pose，会不会明显更连贯

所以更合理的下一步是：保留 current，再渲染 top 候选 pose，直接比较 candidate 相对 current 是否真的改善。

## 当前实现

### 脚本与测试

- `scripts/data/illustration-pose-review.mjs`
- `scripts/data/illustration-pose-delta-analysis.mjs`
- `scripts/audit-idle-champions-illustration-pose-delta.mjs`
- `tests/unit/data/illustrationPoseDeltaAnalysis.test.mjs`

### 核心思路

1. 读取 `champion-visuals`、`champion-illustrations` 与 override 配置
2. 对指定 skin 重新渲染 current pose 与 top N 候选 pose
3. 对每张图都跑 alpha 连通域分析
4. 计算 candidate 相对 current 的 delta：
   - detached area 是否下降
   - 第二连通域占比是否下降
   - fill ratio 是否提升
   - 显著连通域数量是否减少
   - isolation score 是否下降
5. 用加权分数把候选分成 `promising`、`weak`、`negative`

当前分类含义：

- `promising`：候选比 current 明显更连贯，值得继续人工深看
- `weak`：有轻微改进，但证据不强
- `negative`：候选几乎没收益，甚至更差

## 这轮实际跑的对象

直接对 alpha 审计筛出的 9 个高分样本跑 delta：

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
node scripts/audit-idle-champions-illustration-pose-delta.mjs   --skinIds 351,282,210,112,298,103,59,496,306
```

输出：`tmp/illustration-pose-delta-audit/report.json`、`tmp/illustration-pose-delta-audit/index.html`

## 当前结果

| skinId | 名称 | 分类 | best candidate | 当前结论 |
| --- | --- | --- | --- | --- |
| `351` | 冒险休闲多纳尔 | `promising` | `sequence 0 / frame 65` | 指标会给高分，因为大剑从第二连通域变成更靠近主体；但肉眼差异很小，当前不足以写 override |
| `112` | 女巫之光守望者 | `promising` | `sequence 0 / frame 28` | 候选更收、更连贯，但 current 也完整可读；当前保守不写 override |
| `298` | 假期地下城主 | `promising` | `sequence 1 / frame 36` | 候选让漂浮饮料更靠近主体，但它仍更像主题 props，而非 pose 错误 |
| `496` | 塞伦涅守望者 | `weak` | `sequence 0 / frame 20` | 有轻微改善，但收益不够强 |
| `282` | 女巫之光 BBEG | `negative` | - | 候选没有真正消除 detached 主题 props |
| `210` | 顶点多纳尔 | `negative` | - | 玻璃罩 / 外侧道具在候选里也没有本质改善 |
| `103` | 龙语者贾拉索 | `negative` | - | 候选没有形成更连贯的持剑关系 |
| `59` | 闭门不出沃纳特 | `negative` | - | 候选与 current 基本等价 |
| `306` | 骄傲父亲梅亨 | `negative` | - | 酒壶 / 蝙蝠是主题道具，候选没有本质改善 |

### 对 `promising` 样本的二次人工复核

- `112`：`sequence 0 / frame 26-30` 这一簇都比 current 稍收，说明不是单帧巧合；但 current 本身没有断手、断武器或主体崩坏，暂不写 override。若后面要做更激进优化，它仍是第一优先级回看样本。
- `351`：高分来自“大剑更接近主体”，但肉眼只看到刀身角度轻微内收，人物主体几乎没变；它是“长武器刚好接上主体时，alpha 分数会被放大”的典型假阳性。
- `298`：漂浮饮料确实更靠近身体，但仍明显是主题道具，不足以证明 current pose 选错。

结论：`promising` 很适合排人工优先级，但这 3 个 top 样本仍都不足以直接落规则。

## 经验补充

- delta 审计比 current-only 审计更接近“是否值得继续看”，因为它会继续问：候选 pose 是否真的改善问题。
- `promising` 只代表“值得深看”，不代表“可以直接写 override”。
- `negative` 同样有价值：它能把很多“看起来可疑、但候选根本无收益”的主题 props 样本快速沉淀为参考反例。

## 下一步建议

1. 把 `112`、`351`、`298` 的二次人工结论沉淀进经验库。
2. 保持当前 override 列表不变。
3. 后续只在两种情况下继续深挖：
   - 出现新的高风险样本
   - 用户明确要求做更激进的“宁可多改，也要追求更漂亮正式立绘”的人工优化

当前保留的回看优先顺序是：`112` -> `351` -> `298`；这只是“优先回看名单”，不是默认应新增 override 的名单。

## 关联文件

- `scripts/data/illustration-pose-review.mjs`
- `scripts/data/illustration-pose-delta-analysis.mjs`
- `scripts/audit-idle-champions-illustration-pose-delta.mjs`
- `tests/unit/data/illustrationPoseDeltaAnalysis.test.mjs`
- `tmp/illustration-pose-delta-audit/report.json`
- `tmp/illustration-pose-delta-audit/index.html`
- `docs/research/data/skin-illustration-alpha-fragmentation-research.md`
- `docs/research/data/skin-illustration-manual-review-heuristics.md`
