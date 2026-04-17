# Idle Champions 官方图片资源大小与落地策略交接稿

- 交接时间：2026-04-15（Asia/Shanghai）
- 适用对象：后续专门处理图片/资源链路的线程
- 目标：把当前已经确认的“官方图片资源类型、尺寸、体积量级、解包方式、落地边界”一次讲清楚，避免后续重复摸索

## 1. 结论先行

### 当前已经确认的资源类型

官方 definitions 不只返回英雄头像线索，还能稳定定位这些资源：

- 英雄官方头像 `portrait`
- 英雄本体立绘 `base`
- 皮肤本体图 `skin base`
- 皮肤 large 图 `skin large`
- 皮肤 xl 图 `skin xl`
- 皮肤头像 `skin portrait`

字段链路已经确认可用：

- 英雄本体：
  - `hero_defines[].graphic_id`
  - `hero_defines[].portrait_graphic_id`
- 皮肤资源：
  - `hero_skin_defines[].details.base_graphic_id`
  - `hero_skin_defines[].details.large_graphic_id`
  - `hero_skin_defines[].details.xl_graphic_id`
  - `hero_skin_defines[].details.portrait_graphic_id`

再配合：

- `graphic_defines[].graphic`
- `graphic_defines[].v`

即可拼出官方 `mobile_assets` 地址。

## 2. 已确认的数量覆盖

### 可上阵英雄

截至 2026-04-13 的 definitions 快照：

- 可上阵英雄共 `161` 名
- `161 / 161` 都有 `graphic_id`
- `161 / 161` 都有 `portrait_graphic_id`

### 英雄皮肤

已核到：

- `672` 条 `hero_skin_defines`
- `672 / 672` 都带：
  - `base_graphic_id`
  - `large_graphic_id`
  - `xl_graphic_id`
  - `portrait_graphic_id`

这意味着：

- 资源引用链路是完整的
- 不是“少量英雄/少量皮肤有图”，而是整套基座普遍存在

## 3. 已确认的图片格式与解包方式

### 头像类：`Portraits/...`

头像类资源不是裸 PNG 文件，而是：

- 外层有一层包装头
- 当前确认 PNG 数据头通常从偏移 `24` 开始
- 需要先找到 PNG 头，再裁到 `IEND`

当前交付标记可记为：

- `delivery = wrapped-png`

### 立绘类：`Characters/...`

英雄本体图、皮肤 base / large / xl 不是直接 PNG，而是：

- 原始响应体是 zlib 压缩流
- 先 `inflate`
- 再从解压结果里找 PNG 头
- 再裁到 `IEND`

当前交付标记可记为：

- `delivery = zlib-png`

### 一个很重要的结论

不要用资源槽位名字直接推断真实尺寸。

例如当前样例里：

- `skin large` 是 `1024x1024`
- `skin xl` 反而是 `1024x512`

所以：

- `xl` 不一定比 `large` 像素更多
- 后续必须以“实际解包后的宽高”为准，不能只看命名

## 4. 已确认的尺寸结论

### 英雄头像

当前全量核到的英雄 portrait：

- 都是 `256x256 PNG`
- 没有在 `hero_defines` 里发现额外的小图 / 中图 / 大图 portrait 字段
- 当前没有发现英雄头像多尺寸体系

也就是说：

- 头像这条线目前就是单尺寸 `256x256`
- 前端适配应靠统一容器和缩放
- 不需要为头像额外做 `srcset` 或多尺寸分发

### 英雄立绘 / 皮肤图

目前已经确认“样例可稳定解出真实尺寸”，但还没有做全量尺寸审计。

当前只确认过样例：

- 英雄本体图：可解出 `1024x1024`
- 皮肤 base：可解出 `1024x1024`
- 皮肤 large：可解出 `1024x1024`
- 皮肤 xl：样例可解出 `1024x512`

注意：

