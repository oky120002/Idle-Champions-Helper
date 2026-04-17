# 官方头像：仓库接入建议

- 日期：2026-04-13
- 目标：沉淀头像在仓库里的数据层、资源层和界面层接入方式。

## 数据层

- 在 `champions.json` 里为每个英雄补 `portrait` 字段：`path`、`sourceGraphic`、`sourceVersion`。
- 路径使用版本化目录，例如 `v1/champion-portraits/38.png`。

## 资源层

- 把头像写入 `public/data/<version>/champion-portraits/`。
- 同步脚本应基于英文 definitions 快照执行，避免依赖页面抓图或第三方站点。
- 由于官方原始 portrait 的有效内容都挤在左上角，本仓库同步时应先裁掉透明边，再把内容居中回填到方形 PNG，避免页面上出现“左上角一小块 + 大面积透明”的观感问题。

## 界面层

- 英雄筛选卡片直接显示头像。
- 阵型编辑页已选英雄卡片和槽位当前英雄显示头像。
- 方案存档页的英雄摘要标签显示头像。
- 因官方当前只提供单一 `256x256` portrait，前端统一按容器尺寸缩放即可，不需要为多尺寸资源额外做 `srcset`。

## 落地记录

- 最后确认时间：2026-04-13 18:20（Asia/Shanghai）
- 对应仓库落地：英雄数据已补 `portrait` 元数据；官方头像已同步到 `public/data/v1/champion-portraits/`；英雄相关页面已接入头像展示。
