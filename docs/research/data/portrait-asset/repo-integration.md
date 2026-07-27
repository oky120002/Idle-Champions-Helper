# 官方头像：仓库接入事实

- 作用：沉淀头像同步链路必须保留的处理步骤，以及当前接入记录。
- 头像字段（`champions.json` 的 `portrait`）、资源目录（`public/data/v1/champion-portraits/`）与界面消费已落地，见 `specs/modules/champions/detail/page-structure.md`（资料栏头像）；本文件只留处理约束与实现记录。

## 头像处理约束

由于官方原始 portrait 的有效内容都挤在左上角（大面积透明），仓库同步链路必须保留：拉原始 portrait -> 剥包装头（见 `docs/research/data/portrait-asset/resource-chain-and-format.md`）-> 裁透明边 -> 把有效内容居中回填到方形 PNG。不能回退成“直接使用官方原 PNG”，否则页面会出现“左上角一小块 + 大面积透明”的观感问题。

官方当前只提供单一 `256x256` portrait，前端统一按容器尺寸缩放即可，不需要为多尺寸资源额外做 `srcset`。

## 实现记录

- 最后确认时间：2026-04-13 18:20（Asia/Shanghai）。
- 对应仓库实现：英雄数据已补 `portrait` 元数据（`champions.json`）；官方头像已同步到 `public/data/v1/champion-portraits/`；英雄相关页面（`ChampionAvatar` 等组件）已接入头像展示。
