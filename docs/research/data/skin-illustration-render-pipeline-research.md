# Idle Champions 皮肤立绘离线渲染管线落地说明

- 日期：2026-04-16
- 状态：基于仓库已落地脚本、现有产物和样例复核结果，当前仍有效。
- 目标：写清“当前怎样从 SkelAnim 分件资源生成完整英雄 / 皮肤立绘”，并明确人工覆盖应落在哪里。
- 相关文档：为什么会碎见 `docs/research/data/skin-illustration-assembly-research.md`；为什么主路线选构建期预合成见 `docs/research/data/skin-illustration-render-strategy-research.md`。

## 当前主链路

截至 2026-04-16，仓库已把皮肤立绘主链路收敛到“构建期 Node 离线渲染”，页面运行时不再做骨骼分件合成：

1. `scripts/build-idle-champions-data.mjs` 调用立绘同步脚本
2. `scripts/sync-idle-champions-illustrations.mjs` 从 `public/data/v1/champion-visuals.json` 读取英雄本体 / 皮肤候选
3. 遇到 `Characters/...` 的 `SkelAnim` 资源时，用 `scripts/data/skelanim-codec.mjs` 解码
4. 用 `scripts/data/skelanim-renderer.mjs` 选择 pose 并渲染完整 PNG
5. 输出到 `public/data/v1/champion-illustrations/heroes/*.png` 与 `public/data/v1/champion-illustrations/skins/*.png`
6. 同时写出 `public/data/v1/champion-illustrations.json`
7. 页面只消费本地静态图与审计元数据

结果：页面不再显示 atlas 碎片图；浏览器只承担普通图片展示；视觉正确性的责任点集中到构建脚本。

## 关键文件

### 解码与渲染

- `scripts/data/skelanim-codec.mjs`：解压 `type = 3 (SkelAnim)` zlib 容器，解析纹理、sequence、piece、frame；已确认 `SkeletalAnimationFrameData::.ctor` 参数顺序为 `(depth, rotation, scaleX, scaleY, x, y)`。
- `scripts/data/skelanim-renderer.mjs`：计算 frame bounds、选择默认 pose、按 depth 排序并绘制最终 PNG；已修正关键坐标系问题：`y` 轴必须向下为正，不能反转。
- `scripts/data/skelanim.test.mjs`：覆盖解码顺序、depth 叠放、`y` 轴方向和 pose 选择规则。

### 资源同步与数据入口

- `scripts/sync-idle-champions-illustrations.mjs`：候选槽位选择、远端拉取、SkelAnim 渲染或普通 PNG 解包、最终写盘。
- `scripts/build-idle-champions-data.mjs`：统一数据流水线入口，对应 `npm run data:official`。

### 页面消费合同

- `src/domain/types.ts`：定义 `ChampionIllustration` 与 `ChampionIllustrationRender`。
- `public/data/v1/champion-illustrations.json`：页面最终消费的立绘清单，同时保留 `render` 审计字段。

## 当前离线渲染规则

### 资源识别

以下资源视为需要骨骼合成：

- `remotePath` 包含 `/Characters/`
- 或 `champion-visuals.json` 指向的英雄本体 / 皮肤 `base`、`large`、`xl`

对这类资源，不再把“解包出一张 PNG”当最终立绘；必须继续走 SkelAnim 解码 + pose 渲染。

### 渲染矩阵

当前已收敛为以下规则：

1. 每个 piece 用自身 `sourceX / sourceY / sourceWidth / sourceHeight` 从 atlas 裁切
2. 使用 `centerX / centerY` 作为 pivot
3. 平移用 `frame.x / frame.y`
4. 旋转用 `-frame.rotation`
5. 缩放用 `frame.scaleX / frame.scaleY`
6. `y` 轴向下为正
7. 所有可见 piece 按 `depth` 升序绘制

这条规则修正了早期“人物倒置、看起来不像人”的问题。

### 画布边界

- 遍历当前 frame 的全部可见 piece
- 把四个角经过 transform 后的坐标汇总为 `minX / minY / maxX / maxY`
- 以此创建最小可容纳画布
- 输出时自动裁掉透明边

因此当前尺寸不是 atlas 尺寸，而是内容实际边界。

## pose 与 slot 选择

### 默认 pose

当前默认逻辑不再用“面积最大的一帧”，而是：

1. 先按 `preferredSequenceIndexes` 尝试
2. 否则按资源内 sequence 原始顺序尝试
3. 对每个 sequence，先按 `preferredFrameIndexes` 尝试
4. 否则按 `0 -> 1 -> 2 ...` 顺序尝试
5. 取第一个可正常渲染的 pose 作为默认展示图

