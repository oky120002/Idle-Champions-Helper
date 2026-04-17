# 官方头像：资源链路与格式结论

- 日期：2026-04-13
- 目标：确认 definitions 是否暴露头像字段、头像资源如何下载，以及当前格式 / 尺寸结论是什么。

## 结论先行

- 官方 definitions 会返回英雄头像线索，但不是完整图片 URL。
- 可用链路是：`hero_defines[].portrait_graphic_id` -> `graphic_defines[]` 的 `graphic / v` -> `https://master.idlechampions.com/~idledragons/mobile_assets/<graphic>`。
- 2026-04-13 当天核实到的 161 名可上阵英雄中，`161 / 161` 都能映射到官方头像资源，没有缺失项。
- 当前核实到的英雄头像资源全部为 `256x256 PNG`；没有看到额外的小图 / 中图 / 大图 portrait 字段。
- 官方 `mobile_assets` 返回的头像文件外面包了一层 24 字节的自定义包装头；真正的 PNG 数据从偏移 24 开始，需要裁掉头部再落盘。

## 已验证事实

- 对 2026-04-13 的英文 definitions 快照做检查时，可以稳定看到：`hero_defines[].portrait_graphic_id`、`graphic_defines[].graphic`、`graphic_defines[].v`。
- 对 `Portraits/Portrait_Bruenor` 发起请求时，可以拿到二进制内容，并在偏移 24 处找到 PNG 文件头。
- 对 161 名可上阵英雄做完整核查后，头像资源成功数 `161`、缺失映射数 `0`、包装头长度全部 `24` 字节、真正图片尺寸全部 `256x256`。
- 当前没有发现类似 `small_portrait_graphic_id`、`medium_portrait_graphic_id`、`large_portrait_graphic_id` 的英雄头像多尺寸字段。

## 官方来源

1. `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
2. `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=1`
3. `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=7`
4. `https://master.idlechampions.com/~idledragons/mobile_assets/Portraits/Portrait_Bruenor`
