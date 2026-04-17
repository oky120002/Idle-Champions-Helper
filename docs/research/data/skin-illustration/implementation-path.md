# 皮肤立绘：仓库落地方向与剩余问题

- 日期：2026-04-16
- 目标：回答“仓库里应该怎样接这套数据”“还差哪些技术点”“最终该怎么回答这个主题问题”。

## 仓库可落地方案

- 保留 `public/data/v1/champion-visuals.json` 作为官方资源定位基座。
- 把 `scripts/sync-idle-champions-illustrations.mjs` 升级为 SkelAnim 解析器与静态渲染器，在构建期直接输出页面消费的完整立绘。
- 页面层可以基本不动：`src/pages/ChampionDetailPage.tsx` 继续读 `champion-illustrations.json`；首要修复点是构建期资源同步脚本，而不是页面组件。

## 建议流水线

1. 按 `graphic_id` 下载 `Characters/...`
2. zlib 解压并读取纹理与 SkelAnim 元数据
3. 依据 `sequence_override`、默认 sequence 或显式规则选择静态 pose
4. 按 `depth + transform + pivot + UV` 合成完整图
5. 裁透明边并输出页面用 `display / thumb`
6. 在 `champion-illustrations.json` 追加 `renderSequence / renderFrame / renderSourceType / renderBounds`

## 仍待补完的技术点

- 静态 pose 选择：同一资源可能有多个 sequence；`sequence_override` 是否总能代表页面主立绘，仍需继续核实。
- 坐标系还原：`x / y / scaleX / scaleY / rotation` 已能从 IL 读到一层，但仍需样例渲染继续核对最终边界。
- 特殊替换件：`noarm_graphic`、`nosword_graphic`、`companion_graphic_ids` 等变体，后续要决定页面是否统一渲染为主 pose。
- 样例基准：仍要用少量皮肤 PoC 与游戏内视觉对齐，再批量生成全量立绘。

## 直接回答

- “有没有能组装起来的方案？”：有。
- “游戏基座里有没有类似组装坐标和规则？”：有，但不在普通 definitions 字段里，而在 `graphic_defines.type = 3 (SkelAnim)` 对应的客户端二进制与运行时代码里。
- “是不是已经存在现成可直接读的完整立绘 JSON 坐标表？”：没有；官方更像是提供了动画资源格式和客户端加载器，而不是成品坐标清单。
- “`preview_graphic_id` 或 `additional_shop_graphics` 能否直接替代 pose 判断？”：不能。
- 正确实现方向是：把客户端的 SkelAnim 运行时组装过程离线搬到构建脚本里，而不是继续在 `base / large / xl` 里挑 atlas。

## 引用与核对来源

### 仓库内

- `src/pages/ChampionDetailPage.tsx`
- `scripts/sync-idle-champions-illustrations.mjs`
- `scripts/data/mobile-asset-codec.mjs`
- `public/data/v1/champion-visuals.json`
- `public/data/v1/champion-illustrations.json`
- `tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json`

### 官方线上

1. `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
2. `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=1`
3. `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_BBEG_Modron_2xup`
4. `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Hero_Evandra_Plushie_2xup`

### 仓库外本地

- Steam 客户端缓存：`~/Library/Application Support/Steam/steamapps/common/IdleChampions/IdleDragonsMac.app/Contents/Resources/Data/StreamingAssets/downloaded_files/`
- 反编译临时文件：`/tmp/idlechampions-assembly.il`
