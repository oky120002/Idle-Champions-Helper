# 公共数据同步与资源验证

数据归一化规则见 `docs/specs/guidelines/data-normalization.md`；本页只说明怎样执行当前流水线。

## 常用命令

| 目的 | 命令 |
| --- | --- |
| 全量同步官方公共数据 | `npm run data:official` |
| 数据与 schema 测试 | `npm run test:data` |
| 类型与风格校验 | `npm run typecheck`、`npm run lint` |
| 生产构建 | `npm run build` |
| 动画和立绘脚本测试 | `npm run test:unit -- scripts/sync-idle-champions-animations.test.ts scripts/sync-idle-champions-illustrations.test.ts` |

## 局部重建动画与立绘

```bash
node scripts/build-idle-champions-data.ts \
  --animationChampionIds 124 \
  --animationSkinIds 332,416
```

局部重建后核对 `champion-animations.json`、`champion-illustrations.json` 的条目与目标资源，并运行脚本测试。需要发布或浏览器验收时，继续运行完整生产构建。

## 判断与回退

- 增量复用依据是 `sourceGraphicId / sourceGraphic / sourceVersion / sourceSlot`；怀疑上游静默替换文件时，使用 `FORCE_DATA_REBUILD=1` 强制重建。
- hero-base 或 skin 缺少动画包时应让构建失败，不手工混入远端静态图。
- 全量同步需要同快照的英文和中文 raw；缺任一份时不生成看似完整的归一化产物。
- 数据脚本或归一化逻辑变化后，必须重跑对应产物并审查生成文件 diff。
