# Idle Champions 皮肤立绘 alpha 连通域审计

- 记录日期：2026-04-16
- 当前状态：本文基于仓库当前 `public/data/v1/champion-illustrations.json`、本地已生成 PNG 产物，以及 2026-04-16 新增的 alpha 审计脚本整理，现阶段有效。
- 目标：在“尺寸偏差 + 主题分类”之外，再补一层可复跑的系统审计，用来抓“浮空武器 / 浮空伴生物 / detached prop / 画布内部空域过多”这类单看宽高不容易冒出来的问题。

> 如果你想看上一轮基于尺寸偏差的抽样，请看 `docs/research/data/skin-illustration-override-audit-research.md`；如果你想看当前渲染链路与 override 落点，请看 `docs/research/data/skin-illustration-render-pipeline-research.md`。

---

## 1. 结论先行

截至 2026-04-16，这一轮 alpha 连通域审计先得到 4 个关键结论：

- **这条新启发式确实能抓出上一轮“尺寸偏差”没那么敏感的 detached prop / fragment 样本。**
- 但它的噪音也很明显：很多高分样本并不是 pose 选错，而是主题本来就带有漂浮书、漂浮眼、玻璃罩、悬浮饮料、玩具配件之类的分离道具。
- 用当前默认 `reviewedSkinIds` 排除已看过样本后，这轮脚本跑出的新候选主要是：
  - `351`：冒险休闲多纳尔
  - `282`：女巫之光 BBEG
  - `210`：顶点多纳尔
  - `112`：女巫之光守望者
  - `298`：假期地下城主
  - `103`：龙语者贾拉索
  - `59`：闭门不出沃纳特
  - `496`：塞伦涅守望者
  - `306`：骄傲父亲梅亨
- 我继续对其中 `351`、`112`、`210`、`306` 做了 `current vs 多候选 pose` 补看，当前观察是：**这些高分更多是在提示“这个 skin 本来就有 detached 道具/伴生物”，而不是已经证明当前默认 pose 错了。**

这意味着：

- alpha 审计是有价值的；
- 但它更适合作为“新候选池生成器”，不适合直接把高分样本自动转成 override。

---

## 2. 为什么要加这层审计

上一轮 `docs/research/data/skin-illustration-override-audit-research.md` 主要靠：

- 同英雄内部宽高 / 面积中位数偏差
- 主题分类
- 已复核样例回避

这套方法对“主体特别宽 / 特别高 / 特别小”的样本很有效，但它对下面这些情况不够敏感：

- 主体尺寸没那么异常，但右侧多出一把明显 detached 的武器
- 主体本身正常，但旁边多出一块漂浮伴生物
- 画布宽高正常，却因为多个分离组件导致主体阅读感变差

用户前面点出来的例子里，就已经出现过这种模式：

- `333`：武器像悬空
- `367`：右侧手部不自然
- `123`：手部与法杖连接断开

所以这一轮需要补一层更贴近最终 PNG 观感的分析。

---

## 3. 当前实现：alpha 蒙版连通域分析

### 3.1 新增脚本与 helper

这轮新增了：

- `scripts/data/illustration-alpha-analysis.mjs`
- `scripts/audit-idle-champions-illustration-alpha-fragmentation.mjs`
- `tests/unit/data/illustrationAlphaAnalysis.test.mjs`

另外，为了让两套审计共享“已人工看过的 skin 列表”，还新增了：

- `scripts/data/champion-illustration-audit-config.mjs`

### 3.2 alpha helper 在算什么

当前 helper 直接读取已经生成好的本地 PNG，并在 `alpha >= 128` 的掩码上做 8 邻域连通域分析，输出：

- `fillRatio`
  - 实心像素占整张裁切后 PNG 的比例
- `componentCount`
  - 全部连通域数量
- `significantComponentCount`
  - 超过显著阈值的连通域数量
- `largestComponentRatio`
  - 最大连通域占全部实心像素的比例
- `secondComponentRatio`
  - 第二连通域占比
- `detachedSignificantAreaRatio`
  - 所有“显著次级连通域”的面积占比
- `isolationScore`
  - 次级连通域与主连通域 bbox 间距的归一化权重分数

这层分析故意不依赖远端资源，也不重新渲染，只看仓库里已经产出的正式 PNG。

### 3.3 审计脚本怎么打分

当前脚本仍然按英雄分组，拿“英雄本体 + 全部皮肤”做组内中位数基线，然后对每个皮肤计算：

- `fillRatio` 是否明显低于组内中位数
- `detachedSignificantAreaRatio` 是否明显高于组内中位数
- `secondComponentRatio` 是否明显高于组内中位数
- `significantComponentCount` 是否显著偏多
- `isolationScore` 是否明显偏高

当前默认风险阈值：

- `riskThreshold = 1.5`

输出位置：

- `tmp/illustration-alpha-audit/report.json`
- `tmp/illustration-alpha-audit/index.html`

