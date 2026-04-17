# Idle Champions 官方图片资源大小与落地策略交接稿

- 日期：2026-04-15
- 适用对象：后续处理图片 / 资源链路的线程
- 目标：交接当前已确认的资源类型、数量、transport、样例尺寸、样例体积和当前仓库落地边界
- 配套文档：资源引用链路看 `docs/research/data/champion-visual-asset-research.md`；SkelAnim 组装与当前主链路看 skin illustration 系列文档

## 结论

- 官方 definitions 能稳定定位：英雄头像 `portrait`、英雄本体立绘 `base`、皮肤 `base / large / xl / portrait`
- 资源引用链路已确认可用：
  - 英雄：`hero_defines[].graphic_id`、`hero_defines[].portrait_graphic_id`
  - 皮肤：`hero_skin_defines[].details.base_graphic_id / large_graphic_id / xl_graphic_id / portrait_graphic_id`
- 样例确认：`xl` 不一定比 `large` 像素更多，真实尺寸必须以实际解包结果为准
- 当前样例层面未见 MB 级 / 几十 MB 级的大文件，但还没有完成全量尺寸与体积统计
- 当前仓库只把头像落本地；其余大图主要保留元数据或由后续离线渲染链路生成站内衍生图

## 已确认的数量

- 可上阵英雄：`161` 名；`161 / 161` 都有 `graphic_id` 与 `portrait_graphic_id`
- 皮肤：`672` 条；`672 / 672` 都有 `base / large / xl / portrait` 四类 graphic 引用

## transport 与解包方式

| 资源类型 | 路径模式 | 当前 transport | 说明 |
| --- | --- | --- | --- |
| 英雄 / 皮肤头像 | `Portraits/...` | `wrapped-png` | 外层带包装头，PNG 头通常从偏移 24 开始 |
| 英雄 / 皮肤立绘 | `Characters/...` | `zlib-png` | 原始响应是 zlib 流；inflate 后可找到 PNG 头 |

注意：立绘类后续已进一步确认很多其实是 `SkelAnim` 分件资源；“inflate 后能找到 PNG”只说明能解出 atlas 纹理，不代表就是最终可展示成图。

## 样例尺寸与体积

| 资源槽位 | 样例路径 | rawBytes | decodedPngBytes | 解包后尺寸 |
| --- | --- | ---: | ---: | --- |
| 英雄头像 | `Portraits/Portrait_Bruenor` | 8,990 B | 8,905 B | `256x256` |
| 英雄本体图 | `Characters/Hero_Bruenor` | 151,159 B | 65,760 B | `1024x1024` |
| 皮肤 base | `Characters/Hero_BruenorPirate` | 149,886 B | 67,854 B | `1024x1024` |
| 皮肤 large | `Characters/Hero_BruenorPirate_Large` | 144,310 B | 73,640 B | `1024x1024` |
| 皮肤 xl | `Characters/Hero_BruenorPirate_4xup` | 85,413 B | 67,023 B | `1024x512` |

当前可确认：样例体量大多是几十 KB 到一百多 KB；但这只是样例，不应外推成“所有资源都只有这么小”。

## 头像线的特殊处理

官方头像虽然是 `256x256`，但有效内容常偏在左上角，大面积透明。当前头像同步链路必须保留：

1. 拉原始 portrait
2. 剥包装头
3. 裁透明边
4. 再把有效内容居中回填到方形 PNG

不建议回退成“直接使用官方原 PNG”。

## 当前仓库落地策略

- 已落本地：`public/data/v1/champion-portraits/`；原因是体积小、单尺寸稳定、当前页面已直接消费
- 暂不把二进制拉进仓库：英雄本体立绘、皮肤 `base / large / xl / portrait`
- 当前元数据落点：`public/data/v1/champion-visuals.json`；字段至少保留 `graphicId`、`sourceGraphic`、`sourceVersion`、`remotePath`、`remoteUrl`、`delivery`、`uses`

## 当前部署边界

2026-04-14 已确认 `master.idlechampions.com/~idledragons/mobile_assets/...` 当前未见 `Access-Control-Allow-Origin`。这意味着：

- Node 脚本、命令行或代理服务可以抓
- 但 GitHub Pages 这类纯静态站点里的浏览器跨域 `fetch(remoteUrl)` 不能当成稳定前提

所以当前更稳妥的做法仍是：

- 头像走本地同步
- 立绘走离线渲染或只保留远端元数据
- 页面不要把浏览器直连官方资源当成硬依赖

## 建议给资源线程的下一步

1. 做全量尺寸审计，不只看样例
2. 做全量体积统计，再评估哪些资源值得长期本地化
3. 继续把“资源引用链路”和“页面最终消费图”分层，不把所有原始二进制都塞进仓库
