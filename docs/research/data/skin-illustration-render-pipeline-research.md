# Idle Champions 皮肤立绘离线渲染管线落地说明

- 记录日期：2026-04-16
- 当前状态：本文基于仓库内已经落地的构建脚本、已生成的立绘产物和样例复核结果整理，现阶段有效。
- 目标：把“当前到底怎样从骨骼分件资源生成完整英雄/皮肤立绘”写清楚，并明确后续人工覆盖应该落在哪里。

> 如果你想先看为什么会出现碎片图、官方组装数据藏在哪里，请看 `docs/research/data/skin-illustration-assembly-research.md`；如果你想看为什么最终选了“构建期预合成”而不是“前端实时合成”，请看 `docs/research/data/skin-illustration-render-strategy-research.md`。

---

## 1. 当前已落地的最终结论

截至 2026-04-16，仓库已经把皮肤立绘主链路收敛到“构建期 Node 离线渲染”方案，页面运行时不再做骨骼分件合成。

当前真实链路是：

1. `scripts/build-idle-champions-data.mjs` 调用立绘同步脚本；
2. `scripts/sync-idle-champions-illustrations.mjs` 从 `public/data/v1/champion-visuals.json` 读取英雄本体 / 皮肤资源候选；
3. 遇到 `Characters/...` 的 `SkelAnim` 资源时，使用 `scripts/data/skelanim-codec.mjs` 解码二进制；
4. 使用 `scripts/data/skelanim-renderer.mjs` 选 pose 并把分件渲染为完整 PNG；
5. 将最终图片写入 `public/data/v1/champion-illustrations/heroes/*.png` 与 `public/data/v1/champion-illustrations/skins/*.png`；
6. 将审计元数据写入 `public/data/v1/champion-illustrations.json`；
7. 页面只消费已经生成好的本地静态图和清单元数据。

这意味着：

- 当前页面看到的立绘，不再是 atlas 碎片图；
- 前端浏览器、移动端、平板端都只承担普通图片展示，不承担骨骼合成计算；
- 视觉正确性的主要责任点已经集中到构建脚本，而不是页面组件。

---

## 2. 当前实现涉及的关键文件

### 2.1 解码与渲染

- `scripts/data/skelanim-codec.mjs`
  - 负责把 `type = 3 (SkelAnim)` 的 zlib 容器解压并解析为纹理、sequence、piece、frame。
  - 已确认 `SkeletalAnimationFrameData::.ctor` 参数顺序为 `(depth, rotation, scaleX, scaleY, x, y)`。

- `scripts/data/skelanim-renderer.mjs`
  - 负责计算 frame bounds、选择默认 pose、按 piece depth 排序并绘制最终 PNG。
  - 当前已经修正了最关键的坐标系问题：`y` 轴应按正方向向下渲染，不能反转。

- `scripts/data/skelanim.test.mjs`
  - 覆盖解码顺序、depth 叠放、`y` 轴方向、pose 选择规则。

### 2.2 资源同步与数据入口

- `scripts/sync-idle-champions-illustrations.mjs`
  - 负责候选槽位选择、远端资源拉取、`SkelAnim` 渲染或普通 PNG 解包、最终产物写盘。

- `scripts/build-idle-champions-data.mjs`
  - 统一数据流水线入口，负责把立绘同步纳入 `npm run data:official`。

### 2.3 页面消费合同

- `src/domain/types.ts`
  - 定义 `ChampionIllustration` 与 `ChampionIllustrationRender` 数据结构。

- `public/data/v1/champion-illustrations.json`
  - 页面最终消费的立绘清单，同时保留 `render` 审计字段。

---

## 3. 当前离线渲染规则

### 3.1 资源识别规则

当前脚本把以下资源视为需要骨骼合成的候选：

- `remotePath` 包含 `/Characters/`
- 或由 `champion-visuals.json` 指向的英雄本体 / 皮肤 `base`、`large`、`xl` 资源

对于这类资源：

- 不再把“解包后的一张 PNG”当成最终立绘；
- 必须进一步走 `SkelAnim` 解码 + pose 渲染流程。

### 3.2 渲染矩阵规则

当前渲染器已经与样例核对后收敛为以下规则：

1. 每个 piece 使用自身 `sourceX / sourceY / sourceWidth / sourceHeight` 从 atlas 中裁切；
2. 使用 `centerX / centerY` 作为 pivot；
3. 平移使用 `frame.x` 与 `frame.y`；
4. 旋转使用 `-frame.rotation`；
5. 缩放使用 `frame.scaleX / frame.scaleY`；
6. `y` 轴按正方向向下绘制；
7. 所有可见 piece 按 `depth` 升序绘制。