复跑命令：

```bash
node scripts/audit-idle-champions-illustration-alpha-fragmentation.mjs
```

---

## 4. 这轮脚本跑出的结果

按当前默认 `reviewedSkinIds` 复跑，结果是：

- `detached-fragment`：`8`
- `sparse-fill`：`0`
- `mixed`：`1`
- `reviewed-safe`：`12`

当前最值得继续看的一批新样本，基本都集中在 `detached-fragment` 与 `mixed`：

| skinId | 名称 | 当前特征 |
| --- | --- | --- |
| `351` | 冒险休闲多纳尔 | 第二连通域占比约 `0.244`，一把大剑明显独立成块 |
| `282` | 女巫之光 BBEG | 漂浮眼 / 漂浮书类 detached 道具占比高 |
| `210` | 顶点多纳尔 | 玻璃罩与外侧道具让显著连通域数量明显偏多 |
| `112` | 女巫之光守望者 | 次级 detached 组件较明显 |
| `298` | 假期地下城主 | 漂浮饮料单独成块 |
| `103` | 龙语者贾拉索 | 剑与主体分离感较强 |
| `59` | 闭门不出沃纳特 | 右侧配件单独成块 |
| `496` | 塞伦涅守望者 | companion / 特效类 detached 组件明显 |
| `306` | 骄傲父亲梅亨 | detached prop + fill 偏低，属于 `mixed` |

要注意：

- 这批并不等于“当前 pose 一定错”；
- 它只说明：**这些图在最终 PNG 观感上，比普通皮肤更像“由多个相对分离的主体块组成”。**

---

## 5. 对 top 样本的补充目检

为了确认这套启发式不是纯噪音，我又补看了这 4 个高分样本的候选 pose：

- `351`：冒险休闲多纳尔
- `112`：女巫之光守望者
- `210`：顶点多纳尔
- `306`：骄傲父亲梅亨

补看方式仍是：

1. 用 `tmp/render-pose-review.mjs` 渲染 `current + top 候选 pose`
2. 对照候选 sheet 做肉眼复核

当前结论：

- `351`
  - detached 大剑在候选 pose 里几乎一直存在；
  - 更像这套资源本来就是“人物 + 外侧大剑”的展示结构，而不是默认 frame 选错。
- `112`
  - 候选 pose 只是轻微调整站姿；
  - 当前 detached 感更多来自主题造型本身，并没有看到压倒性的更优 frame。
- `210`
  - 玻璃罩、坐骑 / 特效、外侧锯齿状武器在多个候选 pose 里都存在；
  - 更像复杂主题包装，而不是当前 pose 的单点错误。
- `306`
  - 酒壶和蝙蝠一样在多候选 pose 里持续存在；
  - 当前高分主要是在提示“主题里有 detached 配件”，不是 pose 特有问题。

所以这一轮补看给出的更准确认识是：

- **alpha 审计能发现“哪些图有分离主体块”**
- 但它还不能单独回答“这些分离块是不是错误”

---

## 6. 这条新启发式的价值与局限

### 6.1 价值

它补上了尺寸审计不擅长抓的部分：

- detached 武器
- 漂浮 companion
- 复杂主题导致的多主体阅读感
- 某些“宽高不夸张，但视觉上不够整体”的样本

### 6.2 局限

当前噪音也很明确，主要来自两类：

1. **主题本来就有漂浮物**
   - 例如漂浮书、漂浮眼、漂浮饮料、玩具配件
2. **主题本来就是多主体包装**
   - 例如玻璃罩、特殊容器、坐骑 / companion 与角色共同构图

所以它不适合直接做：

- “分数高就自动写 override”

更适合做：

- “分数高 -> 进入下一轮人工目检池”

---

## 7. 现在更合理的下一步

如果下一轮还想继续系统扩样，当前最值得做的不是继续只看“当前 PNG 有几个 detached 连通域”，而是补到**候选 pose 的相对比较**：

1. 对同一个 skin 渲染 `current + 候选 pose`
2. 对每个 pose 都计算 alpha 连通域指标
3. 比较“候选 pose 是否明显减少 detached 区域 / 提高主体连贯性”
4. 只有当“候选明显更连贯”时，才把它升级成 override 候选

也就是说，下一步更应该做的是：

- **current-vs-candidate 的 delta 审计**

而不是继续只做 current-only 的 PNG 扫描。

---

## 8. 当前关联文件

- `scripts/data/champion-illustration-audit-config.mjs`
- `scripts/data/illustration-alpha-analysis.mjs`
- `scripts/audit-idle-champions-illustration-alpha-fragmentation.mjs`
- `tests/unit/data/illustrationAlphaAnalysis.test.mjs`
- `tmp/illustration-alpha-audit/report.json`
- `tmp/illustration-alpha-audit/index.html`
- `docs/research/data/skin-illustration-override-audit-research.md`