原因：对大部分英雄本体和皮肤而言，`sequence 0 / frame 0` 通常最接近游戏静态展示；面积类启发式会把某些 ultimate / 特效动作误判成主立绘。

### `sequence_override`

- 仍会读取 `graphic_defines.export_params.sequence_override`
- 但它只作为“尝试顺序信号”，不是绝对答案
- 若这些 sequence 不合适或不可渲染，仍会回退到原始顺序

### slot 选择

当前皮肤候选优先级是 `xl > large > base`，但这个优先级只在姿态正确前提下用于选更高清资源。比较顺序是：

1. 先比较 slot 优先级
2. 再比较是否为静态 pose
3. 再比较像素面积与高度
4. 再视为同等候选

## 页面审计字段

`public/data/v1/champion-illustrations.json` 当前会保留：

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

这些字段用于排查来源、确认默认 `sequence / frame`、判断是否命中 `skinId / graphicId / championId` 覆盖，以及为后续人工调参提供最小上下文；前端不依赖它们重新渲染。

## 已复核样例

本轮至少复核了：`332` Modron BBEG、`416` Plushie Evandra、`344` Venture Casual K'thriss、`417` Plushie Nixie、`297` Witchlight Nixie，以及英雄本体 `124` Evandra、`125` BBEG、`38` K'thriss、`123` Nixie、`1` Bruenor。

当前结论：`332` 与 `416` 已从明显错误修正为正常完整立绘；`344`、`417`、`297` 也能正常显示；规则已足以支撑全量构建，但仍需保留人工覆盖能力，因为这不代表 `833` 张图天然都适配同一套默认规则。

## 人工覆盖层

### 当前最佳落点

截至 2026-04-16，覆盖层已经落在：

- `scripts/data/champion-illustration-overrides.json`
- `scripts/data/champion-illustration-overrides.mjs`
- `scripts/sync-idle-champions-illustrations.mjs` 的候选选择阶段

原因：`skelanim-renderer.mjs` 已支持 `preferredSequenceIndexes` 与 `preferredFrameIndexes`；覆盖层只需在调用渲染器前注入首选 `sequence / frame / slot`，没必要把业务级例外写死到底层解码或矩阵逻辑里。

### 推荐覆盖键与字段

优先级：`skinId > graphicId > championId`；`championId` 只适合兜底。

当前已支持字段：

- `skinId`
- `graphicId`
- `championId`
- `slot`
- `preferredSequenceIndexes`
- `preferredFrameIndexes`
- `notes`

约束：

- `sequence / frame` 索引用 `0` 基
- `slot` 是优先尝试的候选槽位，不是绝对强制
- 若目标候选不可解码，脚本仍会回退到其他可用候选，避免整张图构建失败

当前不建议把人工覆盖写进：`scripts/data/skelanim-codec.mjs`、`scripts/data/skelanim-renderer.mjs` 或页面组件。

## 验证命令

### 单元测试

```bash
node --test scripts/data/skelanim.test.mjs scripts/sync-idle-champions-illustrations.test.mjs
```

### 组件测试

```bash
npm run test:component -- tests/component/illustrationsPage.test.tsx tests/component/championDetailPage.test.tsx
```

### 小范围样例渲染

脚本已支持在传入 `--skinIds` 或 `--championIds` 时做增量输出：不会清空整个 `champion-illustrations/` 目录，只重建选中的对象。

```bash
node scripts/sync-idle-champions-illustrations.mjs   --input tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json   --visualsFile public/data/v1/champion-visuals.json   --outputDir tmp/render-validation   --currentVersion v1   --championIds 124,125   --skinIds 332,416   --concurrency 2
```

### 全量重建

```bash
node scripts/sync-idle-champions-illustrations.mjs   --input tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json   --visualsFile public/data/v1/champion-visuals.json   --outputDir public/data/v1   --currentVersion v1   --concurrency 6
```

## 当前剩余风险

- 默认 pose 规则本质上仍是工程规则，不是官方明文文档。
- 某些特殊皮肤若商店展示姿态不是 `sequence 0 / frame 0`，未来仍可能需要人工覆盖。
- 若官方后续调整 SkelAnim 导出格式、sequence 排列或 `export_params` 语义，仍需重新验证。

因此当前最稳妥的结论是：主链路已足够稳定；但必须继续保留按 `skinId / graphicId` 局部覆盖的空间。

## 关联文件

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
