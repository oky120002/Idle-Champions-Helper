# delta 审计：方法与结果

- 日期：2026-04-16
- 目标：回答“为什么要做 current-vs-candidate”“脚本怎么算”“这轮跑出了哪些值得继续看的样本”。

## 结论

- current-only 的 alpha 审计有噪音；current-vs-candidate 的 delta 审计能明显继续缩小候选池。
- 对 9 个 alpha 高分样本做 delta 对比后，结果为：`promising = 3`、`weak = 1`、`negative = 5`。
- 最值得继续人工深看的 3 个样本是：`112` 女巫之光守望者、`351` 冒险休闲多纳尔、`298` 假期地下城主。
- 但即使这 3 个进入 `promising`，继续放大复核后，当前仍没有新增 override。

## 为什么要做 delta

上一轮 alpha 审计只能回答“当前 PNG 有没有 detached prop / 浮空组件 / 多主体包装感”，却回答不了：

- detached 感是不是主题本意
- 如果换一个 pose，会不会明显更连贯

因此更合理的下一步是：保留 current，再渲染 top 候选 pose，直接比较 candidate 相对 current 是否真的改善。

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
4. 计算 candidate 相对 current 的 delta：detached area、第二连通域占比、fill ratio、显著连通域数量、isolation score 是否改善
5. 用加权分数把候选分成 `promising`、`weak`、`negative`

## 这轮实际跑的对象

直接对 alpha 审计筛出的 9 个高分样本跑 delta：`351`、`282`、`210`、`112`、`298`、`103`、`59`、`496`、`306`。

执行命令：

```bash
node scripts/audit-idle-champions-illustration-pose-delta.mjs   --skinIds 351,282,210,112,298,103,59,496,306
```

输出：`tmp/illustration-pose-delta-audit/report.json`、`tmp/illustration-pose-delta-audit/index.html`

## 当前结果

| skinId | 名称 | 分类 | best candidate | 当前结论 |
| --- | --- | --- | --- | --- |
| `351` | 冒险休闲多纳尔 | `promising` | `sequence 0 / frame 65` | 指标会给高分，但肉眼差异很小，当前不足以写 override |
| `112` | 女巫之光守望者 | `promising` | `sequence 0 / frame 28` | 候选更收、更连贯，但 current 也完整可读，当前保守不写 override |
| `298` | 假期地下城主 | `promising` | `sequence 1 / frame 36` | 候选让漂浮饮料更靠近主体，但仍更像主题 props |
| `496` | 塞伦涅守望者 | `weak` | `sequence 0 / frame 20` | 有轻微改善，但收益不够强 |
| `282` | 女巫之光 BBEG | `negative` | - | 候选没有真正消除 detached 主题 props |
| `210` | 顶点多纳尔 | `negative` | - | 玻璃罩 / 外侧道具在候选里也没有本质改善 |
| `103` | 龙语者贾拉索 | `negative` | - | 候选没有形成更连贯的持剑关系 |
| `59` | 闭门不出沃纳特 | `negative` | - | 候选与 current 基本等价 |
| `306` | 骄傲父亲梅亨 | `negative` | - | 酒壶 / 蝙蝠是主题道具，候选没有本质改善 |
