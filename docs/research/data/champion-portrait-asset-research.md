# Idle Champions 官方英雄头像资源调研

- 调研日期：2026-04-13
- 调研目标：确认官方 definitions 是否直接暴露英雄头像字段、头像资源是否可下载、是否存在多尺寸头像，以及本仓库应如何接入。
- 调研方式：使用仓库脚本调用官方 definitions 接口，再对 `hero_defines`、`graphic_defines` 和 `mobile_assets` 实际返回做交叉核实。

## 1. 结论先行

- 官方 definitions **会返回英雄头像线索**，但不是完整图片 URL。
- 可用链路是：
  1. `hero_defines[].portrait_graphic_id`
  2. 用该 ID 去 `graphic_defines[]` 里查到 `graphic` 与 `v`
  3. 再请求 `https://master.idlechampions.com/~idledragons/mobile_assets/<graphic>`
- 2026-04-13 当前可上阵的 161 名英雄里，**161 / 161 都能映射到官方头像资源**，没有缺失项。
- 当前核实到的英雄头像资源全部为 **256x256 PNG**；没有在 `hero_defines` 中看到额外的小图 / 中图 / 大图 portrait 字段。
- `hero_skin_defines.details.large_graphic_id / xl_graphic_id` 确实存在，但它们对应的是皮肤立绘资源，不是英雄卡片头像的额外尺寸。
- 官方 `mobile_assets` 返回的头像文件外面包了一层 **24 字节的自定义包装头**；真正的 PNG 数据从偏移 24 开始，需要裁掉头部再落盘。

## 2. 已验证事实

### definitions 里有头像字段

对 2026-04-13 抓到的英文 definitions 快照做检查时，可以稳定看到：

- `hero_defines[].portrait_graphic_id`
- `graphic_defines[].graphic`
- `graphic_defines[].v`

样例：

- `Bruenor`
  - `portrait_graphic_id = 13`
  - `graphic_defines[13].graphic = "Portraits/Portrait_Bruenor"`
  - `graphic_defines[13].v = 7`

这说明官方接口已经给出了“头像资源定位信息”，只是没有直接返回完整 URL。

### mobile_assets 可以直接下载头像

对样例资源发起请求：

- `https://master.idlechampions.com/~idledragons/mobile_assets/Portraits/Portrait_Bruenor`

可以拿到二进制内容。原始返回头部不是标准图片签名，但在偏移 24 处能找到 PNG 文件头：

- 偏移前 24 字节：官方包装头
- 偏移 24 起始：`89 50 4E 47 0D 0A 1A 0A`

也就是说：

- 官方资源可拉取
- 但不能直接把整个响应体当成 PNG 文件保存
- 需要先剥掉外层包装头

### 当前没有发现多尺寸 portrait

对 161 名可上阵英雄做完整核查后，结果是：

- 头像资源成功数：161
- 缺失映射数：0
- 包装头长度：全部为 24 字节
- 真正图片格式：全部为 PNG
- 真正图片尺寸：全部为 256x256

当前没有发现类似下面这种“英雄头像多尺寸字段”：

- `small_portrait_graphic_id`
- `medium_portrait_graphic_id`
- `large_portrait_graphic_id`

需要注意：

- `small_portrait_graphic_id` 在其他定义里能看到，例如 Patron
- `large_graphic_id / xl_graphic_id` 在 `hero_skin_defines` 中也能看到
- 但这些都**不是**当前英雄 portrait 卡片头像的多尺寸资源

所以当前更合理的实现是：

- 项目内只落一份官方 portrait PNG
- UI 侧用统一头像容器、固定显示尺寸和 `object-fit` 做适配

## 3. 对本仓库的实现建议

### 数据层

- 在 `champions.json` 里为每个英雄补 `portrait` 字段：
  - `path`
  - `sourceGraphic`
  - `sourceVersion`
- 路径使用版本化目录，例如：
  - `v1/champion-portraits/38.png`

### 资源层

- 把头像写入：
  - `public/data/<version>/champion-portraits/`
- 同步脚本应基于英文 definitions 快照执行，避免依赖页面抓图或第三方站点。
- 由于官方原始 portrait 的有效内容都挤在左上角，本仓库同步时应：
  - 先裁掉透明边
  - 再把内容居中回填到方形 PNG
  - 避免页面上出现“左上角一小块 + 大面积透明”的观感问题

### 界面层

- 英雄筛选卡片直接显示头像
- 阵型编辑页已选英雄卡片和槽位当前英雄显示头像
- 方案存档页的英雄摘要标签显示头像
- 因官方当前只提供单一 256x256 portrait，前端统一按容器尺寸缩放即可，不需要为多尺寸资源额外做 `srcset`

## 4. 本次确认用到的官方来源

1. Play server 发现接口
   `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
2. 2026-04-13 实际使用的 definitions 接口（英文）
   `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=1`
3. 2026-04-13 实际使用的 definitions 接口（中文）
   `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=7`
4. 官方头像样例资源
   `https://master.idlechampions.com/~idledragons/mobile_assets/Portraits/Portrait_Bruenor`

## 5. 结论落地时间

- 最后确认时间：2026-04-13 18:20（Asia/Shanghai）
- 对应仓库落地：
  - 英雄数据已补 `portrait` 元数据
  - 官方头像已同步到 `public/data/v1/champion-portraits/`
  - 英雄相关页面已接入头像展示