这条规则修正了之前“人物倒置、看起来不像人”的核心问题。

### 3.3 画布边界规则

当前边界计算方式：

1. 先遍历当前 frame 的全部可见 piece；
2. 按 piece 的四个角经过 transform 后的坐标，计算 `minX / minY / maxX / maxY`；
3. 用这个 bounds 创建最小可容纳画布；
4. 最终输出自动裁掉透明边。

因此当前生成出的立绘尺寸不是固定的 atlas 尺寸，而是“内容实际边界”的结果。

---

## 4. 当前 pose 选择规则

### 4.1 sequence / frame 的默认选择逻辑

当前默认逻辑不再使用“挑面积最大的一帧”那套启发式，而是更保守的规则：

1. 先按 `preferredSequenceIndexes` 给出的顺序尝试；
2. 如果没有显式优先序，则按资源内 sequence 的原始顺序尝试；
3. 对某个 sequence，优先按 `preferredFrameIndexes` 尝试；
4. 如果没有显式 frame 优先序，则按 `0 -> 1 -> 2 ...` 的顺序尝试；
5. 选中“第一个可正常渲染”的 pose 作为默认展示图。

当前这样做的原因很直接：

- 仓库已核到的英雄本体与大部分皮肤，sequence `0` 的 frame `0` 通常就是最接近游戏静态展示的 idle pose；
- 之前用“最大面积 / 最大高度 / 静态 sequence 优先”的启发式，会把某些 ultimate / 特效 / 变体动作误判为主立绘。

### 4.2 `sequence_override` 的当前用法

当前代码仍会读取 `graphic_defines.export_params.sequence_override`，并转换为 `preferredSequenceIndexes`。

但截至这轮修正后的样例核对，已有一个很明确的经验结论：

- `sequence_override` 只能当作“尝试顺序信号”，不能直接理解成“页面主立绘一定必须选它”。

所以当前代码行为是：

- 优先按 `sequence_override` 给的顺序尝试；
- 如果这些 sequence 不合适或不可渲染，仍会继续回退到原始 sequence 顺序；
- 不再把 `sequence_override` 当成绝对唯一答案。

### 4.3 slot 选择规则

当前皮肤候选槽位优先级已收敛为：

- `xl > large > base`

但这个优先级只在“姿态已经正确”的前提下用于挑选更高清资源。

换句话说，当前比较顺序是：

1. 先比较 slot 优先级；
2. 再比较是否为静态 pose；
3. 再比较像素面积与高度；
4. 如果这些都一样，则视为同等候选。

因为 `base / large / xl` 常常是同一 pose 的不同尺度版本，当前更合理的策略是优先更高清的同姿态源资源。

---

## 5. 当前页面消费到的审计字段

`public/data/v1/champion-illustrations.json` 里的每条记录，当前都会附带：

- `sourceSlot`
- `sourceGraphicId`
- `sourceGraphic`
- `sourceVersion`
- `manualOverride`
- `render.pipeline`
- `render.sequenceIndex`
- `render.sequenceLength`
- `render.isStaticPose`
- `render.frameIndex`
- `render.visiblePieceCount`
- `render.bounds`

这些字段的意义不是让前端重新渲染，而是为了：

- 排查某张图到底来自哪个 graphic；
- 排查默认选择的是哪个 sequence / frame；
- 排查某张图是否命中了 `skinId / graphicId / championId` 人工覆盖；
- 判断异常图是否因为 sequence、frame 还是 slot 选择错误；
- 为后续人工覆盖提供最小必要上下文。

---

## 6. 本轮已复核的样例

本轮至少复核了这些样例：

- `332 = Modron BBEG`
- `416 = Plushie Evandra`
- `344 = Venture Casual K'thriss`
- `417 = Plushie Nixie`
- `297 = Witchlight Nixie`
- 英雄本体：`124 Evandra`、`125 BBEG`、`38 K'thriss`、`123 Nixie`、`1 Bruenor`

当前复核结论：

- `332` 和 `416` 已从“明显不对 / 不像人”修正为正常完整立绘；
- 额外抽样的 `344`、`417`、`297` 也能正常显示为完整角色；
- 当前规则已经足够支撑全量构建，但后续仍应保留人工覆盖能力，因为并不能证明 `833` 张图全都天然适配同一套规则。

---

## 7. 当前人工覆盖层与后续扩展

### 7.1 当前最合适的覆盖层位置

截至 2026-04-16，仓库已经落地了第一版人工覆盖层，位置就是：

- `scripts/data/champion-illustration-overrides.json`
- `scripts/data/champion-illustration-overrides.mjs`
- `scripts/sync-idle-champions-illustrations.mjs` 的候选选择阶段

