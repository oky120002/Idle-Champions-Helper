# delta 审计：方法与运行范围

- 日期：2026-04-16
- 目标：回答“为什么要做 current-vs-candidate”“脚本怎么算”“这轮跑了哪些样本”。

## 为什么要做 delta

上一轮 alpha 审计只能回答“当前 PNG 有没有 detached prop / 浮空组件 / 多主体包装感”，却回答不了 detached 感是不是主题本意、换一个 pose 会不会明显更连贯；因此需要保留 current，再渲染 top 候选 pose，直接比较 candidate 相对 current 是否真的改善。

## 当前实现

- 脚本：`scripts/data/illustration-pose-review.mjs`、`scripts/data/illustration-pose-delta-analysis.mjs`、`scripts/audit-idle-champions-illustration-pose-delta.mjs`
- 测试：`tests/unit/data/illustrationPoseDeltaAnalysis.test.mjs`
- 核心步骤：
  1. 读取 `champion-visuals`、`champion-illustrations` 与 override 配置
  2. 对指定 skin 重新渲染 current pose 与 top N 候选 pose
  3. 对每张图跑 alpha 连通域分析
  4. 计算 candidate 相对 current 的 delta：detached area、第二连通域占比、fill ratio、显著连通域数量、isolation score
  5. 用加权分数把候选分成 `promising`、`weak`、`negative`

## 这轮运行范围

- 样本：对 alpha 审计筛出的 9 个高分样本跑 delta，分别是 `351`、`282`、`210`、`112`、`298`、`103`、`59`、`496`、`306`
- 命令：

```bash
node scripts/audit-idle-champions-illustration-pose-delta.mjs   --skinIds 351,282,210,112,298,103,59,496,306
```

- 输出：`tmp/illustration-pose-delta-audit/report.json`、`tmp/illustration-pose-delta-audit/index.html`
