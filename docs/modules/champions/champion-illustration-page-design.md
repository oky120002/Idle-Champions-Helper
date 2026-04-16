# 英雄立绘页设计稿

- 设计日期：2026-04-15
- 模块归属：`docs/modules/champions/`
- 目标：在“只用 GitHub Pages、零额外服务、零额外成本”的前提下，让立绘页面能够稳定显示全部英雄本体立绘与全部皮肤立绘。
- 当前结论：立绘页的主方案不能继续依赖浏览器运行时直连官方 `mobile_assets`。最优方案是“构建期全量抓取并解包官方立绘，发布为站内静态衍生图，运行时只读本地资源”。

> 2026-04-16 补充说明：这里的“解包官方立绘”需要进一步细化。最新调研已确认，很多英雄/皮肤主立绘资源本质上是 `graphic_defines.type = 3 (SkelAnim)` 的分件动画资源，所以构建期主链路应理解为“解压二进制 + 解析 sequence/frame + 合成完整静态 pose”，而不是只把 `Characters/...` 裁成 PNG atlas。关于“为什么会碎”和底层资源证据，详见 `docs/research/data/skin-illustration-assembly-research.md`；关于仓库当前已经落地的实际渲染管线、坐标系修正、默认 pose / slot 规则与后续人工覆盖建议，详见 `docs/research/data/skin-illustration-render-pipeline-research.md`。
>
> 现状对齐说明：仓库当前首版落地产物已简化为 `public/data/v1/champion-illustrations/heroes/*.png` 与 `public/data/v1/champion-illustrations/skins/*.png`；本文后续关于 `thumbs / display` 与 `webp` 的目录、格式和分档策略，保留为后续可演进的页面资源设计，不代表 2026-04-16 的现状实现。

---

## 1. 结论先行

如果产品目标是“立绘页面正常显示所有立绘”，那么在当前约束下，唯一应该作为主路径的方案是：

1. 在数据构建阶段离线抓取官方立绘资源。
2. 在 Node 脚本里完成 `wrapped-png / zlib-png` 解包、`SkelAnim` 解析、静态 pose 合成、透明边裁切、尺寸审计与页面用衍生图生成。
3. 把页面真正消费的图片发布到站内静态目录。
4. 页面运行时只读取 `GitHub Pages` 上的本地静态图片与清单文件，不再依赖浏览器跨域抓官方资源。

这里的“全部立绘”，指页面需要稳定展示的全部可视立绘单元：

- `161` 个英雄本体立绘
- `672` 个皮肤立绘

合计 `833` 个页面展示单元。

不把“所有技术资源槽位”都直接暴露给页面：

- 英雄头像
- 皮肤头像
- 皮肤 `base / large / xl` 三套原始槽位

这些仍可保留在资源基座里，但立绘页不需要把 `3010` 个技术槽位全部原样发布出来。

---

## 2. 为什么这是最优方案

### 2.1 浏览器运行时直连官方资源不可靠

仓库现有调研已经确认：

- `Characters/...` 立绘资源需要先做 `zlib inflate`，但对很多英雄/皮肤主立绘来说，拿到的只是分件动画图集，还需要额外的 `SkelAnim` 组装步骤。
- 官方 `mobile_assets` 当前未见稳定的 `Access-Control-Allow-Origin`。

这意味着：

- Node 脚本可以抓。
- `GitHub Pages` 上的纯静态前端，不能把“浏览器跨域下载官方资源再现场解包”当成生产稳定前提。

所以此前那类“浏览器端直连官方资源并现场解包”的运行时能力，只适合：

- 调试
- 研究
- 本地特殊环境验证

不适合作为“立绘页正常显示全部立绘”的主交付路径。

### 2.2 GitHub Pages 的限制决定了要做“衍生图”，而不是“全量原样搬运”

2026-04-15 查证的 GitHub 官方文档说明：

- GitHub Pages 是静态站点托管服务，会直接发布仓库里的静态文件或构建产物。
- GitHub Pages 发布后的网站不能超过 `1 GB`。
- GitHub Pages 源仓库建议控制在 `1 GB` 内。
- GitHub Pages 站点每月有 `100 GB` 软带宽上限。

来源：