原因：

- `skelanim-renderer.mjs` 当前已经支持 `preferredSequenceIndexes` 和 `preferredFrameIndexes`；
- 覆盖层只需要在调用渲染器前，把特定皮肤或资源的首选 sequence / frame / slot 注入进去；
- 没必要把“业务级例外规则”写死到底层矩阵或解码逻辑里。
- 当前覆盖文件已经支持按 `skinId / graphicId / championId` 匹配，并在 `champion-illustrations.json` 里输出 `manualOverride` 审计字段。

### 7.2 推荐的覆盖键

优先级建议如下：

1. `skinId`
   - 适合“某个皮肤展示 pose 特殊”的场景；
2. `graphicId`
   - 适合“多个地方共用同一个 graphic 资源”的场景；
3. `championId`
   - 只适合做兜底，不适合覆盖具体皮肤细节。

### 7.3 当前首版已支持的覆盖字段

当前 `scripts/data/champion-illustration-overrides.json` 已支持：

- `skinId`
- `graphicId`
- `championId`
- `slot`
- `preferredSequenceIndexes`
- `preferredFrameIndexes`
- `notes`

示例：

```json
{
  "skinId": "332",
  "slot": "xl",
  "preferredSequenceIndexes": [0],
  "preferredFrameIndexes": [0]
}
```

当前实现约束：

- `sequence / frame` 索引使用 `0` 基；
- `slot` 是“优先尝试该候选槽位”，不是绝对只允许这一槽；
- `skinId > graphicId > championId`，低优先级覆盖只做兜底，高优先级同字段可覆盖低优先级；
- 如果某个覆盖目标候选实际不可解码，脚本仍会回退到其他可用候选，避免整张图构建失败。

如果后续出现更复杂的例外，再考虑扩展：

- `forceSequenceIndex`
- `forceFrameIndex`
- `disabledSlots`
- `notes`

但当前不建议一开始就把覆盖系统做得很复杂。

### 7.4 当前不建议覆盖的层

不要把人工覆盖优先落在这些地方：

- `scripts/data/skelanim-codec.mjs`
  - 这里是格式解析层，应该保持只做“按协议读数据”；
- `scripts/data/skelanim-renderer.mjs`
  - 这里是通用渲染层，应该保持只做“按给定 pose 渲染”；
- 页面组件
  - 页面不应重新承担 pose 决策或 slot 决策。

---

## 8. 当前验证命令

### 8.1 单元测试

```bash
node --test scripts/data/skelanim.test.mjs scripts/sync-idle-champions-illustrations.test.mjs
```

### 8.2 组件测试

```bash
npm run test:component -- tests/component/illustrationsPage.test.tsx tests/component/championDetailPage.test.tsx
```

### 8.3 小范围样例渲染

```bash
node scripts/sync-idle-champions-illustrations.mjs \
  --input tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json \
  --visualsFile public/data/v1/champion-visuals.json \
  --outputDir tmp/render-validation \
  --currentVersion v1 \
  --championIds 124,125 \
  --skinIds 332,416 \
  --concurrency 2
```

### 8.4 全量重建

```bash
node scripts/sync-idle-champions-illustrations.mjs \
  --input tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json \
  --visualsFile public/data/v1/champion-visuals.json \
  --outputDir public/data/v1 \
  --currentVersion v1 \
  --concurrency 6
```

---

## 9. 当前仍然保留的风险

- 当前 pose 规则已经明显优于之前的错误启发式，但本质上仍是“默认使用首个可渲染 idle pose”的工程规则，不是来自官方明文文档。
- 某些特殊皮肤如果把商店展示图设计成非 `sequence 0 / frame 0`，未来仍可能需要人工覆盖。
- 目前全量产物已经重建，但若官方后续调整 `SkelAnim` 导出格式、sequence 排列或 `export_params` 语义，仍需要重新验证。

所以当前最稳妥的结论是：

- 主链路已经可以稳定生成正确立绘；
- 但应继续保留“可按 skinId / graphicId 做局部人工覆盖”的演进空间。

---

## 10. 本次记录关联文件

- `scripts/build-idle-champions-data.mjs`
- `scripts/sync-idle-champions-illustrations.mjs`
- `scripts/data/skelanim-codec.mjs`
- `scripts/data/skelanim-renderer.mjs`
- `scripts/data/skelanim.test.mjs`
- `src/domain/types.ts`
- `public/data/v1/champion-illustrations.json`
- `docs/research/data/skin-illustration-assembly-research.md`
- `docs/research/data/skin-illustration-render-strategy-research.md`
- `docs/modules/champions/champion-illustration-page-design.md`