- 这只是样例确认，不代表所有英雄/所有皮肤都完全同分辨率
- 后续需要单独做一轮“全量尺寸审计”

## 5. 已做的体积样本抽测

以下是 2026-04-15 对官方样例资源做的实测：

| 资源槽位 | 样例路径 | delivery | 传输体积 rawBytes | 解包后 PNG 体积 decodedPngBytes | 解包后尺寸 |
| --- | --- | --- | ---: | ---: | --- |
| 英雄头像 | `Portraits/Portrait_Bruenor` | `wrapped-png` | 8,990 B | 8,905 B | `256x256` |
| 英雄本体图 | `Characters/Hero_Bruenor` | `zlib-png` | 151,159 B | 65,760 B | `1024x1024` |
| 皮肤 base | `Characters/Hero_BruenorPirate` | `zlib-png` | 149,886 B | 67,854 B | `1024x1024` |
| 皮肤 large | `Characters/Hero_BruenorPirate_Large` | `zlib-png` | 144,310 B | 73,640 B | `1024x1024` |
| 皮肤 xl | `Characters/Hero_BruenorPirate_4xup` | `zlib-png` | 85,413 B | 67,023 B | `1024x512` |

### 这组样本说明什么

按当前样例看：

- 不是“几 MB”
- 更不是“几十 MB”
- 当前样例大多是几十 KB 到一百多 KB 量级
- 至少在样例层面，没有看到特别夸张的大图体积

### 但不能过度外推

目前还不能直接说：

- “所有皮肤 large/xl 都只有几十 KB”
- “所有官方大图都绝对不大”

因为：

- 还没做全量尺寸审计
- 还没做全量体积统计
- 只确认了样例量级

所以当前更准确的说法是：

- 样例层面未见 MB 级 / 几十 MB 级
- 全量结论仍需单独统计

## 6. 头像资源的一个特殊处理点

官方头像虽然是 `256x256`，但原始有效内容存在明显问题：

- 有效头像区域常常只在左上角
- 其余区域大面积透明
- 如果前端直接展示，视觉效果会变成：
  - 左上角一小块人物
  - 右下和大部分区域空掉

所以当前头像同步链路已经采用：

1. 拉原始 portrait
2. 剥包装头
3. 裁掉透明边
4. 再把有效内容居中回填到方形 PNG
5. 输出到本地版本化目录

这一步是必须保留的，不建议回退成“直接使用官方原 PNG”。

## 7. 当前仓库已经落地的策略

### 已经落本地的

当前只把英雄头像落本地：

- 目录：`public/data/v1/champion-portraits/`
- 用途：当前页面卡片、阵型槽位、摘要标签等高频 UI 直接消费
- 原因：
  - 体积小
  - 单尺寸稳定
  - 当前产品已经直接使用
  - 经过裁透明边 + 居中修复后，展示质量可控

### 当前只保留元数据、不落本地的

以下资源目前只保留远端元数据，不把二进制写进仓库：

- 英雄本体立绘
- 皮肤 base
- 皮肤 large
- 皮肤 xl
- 皮肤头像

原因：

- 数量很多
- 当前页面还不是刚需
- 还没做全量尺寸/体积审计
- 没必要在现阶段把大量远端二进制直接塞进 Git 仓库

### 当前元数据落点

- `public/data/v1/champion-visuals.json`

每个视觉资源槽位当前会保留：

- `graphicId`
- `sourceGraphic`
- `sourceVersion`
- `remotePath`
- `remoteUrl`
- `delivery`
- `uses`

这套字段已经足够支撑：

- 后续离线脚本抓取
- 代理层按需解包
- 页面实时请求
- 调试与错误回退展示

## 8. 当前浏览器直连的部署边界

2026-04-14 已确认：

- `master.idlechampions.com/~idledragons/mobile_assets/...`
- 当前响应头里未见 `Access-Control-Allow-Origin`

这意味着：

