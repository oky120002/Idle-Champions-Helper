# 动画 / 立绘落地：剩余技术点与核对来源

- 日期：2026-04-17
- 目标：收纳现行方案还需要关注的问题，以及当前用到的核对来源。

## 当前剩余技术点

- 默认 sequence / frame 选择目前依赖 `sequence_override` 和首个可渲染 frame；如果官方以后调整导出语义，仍需回归验证。
- 当前动态播放优先接在详情弹层；如果未来扩到列表页，需要重新评估 CPU、内存与懒加载策略。
- 动画增量复用目前依赖 definitions 元数据，不做远端内容哈希比对；如果后续观察到“版本不变但资源变了”，再补更重的校验链路。

## 仓库内来源

- `scripts/sync-idle-champions-animations.mjs`
- `scripts/sync-idle-champions-illustrations.mjs`
- `scripts/data/champion-graphic-resource-cache.mjs`
- `scripts/data/skelanim-codec.mjs`
- `scripts/data/skelanim-renderer.mjs`
- `src/features/skelanim-player/SkelAnimCanvas.tsx`
- `public/data/v1/champion-animations.json`
- `public/data/v1/champion-illustrations.json`
- `tmp/idle-champions-api-audit/definitions-2026-04-17T14-56-39.643Z-audit-latest.json`

## 仓库外来源

- 官方线上：
  1. `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
  2. `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=1`
  3. `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_Strix`
- 对照站点：`https://idle.kleho.ru/hero/strix/skins/`
