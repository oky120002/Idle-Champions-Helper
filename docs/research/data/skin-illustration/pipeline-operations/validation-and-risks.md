# 当前动画 / 立绘流水线：验证命令与剩余风险

- 日期：2026-04-17
- 目标：收纳现行动画主链路的复跑命令、全量重建入口与仍需留意的风险。

## 验证命令

### 脚本测试

```bash
node --test scripts/sync-idle-champions-animations.test.mjs scripts/sync-idle-champions-illustrations.test.mjs
```

### 类型与风格校验

```bash
npm run lint
npm run typecheck
```

### 生产构建

```bash
npm run build
```

### 全量公共数据重建

```bash
npm run data:official
```

### 局部重建动画与关联静态图

```bash
node scripts/build-idle-champions-data.mjs   --animationChampionIds 124   --animationSkinIds 332,416
```

## 当前剩余风险

- 现有增量复用依据是 definitions 里的 `sourceGraphicId / sourceGraphic / sourceVersion / sourceSlot`；若上游在不改这些字段的情况下静默替换文件内容，本地不会自动重新下载。
- 浏览器播放依赖 `DecompressionStream` 或 `fflate` 回退；极端旧环境可能只拿到静态 PNG。
- 全量动画目录已到约 155 MB，仍在 GitHub Pages 可接受范围内，但后续若扩到更多资源类型，需要继续盯总体积。
- 默认帧选择当前依赖 `sequence_override` 和首个可渲染 frame；这和现有站内静态图已经对齐，但仍是工程约定，不是官方文档合同。

## 当前结论

- 旧的皮肤 pose override、alpha 碎裂和 delta 人工复核流程已不再是生产主线。
- 当前最稳妥的维护方式是：先同步本地动画 `.bin`，再从同一份 manifest 生成静态 PNG，并让前端只消费站内发布的资源。