- Node 脚本 / 命令行 / 代理服务仍然可以抓
- 但部署在 `GitHub Pages` 这类纯静态站点上时
- 浏览器端直接跨域 `fetch(remoteUrl)` 再解包，不能当成稳定前提

所以当前对资源线程的边界建议是：

- 资源可解析性已经成立
- 但“浏览器生产环境直接拉官方远端”不可靠
- 如果后续要做页面级稳定预览，要么：
  - 做失败回退
  - 要么补独立代理 / 预解包发布链路
  - 要么继续只保留元数据，不做生产态直预览承诺

## 9. 建议交给资源线程的工作项

### 第一阶段：做全量审计，不急着全量落盘

建议先做全量审计脚本，输出结构化统计：

- 每个英雄本体图的宽高、`rawBytes`、`decodedPngBytes`
- 每个皮肤 `base / large / xl / portrait` 的宽高、`rawBytes`、`decodedPngBytes`
- 各槽位尺寸分布
- 各槽位体积分布
- 是否存在异常长宽比
- 是否存在异常大文件
- 是否存在无效 `graphicId` / 无法解包资源

建议产物：

- 一份 `JSON`
- 一份人类可读 `Markdown`
- 最好再带一份可导出的 `CSV`

### 第二阶段：给出本地化阈值建议

基于审计结果再决定：

- 哪些资源值得本地缓存
- 哪些只保留元数据
- 哪些需要代理
- 哪些可以预解包发布
- 哪些只在使用时临时请求

### 第三阶段：抽象稳定的资源策略

目标不是“把所有图都下载下来”，而是定义清楚：

- 当前 UI 高频资源
- 中频资源
- 低频资源
- 各自的获取方式和存储方式

建议大方向：

- 高频、小体积、现用资源：本地化
- 中低频、数量大、暂未直接消费资源：元数据优先
- 需要在线预览但浏览器跨域不稳的资源：后续走代理或预解包链路

## 10. 明确的非目标

以下事情当前不建议直接做：

- 不建议现在就把所有立绘和皮肤二进制全量拉进 Git 仓库
- 不建议在没有全量审计前就假设 `large / xl` 一定比 `base` 更大
- 不建议把浏览器直连官方远端当成生产稳定方案
- 不建议只看 `graphicId` 名称或槽位名称就推断分辨率
- 不建议回退头像的“裁透明边 + 居中”处理

## 11. 建议资源线程的验收标准

### 最低验收

- 能输出全量资源清单
- 能输出每个槽位的真实宽高
- 能输出每个槽位的 `rawBytes / decodedPngBytes`
- 能区分 `wrapped-png` 和 `zlib-png`
- 能给出尺寸分布和体积分布摘要

### 完整验收

- 能识别异常资源
- 能给出“适合本地化 / 适合元数据 / 适合代理”的建议分组
- 能产出一份可直接供产品/前端继续决策的汇总文档

## 12. 当前已知参考资料

仓库内已有文档：

- `docs/research/data/champion-portrait-asset-research.md`
- `docs/research/data/champion-visual-asset-research.md`

当前相关数据与脚本：

- `public/data/v1/champion-portraits/`
- `public/data/v1/champion-visuals.json`
- `scripts/sync-idle-champions-portraits.mjs`
- `scripts/data/champion-asset-helpers.mjs`
- `src/data/remoteGraphicAsset.ts`

## 13. 一句话交接结论

当前已经可以明确：

- 官方头像、立绘、皮肤资源链路都能定位
- 头像是单尺寸 `256x256`
- 立绘类资源当前样例多为 `1024x1024` 或 `1024x512`
- 样例体积目前看是几十 KB 到一百多 KB，不是几 MB / 几十 MB
- 但尚未做全量尺寸与体积审计
- 现阶段最稳妥策略仍然是：
  - 头像本地化
  - 大图先保留元数据
  - 后续按全量审计结果再决定是否批量落地或接代理
