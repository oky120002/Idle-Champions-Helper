# Idle Champions 皮肤立绘 alpha 连通域审计

- 日期：2026-04-16
- 状态：基于当前 `public/data/v1/champion-illustrations.json`、本地已生成 PNG 产物和当日新增的 alpha 审计脚本，当前仍有效。
- 目标：在“尺寸偏差 + 主题分类”之外，再补一层可复跑的系统审计，用来抓 detached prop、浮空伴生物、画布内部空域过多这类单看宽高不容易冒出来的问题。
- 配套文档：尺寸偏差抽样见 `docs/research/data/skin-illustration-override-audit-research.md`；current-vs-candidate 收敛见 `docs/research/data/skin-illustration-pose-delta-audit-research.md`；人工经验库见 `docs/research/data/skin-illustration-manual-review-heuristics.md`。

## 结论

- 这条启发式确实能抓出上一轮“尺寸偏差”不敏感的 detached prop / fragment 样本。
- 但噪音也很明显：高分样本里很多不是 pose 选错，而是主题本来就带漂浮书、漂浮眼、玻璃罩、悬浮饮料、玩具配件、companion 或多主体包装。
- 用当前默认 `reviewedSkinIds` 排除已看过样本后，这轮主要新候选是：`351`、`282`、`210`、`112`、`298`、`103`、`59`、`496`、`306`。
- 我已经把这 9 个样本全部补做人工目检；当前判断是：它们更多是在提示“这套 skin 本来就有 detached 道具 / 伴生物”，而不是已经证明 current pose 错了。
- 把这 9 个样本并入默认 `reviewedSkinIds` 后再复跑，当前 alpha 审计已经没有剩余未复核的高优先级候选。

## 为什么要加这层审计

尺寸审计擅长抓主体特别宽、特别高、特别小的样本，但不够敏感于：

- 主体尺寸正常，右侧却多出明显 detached 的武器
- 主体正常，但旁边多出漂浮 companion
- 宽高不夸张，却因为多个分离组件导致阅读感变差

用户此前点出的 `333`、`367`、`123` 都属于这类模式，因此需要一层更贴近最终 PNG 观感的分析。

## 当前实现

### 脚本与共享配置

- `scripts/data/illustration-alpha-analysis.mjs`
- `scripts/audit-idle-champions-illustration-alpha-fragmentation.mjs`
- `tests/unit/data/illustrationAlphaAnalysis.test.mjs`
- `scripts/data/champion-illustration-audit-config.mjs`

### 当前指标

当前 helper 直接读取正式 PNG，并在 `alpha >= 128` 的掩码上做 8 邻域连通域分析，输出：

- `fillRatio`
- `componentCount`
- `significantComponentCount`
- `largestComponentRatio`
- `secondComponentRatio`
- `detachedSignificantAreaRatio`
- `isolationScore`

脚本仍按英雄分组，用“英雄本体 + 全部皮肤”的组内中位数做基线，再看这些指标是否明显偏离；默认风险阈值是 `1.5`。

输出：`tmp/illustration-alpha-audit/report.json`、`tmp/illustration-alpha-audit/index.html`

复跑命令：

```bash
node scripts/audit-idle-champions-illustration-alpha-fragmentation.mjs
```

## 这轮脚本结果

按这轮开始时的默认 `reviewedSkinIds` 复跑，结果是：

- `detached-fragment`：`8`
- `sparse-fill`：`0`
- `mixed`：`1`
- `reviewed-safe`：`12`

最值得继续看的 9 个样本如下：

| skinId | 名称 | 当前特征 | 人工结论 |
| --- | --- | --- | --- |
| `351` | 冒险休闲多纳尔 | 第二连通域占比约 `0.244`，大剑明显独立成块 | 多候选里 detached 大剑都持续存在，更像展示结构 |
| `282` | 女巫之光 BBEG | 漂浮眼 / 漂浮书占比高 | 更像女巫之光主题固定元素 |
| `210` | 顶点多纳尔 | 玻璃罩与外侧道具让显著连通域偏多 | 更像复杂主题包装 |
| `112` | 女巫之光守望者 | 次级 detached 组件较明显 | 候选只轻微调整站姿，未出现压倒性更优 frame |
| `298` | 假期地下城主 | 漂浮饮料单独成块 | 更像假期主题 props |
| `103` | 龙语者贾拉索 | 剑与主体分离感较强 | 候选没有更好的持剑关系 |
| `59` | 闭门不出沃纳特 | 右侧配件单独成块 | 多候选都持续存在，无明确收益 |
| `496` | 塞伦涅守望者 | companion / 特效 detached 明显 | 更像主题 companion 与特效 |
| `306` | 骄傲父亲梅亨 | detached prop + fill 偏低 | 酒壶和蝙蝠更像主题道具 |

## 这条启发式的价值与局限

### 价值

它补上了尺寸审计不擅长的部分：

- detached 武器
- 漂浮 companion
- 复杂主题导致的多主体阅读感
- 宽高正常但视觉上不够整体的样本

### 局限

当前噪音主要来自两类：

1. 主题本来就有漂浮物，例如漂浮书、漂浮眼、漂浮饮料、玩具配件
2. 主题本来就是多主体包装，例如玻璃罩、特殊容器、坐骑 / companion 与角色共同构图

因此它不适合“分数高就自动写 override”，更适合“分数高 -> 进入下一轮人工目检池”。

## 下一步建议

只做 current PNG 扫描已经不够。下一步更合理的是做 current-vs-candidate 的 delta 审计：

1. 对同一个 skin 渲染 current + 候选 pose
2. 每个 pose 都算 alpha 连通域指标
3. 比较候选是否真的明显减少 detached 区域、提高主体连贯性
4. 只有候选明显更连贯时，才升级为 override 候选

也就是说，这层 alpha 审计更像“新候选池生成器”，而不是最终裁决器。

## 关联文件

- `scripts/data/champion-illustration-audit-config.mjs`
- `scripts/data/illustration-alpha-analysis.mjs`
- `scripts/audit-idle-champions-illustration-alpha-fragmentation.mjs`
- `tests/unit/data/illustrationAlphaAnalysis.test.mjs`
- `tmp/illustration-alpha-audit/report.json`
- `tmp/illustration-alpha-audit/index.html`
- `docs/research/data/skin-illustration-override-audit-research.md`
- `docs/research/data/skin-illustration-pose-delta-audit-research.md`
- `docs/research/data/skin-illustration-manual-review-heuristics.md`
