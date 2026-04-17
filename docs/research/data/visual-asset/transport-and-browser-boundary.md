# 视觉资源：transport 与浏览器边界

- 日期：2026-04-13
- 目标：回答 `mobile_assets` 如何返回这些资源，以及浏览器直连的边界。

## `mobile_assets` transport

- 头像：`Portraits/...`；transport 为 `wrapped-png`；原始响应中可直接定位 PNG 头
- 立绘类资源：`Characters/...`；transport 为 `zlib-png`；响应体是 zlib 流，inflate 后可找到 PNG 头
- 样例可解结果：`Characters/Hero_Bruenor -> 1024x1024`、`Characters/Hero_BruenorPirate_Large -> 1024x1024`、`Characters/Hero_BruenorPirate_4xup -> 1024x512`
- 但很多 `Characters/...` 后续已确认本质是 `graphic_defines.type = 3 (SkelAnim)` 分件动画资源；能解包出 atlas，不等于已经拿到最终可展示人物。

## 浏览器直连边界

- 2026-04-14 对 `master.idlechampions.com/~idledragons/mobile_assets/...` 做响应头核查时，未见 `Access-Control-Allow-Origin`。
- 这意味着：Node 脚本、命令行或代理链路仍可请求并解包；但 GitHub Pages 这类纯静态站点里的浏览器侧 `fetch(remoteUrl)` 有较高概率被跨域阻断。
- 因此页面层要有失败兜底，不应把浏览器直连解包当成硬前提。
