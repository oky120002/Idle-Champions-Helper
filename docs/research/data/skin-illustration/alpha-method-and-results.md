# alpha 审计：方法与结果

- 日期：2026-04-16
- 目标：回答“为什么要加这层 detached 审计”“当前脚本怎么算”“这轮跑出了哪些高优先级样本”。

## 结论

- 这条启发式确实能抓出上一轮“尺寸偏差”不敏感的 detached prop / fragment 样本。
- 但高分样本里很多不是 pose 选错，而是主题本来就带漂浮书、漂浮眼、玻璃罩、悬浮饮料、玩具配件、companion 或多主体包装。
- 用当前默认 `reviewedSkinIds` 排除已看过样本后，这轮主要新候选是：`351`、`282`、`210`、`112`、`298`、`103`、`59`、`496`、`306`。
- 这 9 个样本都已补做人工目检；当前判断是：它们更多是在提示“这套 skin 本来就有 detached 道具 / 伴生物”，而不是已经证明 current pose 错了。

## 为什么要加这层审计

尺寸审计擅长抓主体特别宽、特别高、特别小的样本，但不够敏感于：

- 主体尺寸正常，右侧却多出明显 detached 的武器
- 主体正常，但旁边多出漂浮 companion
- 宽高不夸张，却因为多个分离组件导致阅读感变差

## 当前实现

### 脚本与共享配置

- `scripts/data/illustration-alpha-analysis.mjs`
- `scripts/audit-idle-champions-illustration-alpha-fragmentation.mjs`
- `tests/unit/data/illustrationAlphaAnalysis.test.mjs`
- `scripts/data/champion-illustration-audit-config.mjs`

### 当前指标

当前 helper 直接读取正式 PNG，并在 `alpha >= 128` 的掩码上做 8 邻域连通域分析，输出：`fillRatio`、`componentCount`、`significantComponentCount`、`largestComponentRatio`、`secondComponentRatio`、`detachedSignificantAreaRatio`、`isolationScore`。

脚本仍按英雄分组，用“英雄本体 + 全部皮肤”的组内中位数做基线，再看这些指标是否明显偏离；默认风险阈值是 `1.5`。

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
