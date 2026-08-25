# 公共数据同步与资源验证

数据归一化规则见 `docs/specs/guidelines/data-normalization.md`；本页只说明怎样执行当前流水线。个人账号数据见 `docs/specs/modules/user-data/`，不走这组命令。

## 常用命令

| 目的 | 命令 |
| --- | --- |
| 全量同步官方公共数据（主入口） | `pnpm run data:official` |
| 抓取原始 definitions 快照 | `pnpm run data:fetch` |
| 归一化英文/中文 raw | `pnpm run data:normalize -- --input <en>.json --localizedInput <zh>.json` |
| 同步头像/主机头像/立绘/专精图/装备 icon | `pnpm run data:portraits` / `data:console-portraits` / `data:illustrations` / `data:specialization-graphics` / `data:equipment-icons` |
| 同步魔宠目录与图 | `pnpm run data:pets -- --input <en>.json --localizedInput <zh>.json` |
| 构建搜索索引 | `pnpm run data:search` |
| 统计 planner signal 覆盖率 | `pnpm run data:signal-coverage` |
| 重生成 idle 动画审片清单 | `pnpm run data:animation-audit` |
| 数据与 schema 测试 | `pnpm run test:data` |

原始快照默认写入 `tmp/idle-champions-api/`，子脚本按需传 `--input`（英文）/ `--localizedInput`（中文）。`data:official` 是主入口，依次拉取 definitions、归一化、同步资源、构建模型与搜索索引；其余命令用于局部重建或单独步骤。

`data:search` 基于 `public/data/v1/champions.json` 与 `champion-details/*.json` 抽取英雄文本，输出 `public/data/v1/search/search-documents.json`，随主流程一起产出。`data:signal-coverage` 统计 planner signal 覆盖率，用来判断下一刀该补哪类规则。

`data:animation-audit` 基于站内 `.bin` 与 `champion-animations.json` 重新生成本地 idle 候选审片清单；idle 动图人工覆写沉淀在 `scripts/data/champion-animation-idle-overrides.json`，动画同步与审片脚本默认读取它。

## 局部重建动画与立绘

```bash
node scripts/build-idle-champions-data.ts \
  --animationChampionIds 124 \
  --animationSkinIds 332,416
```

局部重建后核对 `champion-animations.json`、`champion-illustrations.json` 的条目与目标资源，并运行脚本测试。需要发布或浏览器验收时，继续运行完整生产构建。

## 资源增量复用

资源同步默认做两层跳过：先比对 `public/data/resource-sync-state.json` 的全局 `updatedAt`，未变新时整批跳过；进入具体资源脚本后，再按单资源的 source/version/manifest 复用已有文件，减少无效下载和仓库二进制改写。

## 判断与回退

- 增量复用依据是 `sourceGraphicId / sourceGraphic / sourceVersion / sourceSlot`；怀疑上游静默替换文件时，使用 `FORCE_DATA_REBUILD=1` 强制重建。
- hero-base 或 skin 缺少动画包时应让构建失败，不手工混入远端静态图。
- 全量同步需要同快照的英文和中文 raw；缺任一份时不生成看似完整的归一化产物。
- 数据脚本或归一化逻辑变化后，必须重跑对应产物并审查生成文件 diff。
- `private-user-data:fetch` 仅本地开发用：用私有凭证抓官方只读用户 payload 写入 `tmp/private-user-data/`，供本地 Vite 调试导入，不进生产构建；详见 `docs/specs/modules/user-data/`。