- [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

因此最优策略不是：

- 页面实时抓官方远端
- 也不是把所有原始技术槽位和原始大图一股脑塞进仓库

而是：

- 只为“页面要展示的立绘单元”生成一套规范化衍生图
- 继续保留原始远端元数据，供后续调试和再生成使用

### 2.3 以“页面展示单元”而不是“技术槽位”建模，体积更可控

当前 `public/data/v1/champion-visuals.json` 可推导出：

- 英雄本体立绘：`161`
- 皮肤数：`672`
- 立绘页真正需要稳定展示的页面单元：`833`
- 如果按技术槽位全量算，总资源会到 `3010`

所以立绘页最优数据口径应当是：

- 一个英雄本体，对应一张页面主立绘
- 一套皮肤，对应一张页面主立绘

而不是让页面理解 `base / large / xl / portrait` 这些底层资源槽位。

---

## 3. 页面范围与非目标

### 3.1 页面范围

立绘页负责稳定展示：

- 全部英雄本体立绘
- 全部皮肤立绘

并支持：

- 中文 / 英文名称
- 按英雄、seat、皮肤、联动队伍等条件筛选
- 打开单张立绘的大图查看

### 3.2 非目标

当前不把以下内容作为立绘页主职责：

- 运行时解析官方远端资源
- 展示皮肤头像资源
- 把 `base / large / xl` 全部原样公开给用户
- 在首屏一次性下载全部大图原件

“正常显示所有立绘”不等于“首屏同时加载全部原始大图”。

---

## 4. 数据与目录设计

### 4.1 保留现有基座

继续保留：

- `public/data/<version>/champion-visuals.json`

用途：

- 作为官方资源定位基座
- 保留 `graphicId / sourceGraphic / sourceVersion / remoteUrl / delivery`
- 支撑后续重新抓取、重新生成和问题排查

### 4.2 新增页面消费清单

新增：

- `public/data/<version>/champion-illustrations.json`

建议字段：

```ts
type ChampionIllustrationEntry = {
  id: string
  championId: string
  skinId: string | null
  kind: 'hero-base' | 'skin'
  championName: LocalizedText
  illustrationName: LocalizedText
  seat: number
  sourceSlot: 'base' | 'large' | 'xl'
  sourceGraphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  image: {
    thumbPath: string
    displayPath: string
    width: number
    height: number
    format: 'webp'
  }
}
```

说明：

- `champion-visuals.json` 负责“官方资源怎么定位”
- `champion-illustrations.json` 负责“页面最终该怎么展示”

两者职责不要混在一起。

### 4.3 新增图片目录

建议新增：

- `public/data/<version>/champion-illustrations/thumbs/`
- `public/data/<version>/champion-illustrations/display/`

命名建议：

- 英雄本体：`heroes/<championId>.webp`
- 皮肤立绘：`skins/<skinId>.webp`

说明：

- `thumbs/` 用于列表页、卡片墙、筛选结果
- `display/` 用于抽屉、大图浮层或详情区域
- 不把页面直接指向原始 PNG

---

## 5. 构建期资源流水线

### 5.1 新增脚本职责

建议新增：

- `scripts/sync-idle-champions-illustrations.mjs`

它负责：

1. 读取英文 definitions 快照与 `champion-visuals.json`
2. 枚举全部英雄本体与皮肤立绘单元
3. 下载候选官方图片资源
4. 按 `delivery` 解包成 PNG / atlas，并在 `SkelAnim` 场景下继续解析 piece 与帧数据
5. 渲染候选静态 pose，计算真实尺寸、透明边范围和内容边界
6. 选出页面主立绘来源
7. 生成 `thumb / display` 两档页面衍生图
8. 写出 `champion-illustrations.json`
9. 输出体积与尺寸审计摘要

### 5.2 与统一数据命令的关系

现有统一入口是：

- `npm run data:official`

建议把立绘同步接入这条流水线，最终统一为：

1. `data:fetch`
2. `data:normalize`
3. `data:portraits`
4. `data:illustrations`

也就是说，后续用户仍然只需要执行：

```bash
npm run data:official
```

就能把页面所需的官方基座数据和立绘衍生图一并准备好。

### 5.3 源图选择策略

不要根据槽位名字直接判断用哪张图。

皮肤资源当前至少有：

- `base`
- `large`
- `xl`

但现有调研已经确认：

- `xl` 不一定比 `large` 更适合页面展示
- 真实宽高必须以最终渲染结果为准，而不只是 atlas 尺寸

因此建议的选择规则是：

1. 对候选槽位全部解包
2. 对 `SkelAnim` 候选先渲染出静态 pose
3. 计算真实宽高
4. 计算非透明内容区域的高度和面积
5. 优先选择“内容高度更高”的候选图
6. 若接近，再比较内容面积与总像素

这样比“固定优先 large”更稳。

### 5.4 图片处理建议

建议在 Node 侧完成：

- 去包装头 / zlib 解压
- 裁透明边
- 保留透明背景
- 输出 `WebP`

原因：

- `WebP` 更适合 GitHub Pages 的静态体积预算
- 透明背景可以保留角色立绘边缘质量
- 页面不需要继续做任何二进制处理

技术实现上建议引入开源依赖 `sharp`，不要把编码压缩逻辑放到浏览器运行时。

---

## 6. 页面运行时策略

### 6.1 页面只读本地资源

立绘页正式运行时只依赖：

- `public/data/<version>/champion-illustrations.json`
- `public/data/<version>/champion-illustrations/thumbs/...`
- `public/data/<version>/champion-illustrations/display/...`

路径拼接仍然必须基于：

- `import.meta.env.BASE_URL`

以确保 `GitHub Pages Project Site` 下路径稳定。

### 6.2 列表与大图分离

推荐交互：

1. 列表页默认加载 `thumb`
2. 用户点开单张立绘时再加载对应 `display`
3. 所有图片开启 `loading="lazy"`

这样可以同时满足：

- 页面能看到全部立绘入口
- 首屏不一次性拉全部较大图片
- `GitHub Pages` 带宽压力更可控

### 6.3 现有运行时远端解包能力的定位

当前这些能力里，仍适合保留的只有：

- `src/components/ChampionVisualWorkbench.tsx`

后续建议改成：

- 调试工具
- 研究工作台

不再承担正式立绘页的主展示职责。

---

## 7. GitHub Pages 体积控制策略

### 7.1 设计原则

由于 GitHub 官方明确给出了：

- 发布站点 `<= 1 GB`
- 源仓库建议 `<= 1 GB`

所以立绘方案必须内建体积守门逻辑。

### 7.2 建议的控制方式

建议至少做三道控制：

1. 只发布页面真正消费的 `833` 个展示单元，不发布全部 `3010` 个技术槽位原图。
2. 页面用图统一走衍生图目录，不直接引用原始 PNG。
3. 在脚本里输出总体积报告，并在接近上限时直接失败。

建议阈值：

- 站点构建产物接近 `850 MB` 时直接失败
- 立绘资源目录单独输出体积报告，作为发布前必看项

这里的 `850 MB` 是保守工程阈值，不是 GitHub 官方硬限制；它的目的，是给后续其他公共数据和页面资源留下安全余量。

### 7.3 仓库历史控制

因为当前项目没有历史包袱，图片二进制不应长期累积多代版本。

建议：

- 立绘衍生图只保留当前发布版本
- 切换到新数据版本时，允许清理旧版本立绘二进制
- 结构化清单继续保留版本号语义

这样可以避免仓库历史和工作树不断膨胀。

---

## 8. 不选的方案

### 8.1 方案 A：页面运行时直连官方 `mobile_assets`

不选原因：

- 官方当前未见稳定 CORS 允许头
- `GitHub Pages` 没有服务端代理
- 浏览器现场解包会把生产可用性押在外部跨域策略上

这个方案可以保留给调试台，但不能作为正式页面主方案。

### 8.2 方案 B：把所有原始技术槽位图片都发布到站内

不选原因：

- 页面不需要 `3010` 个原始技术槽位
- 仓库和站点体积都会被快速放大
- `base / large / xl` 里会有明显重复价值

### 8.3 方案 C：新增 CDN、对象存储、代理或付费图床

不选原因：

- 违反当前“只用 GitHub Pages、零额外成本”的前提

---

## 9. 实施拆分建议

### 9.1 第一阶段：资源脚本

- 新增立绘同步脚本
- 生成页面衍生图与展示清单
- 把它接进 `npm run data:official`

### 9.2 第二阶段：页面接入

- 新增独立立绘页
- 列表读 `thumb`
- 详情抽屉读 `display`
- 支持中英名称与筛选

### 9.3 第三阶段：收尾与回退策略

- 把当前 `ChampionVisualWorkbench` 降级为调试入口
- 页面主链路不再依赖远端运行时解包
- 加入体积审计与构建失败阈值

---

## 10. 验收标准

立绘页方案完成后，至少要满足：

1. 在线 `GitHub Pages` 环境下，不依赖官方远端跨域读取，也能稳定展示全部英雄本体立绘和全部皮肤立绘。
2. 页面刷新、切语言、切筛选条件时，不会退回到“只显示 remote url / graphic id”的调试态。
3. `npm run data:official` 一次执行后，可以产出页面所需的全部立绘静态资源。
4. 页面路径、资源路径都能在 `GitHub Pages Project Site` 下正确工作。
5. 构建流程能输出立绘资源总量与体积摘要，并在接近上限时阻断发布。

---

## 11. 参考资料

- `docs/research/data/champion-portrait-asset-research.md`
- `docs/research/data/champion-visual-asset-research.md`
- `docs/research/data/champion-image-asset-sizing-research.md`
- `public/data/v1/champion-visuals.json`
- `src/components/ChampionVisualWorkbench.tsx`
- [GitHub Pages: What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
