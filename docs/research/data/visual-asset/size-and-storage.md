# 视觉资源：尺寸、体积与仓库存储边界

- 日期：2026-04-15
- 目标：回答样例尺寸与体量长什么样、头像为什么要特殊处理、仓库当前应如何存这些资源。

## 已确认的数量

- 可上阵英雄：`161` 名；`161 / 161` 都有 `graphic_id` 与 `portrait_graphic_id`
- 皮肤：`672` 条；`672 / 672` 都有 `base / large / xl / portrait` 四类 graphic 引用

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

官方头像虽然是 `256x256`，但有效内容常偏在左上角，大面积透明。当前头像同步链路必须保留：拉原始 portrait -> 剥包装头 -> 裁透明边 -> 把有效内容居中回填到方形 PNG。

不建议回退成“直接使用官方原 PNG”。

## 当前仓库落地策略

- 已落本地：`public/data/v1/champion-portraits/`；原因是体积小、单尺寸稳定、当前页面已直接消费
- 暂不把二进制拉进仓库：英雄本体立绘、皮肤 `base / large / xl / portrait`
- 当前元数据落点：`public/data/v1/champion-visuals.json`；字段至少保留 `graphicId`、`sourceGraphic`、`sourceVersion`、`remotePath`、`remoteUrl`、`delivery`、`uses`

## 当前部署边界与下一步

2026-04-14 已确认 `master.idlechampions.com/~idledragons/mobile_assets/...` 当前未见 `Access-Control-Allow-Origin`。所以当前更稳妥的做法仍是：头像走本地同步；立绘走离线渲染或只保留远端元数据；页面不要把浏览器直连官方资源当成硬依赖。

建议下一步：做全量尺寸审计；做全量体积统计；继续把“资源引用链路”和“页面最终消费图”分层，不把所有原始二进制都塞进仓库。
