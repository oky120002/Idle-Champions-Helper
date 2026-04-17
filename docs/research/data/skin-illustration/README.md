# skin-illustration 主题入口

- 作用：收纳皮肤立绘的根因、格式、路线选择、当前渲染管线、审计方法与人工经验；只按当前问题加载对应小文档。
- 默认顺序：先看本页，再进单个子主题；不要一次把整组立绘文档全读完。

## 先读哪条线

- 判断“为什么会碎、definitions 到底能给什么”：`docs/research/data/skin-illustration/problem-and-evidence.md`
- 判断 SkelAnim 二进制、客户端缓存和运行时结构：`docs/research/data/skin-illustration/runtime-format.md`
- 判断仓库该怎么落地与还差什么：`docs/research/data/skin-illustration/implementation-path.md`
- 比较构建期预合成与前端实时合成：`docs/research/data/skin-illustration/strategy-constraints-and-options.md`、`docs/research/data/skin-illustration/strategy-decision-and-rollout.md`
- 看当前已落地的生产管线：`docs/research/data/skin-illustration/pipeline-overview.md`、`docs/research/data/skin-illustration/pipeline-render-rules.md`、`docs/research/data/skin-illustration/pipeline-operations.md`
- 看候选审计与人工复核：`docs/research/data/skin-illustration/audit-overview.md`、`docs/research/data/skin-illustration/alpha-method-and-results.md`、`docs/research/data/skin-illustration/delta-method-and-results.md`、`docs/research/data/skin-illustration/review-rules-and-process.md`

## 问题到文档的映射

- 页面里又出现碎片图或错 pose：先读 `pipeline-overview.md` -> `pipeline-render-rules.md` -> `pipeline-operations.md`
- 想确认官方到底有没有组装数据：先读 `problem-and-evidence.md` -> `runtime-format.md`
- 想决定路线选构建期还是前端：先读 `strategy-constraints-and-options.md` -> `strategy-decision-and-rollout.md`
- 想扩 audit 或判断要不要写 override：先读 `audit-overview.md` -> `alpha-method-and-results.md` -> `delta-method-and-results.md` -> `review-rules-and-process.md`

## 兼容入口

以下旧路径现在只保留为主题落地页，用来导向更小的叶子文档：

- `docs/research/data/skin-illustration-assembly-research.md`
- `docs/research/data/skin-illustration-render-strategy-research.md`
- `docs/research/data/skin-illustration-render-pipeline-research.md`
- `docs/research/data/skin-illustration-override-audit-research.md`
- `docs/research/data/skin-illustration-alpha-fragmentation-research.md`
- `docs/research/data/skin-illustration-pose-delta-audit-research.md`
- `docs/research/data/skin-illustration-manual-review-heuristics.md`
