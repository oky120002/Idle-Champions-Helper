# 官方头像：已验证事实

- 日期：2026-04-13
- 目标：确认 definitions 是否暴露头像字段、头像资源是否可下载、是否存在多尺寸头像。

## 结论先行

- 官方 definitions 会返回英雄头像线索，但不是完整图片 URL。
- 可用链路是：`hero_defines[].portrait_graphic_id` -> `graphic_defines[]` 的 `graphic / v` -> `https://master.idlechampions.com/~idledragons/mobile_assets/<graphic>`。
- 2026-04-13 当天核实到的 161 名可上阵英雄中，`161 / 161` 都能映射到官方头像资源，没有缺失项。
- 当前核实到的英雄头像资源全部为 `256x256 PNG`；没有看到额外的小图 / 中图 / 大图 portrait 字段。
- 官方 `mobile_assets` 返回的头像文件外面包了一层 24 字节的自定义包装头；真正的 PNG 数据从偏移 24 开始，需要裁掉头部再落盘。

## 已验证事实

### definitions 里有头像字段

对 2026-04-13 的英文 definitions 快照做检查时，可以稳定看到：`hero_defines[].portrait_graphic_id`、`graphic_defines[].graphic`、`graphic_defines[].v`。

样例：`Bruenor` 的 `portrait_graphic_id = 13`，`graphic_defines[13].graphic = "Portraits/Portrait_Bruenor"`，`graphic_defines[13].v = 7`。

### `mobile_assets` 可以直接下载头像

对 `https://master.idlechampions.com/~idledragons/mobile_assets/Portraits/Portrait_Bruenor` 发起请求时，可以拿到二进制内容。原始返回头部不是标准图片签名，但在偏移 24 处能找到 PNG 文件头：`89 50 4E 47 0D 0A 1A 0A`。

说明：官方资源可拉取，但不能直接把整个响应体当成 PNG 文件保存，需要先剥掉外层包装头。

### 当前没有发现多尺寸 portrait

对 161 名可上阵英雄做完整核查后，结果是：头像资源成功数 `161`、缺失映射数 `0`、包装头长度全部 `24` 字节、真正图片尺寸全部 `256x256`。

当前没有发现类似 `small_portrait_graphic_id`、`medium_portrait_graphic_id`、`large_portrait_graphic_id` 这种英雄头像多尺寸字段。`small_portrait_graphic_id` 在其他定义里能看到，例如 Patron；`large_graphic_id / xl_graphic_id` 在 `hero_skin_defines` 中也能看到，但这些都不是当前英雄 portrait 卡片头像的多尺寸资源。

## 官方来源

1. `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
2. `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=1`
3. `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=7`
4. `https://master.idlechampions.com/~idledragons/mobile_assets/Portraits/Portrait_Bruenor`
