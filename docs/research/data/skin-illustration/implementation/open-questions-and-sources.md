# 皮肤立绘落地：剩余技术点与核对来源

- 日期：2026-04-16
- 目标：收纳仍待验证的问题与当前用到的核对来源。

## 仍待补完的技术点

- 静态 pose 选择：同一资源可能有多个 sequence；`sequence_override` 是否总能代表页面主立绘，仍需继续核实。
- 坐标系还原：`x / y / scaleX / scaleY / rotation` 已能从 IL 读到一层，但仍需样例渲染继续核对最终边界。
- 特殊替换件：`noarm_graphic`、`nosword_graphic`、`companion_graphic_ids` 等变体，后续要决定页面是否统一渲染为主 pose。
- 样例基准：仍要用少量皮肤 PoC 与游戏内视觉对齐，再批量生成全量立绘。

## 仓库内来源

- `src/pages/ChampionDetailPage.tsx`
- `scripts/sync-idle-champions-illustrations.mjs`
- `scripts/data/mobile-asset-codec.mjs`
- `public/data/v1/champion-visuals.json`
- `public/data/v1/champion-illustrations.json`
- `tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json`

## 仓库外来源

- 官方线上：
  1. `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
  2. `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=1`
  3. `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_BBEG_Modron_2xup`
  4. `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Hero_Evandra_Plushie_2xup`
- 仓库外本地：Steam 缓存 `~/Library/Application Support/Steam/steamapps/common/IdleChampions/IdleDragonsMac.app/Contents/Resources/Data/StreamingAssets/downloaded_files/`；反编译临时文件 `/tmp/idlechampions-assembly.il`
