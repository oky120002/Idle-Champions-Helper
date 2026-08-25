# 视觉资源：尺寸、体积与仓库存储边界事实

- 作用：沉淀样例尺寸与体量、头像特殊处理原因、仓库当前存储策略与部署边界事实。
- 资源定位合同（`champion-visuals.json` 字段）见 `specs/modules/champions/illustration/data-and-build.md`；本文件只保留尺寸 / 体积 / 边界事实。

## 已确认的数量

- 当前 `champion-illustrations.json`（`updatedAt: 2026-08-10`）包含 `165` 个英雄本体与 `719` 个皮肤展示单元。
- 清单中的 `884` 个展示单元都已生成本地静态图；全量文件存在性、清单字节数和 PNG 尺寸一致性见 [`docs/audits/2026-08-visual-asset-full-audit.md`](../../../audits/2026-08-visual-asset-full-audit.md)。

## 样例尺寸与体积

全量审计结果：页面 PNG 合计 `49,495,485 B`；英雄本体范围为 `148–548 × 236–522`，皮肤范围为 `130–626 × 202–554`。`public/data` 合计 `431,353,645 B`，距离 GitHub Pages `1 GB` 上限仍有 `568,646,355 B`。

| 资源槽位 | 样例路径 | rawBytes | decodedPngBytes | 解包后尺寸 |
| --- | --- | ---: | ---: | --- |
| 英雄头像 | `Portraits/Portrait_Bruenor` | 8,990 B | 8,905 B | `256x256` |
| 英雄本体图 | `Characters/Hero_Bruenor` | 151,159 B | 65,760 B | `1024x1024` |
| 皮肤 base | `Characters/Hero_BruenorPirate` | 149,886 B | 67,854 B | `1024x1024` |
| 皮肤 large | `Characters/Hero_BruenorPirate_Large` | 144,310 B | 73,640 B | `1024x1024` |
| 皮肤 xl | `Characters/Hero_BruenorPirate_4xup` | 85,413 B | 67,023 B | `1024x512` |

样例体量大多是几十 KB 到一百多 KB；这只是样例，不应外推成“所有资源都只有这么小”。

## 头像线的特殊处理

官方头像虽然是 `256x256`，但有效内容常偏在左上角，大面积透明。当前头像同步链路会拉取原始 portrait、剥包装头、裁透明边，再把有效内容居中回填到方形 PNG；直接使用原 PNG 时会保留大面积透明区。包装头与链路细节见 `docs/research/data/portrait-asset/resource-chain-and-format.md`，当前页面资源合同见 `specs/modules/champions/illustration/data-and-build.md`。

## 当前仓库存储策略

- 已落本地：`public/data/v1/champion-portraits/`；原因是体积小、单尺寸稳定、当前页面已直接消费。
- 暂不把二进制拉进仓库：英雄本体立绘、皮肤 `base / large / xl / portrait`。
- 当前元数据落点：`public/data/v1/champion-visuals.json`；字段合同见 `specs/modules/champions/illustration/data-and-build.md`。

## 当前部署边界

2026-04-14 已确认 `master.idlechampions.com/~idledragons/mobile_assets/...` 当前未见 `Access-Control-Allow-Origin`。因此当前更稳妥的做法仍是：头像走本地同步；立绘走离线渲染或只保留远端元数据；页面不要把浏览器直连官方资源当成硬依赖。
