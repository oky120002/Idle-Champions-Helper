# Idle Champions 英雄立绘与皮肤资源调研

- 日期：2026-04-13
- 目标：确认 definitions 中是否能稳定定位英雄立绘、皮肤立绘和皮肤头像，并给出仓库层面的落地边界
- 适用范围：本文只回答“资源引用链路”和“原始响应 transport”；最终主立绘如何从 SkelAnim 组装，改看 `docs/research/data/skin-illustration-assembly-research.md`

## 结论

- definitions 里不只有头像字段，也能稳定定位英雄本体立绘和皮肤立绘
- 对可上阵的 `161` 名英雄：`161 / 161` 都有 `hero_defines[].graphic_id` 与 `hero_defines[].portrait_graphic_id`
- 对关联到的 `672` 条皮肤：`672 / 672` 都带 `base_graphic_id / large_graphic_id / xl_graphic_id / portrait_graphic_id`
- 这些资源可通过 `graphic_defines[].graphic` 拼出官方 `mobile_assets` 地址
- 但要注意：很多 `Characters/...` 主立绘资源后续已确认本质是 `graphic_defines.type = 3 (SkelAnim)` 分件动画资源；能解包出 atlas，不等于已经拿到最终可展示人物
- 因此当前最合理的仓库策略是：头像继续本地同步；大图保留元数据或交给离线渲染链路，不把浏览器直连官方资源当稳定前提

## 已核实的字段链路

### 英雄本体

- `hero_defines[].graphic_id`
- `hero_defines[].portrait_graphic_id`

布鲁诺样例：

- `graphic_id -> Characters/Hero_Bruenor`
- `portrait_graphic_id -> Portraits/Portrait_Bruenor`

### 皮肤资源

- `hero_skin_defines[].details.base_graphic_id`
- `hero_skin_defines[].details.large_graphic_id`
- `hero_skin_defines[].details.xl_graphic_id`
- `hero_skin_defines[].details.portrait_graphic_id`

海盗布鲁诺样例：

- `base -> Characters/Hero_BruenorPirate`
- `large -> Characters/Hero_BruenorPirate_Large`
- `xl -> Characters/Hero_BruenorPirate_4xup`
- `portrait -> Portraits/Portrait_BruenorPirate`

## `mobile_assets` transport

| 资源类型 | 路径模式 | 当前 transport | 说明 |
| --- | --- | --- | --- |
| 头像 | `Portraits/...` | `wrapped-png` | 原始响应中可直接定位 PNG 头 |
| 立绘类资源 | `Characters/...` | `zlib-png` | 响应体是 zlib 流；inflate 后可找到 PNG 头 |

样例可解结果：

- `Characters/Hero_Bruenor` -> `1024x1024`
- `Characters/Hero_BruenorPirate_Large` -> `1024x1024`
- `Characters/Hero_BruenorPirate_4xup` -> `1024x512`

但这只说明 transport 可解析；后续已确认很多 `Characters/...` 实际只是 SkelAnim atlas，而不是最终成图。

## 浏览器直连边界

2026-04-14 对 `master.idlechampions.com/~idledragons/mobile_assets/...` 做响应头核查时，未见 `Access-Control-Allow-Origin`。这意味着：

- Node 脚本、命令行或代理链路仍可请求并解包
- GitHub Pages 这类纯静态站点里的浏览器侧 `fetch(remoteUrl)` 存在被跨域阻断的高概率风险

所以页面层要有失败兜底，不应把浏览器直连解包当成硬前提。

## 当前仓库落地策略

- 已落地：继续保留 `public/data/<version>/champion-portraits/` 本地头像目录
- 当前元数据主落点：`public/data/<version>/champion-visuals.json`
- 每个视觉槽位统一保留：`graphicId`、`sourceGraphic`、`sourceVersion`、`remotePath`、`remoteUrl`、`delivery`、`uses`
- 暂不把二进制直接拉进仓库：英雄本体立绘、皮肤 `base / large / xl`、皮肤头像

## 当前边界

- 本文已确认引用链路、transport 和样例可解包
- 本文不再把“inflate 后能解出 PNG”误写成“已经能直接展示最终人物”
- 需要最终可展示主立绘时，统一改看 skin illustration 主线文档，而不是回到这篇 transport 级研究里重复判断
