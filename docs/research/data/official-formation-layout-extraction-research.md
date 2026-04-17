# 官方阵型布局提取调研

- 日期：2026-04-13
- 目标：确认官方 definitions 是否已包含阵型布局、字段落点在哪里，以及仓库应如何归一化到 `public/data/v1/formations.json`

## 结论

- 官方 definitions 已包含阵型布局数据，不需要继续手工维护 MVP 示例布局作为主来源
- 布局字段不在独立 `formation_defines` 集合里，而是挂在：
  - `campaign_defines[].game_changes[].formation`
  - `adventure_defines[].game_changes[].formation`
- 单个槽位对象当前可见：`x`、`y`、`col`、`row`（部分缺失）、`adj`
- 以 2026-04-13 最新快照计算：
  - 带阵型的 `campaign`：28
  - 带阵型的普通 `adventure`：283
  - 带阵型的 `variant`：554
  - 总上下文：865
  - 去重后唯一布局：157
- 因此仓库应采用：官方自动提取 -> 去重归并 -> 为每个唯一布局保留 `sourceContexts / applicableContexts` -> `scripts/data/manual-overrides.json` 仅作为必要覆写层

## 本次原始来源

- 英文快照：`tmp/idle-champions-api/definitions-2026-04-13T11-51-00.099Z-inspect-en.json`
- 英文元信息：`tmp/idle-champions-api/definitions-2026-04-13T11-51-00.099Z-inspect-en.meta.json`
- 中文快照：`tmp/idle-champions-api/definitions-2026-04-13T11-56-42.025Z-inspect-zh.json`
- 中文元信息：`tmp/idle-champions-api/definitions-2026-04-13T11-56-42.025Z-inspect-zh.meta.json`

## 字段落点

- `campaign_defines[].game_changes[].formation`：campaign 默认布局
- `adventure_defines[].game_changes[].formation`：普通冒险与变体覆盖布局
- 当前仓库沿用 `variant_adventure_id / base_adventure_id / variant_id / adventure_variant_id` 判断普通冒险与变体

单个槽位样例：

```json
{
  "x": 80,
  "y": 30,
  "col": 0,
  "row": 2,
  "adj": [1, 2]
}
```

归一化注意点：

- `col` 是 0 基列号，前端网格需转成 1 基
- `row` 缺失时可回退到 `y` 分层
- `adj` 基于官方原始数组下标，归一化后应改写成稳定 `slotId`

## 去重结果

- 去重前上下文：865
- 去重后唯一布局：157
- 槽位数量分布：9 槽 1 个、10 槽 152 个、11 槽 3 个、13 槽 1 个
- 仓库实现使用“归一化槽位串 + `sha1` 截断”生成稳定布局 ID；签名至少应包含 `column / row / x / y / adjacentSlotIds`

## 对仓库实现的影响

- `public/data/v1/formations.json` 应承载唯一官方布局集合，并保留：`name.original / name.display`、`notes.original / notes.display`、`slots`、`applicableContexts`、`sourceContexts`
- `scripts/data/manual-overrides.json` 从“布局主来源”降级为必要覆写、中文补充说明和未来缺口补丁
- 阵型页文案应从“手工 MVP 布局”切换到“官方 definitions 自动提取的布局库”

## 当前边界

- `language_id=7` 对部分新冒险或时空门条目仍可能回退英文
- 官方中文个别文本可能有翻译质量问题；当前策略应是优先保留官方返回，再为必要缺口补人工覆写
- 本次接入的是“布局数据自动提取”，还不是“按战役 / 冒险 / 变体筛选布局”的完整交互方案

## 最终判断

1. 阵型布局数据已在官方 definitions 中，可直接自动提取
2. 原先的 4 个手工示例布局应退出主链路
3. `public/data/v1/formations.json` 应承载 157 个唯一官方布局与上下文映射
4. 人工补充层仍需保留，但定位已从主来源变为必要覆写层
