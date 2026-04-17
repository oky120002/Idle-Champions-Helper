# 官方布局：去重结果与仓库影响

- 日期：2026-04-13
- 目标：沉淀唯一布局数量、仓库应怎样消费这些布局，以及当前边界。

## 去重结果

- 带阵型的 `campaign`：28
- 带阵型的普通 `adventure`：283
- 带阵型的 `variant`：554
- 总上下文：865
- 去重后唯一布局：157
- 槽位数量分布：9 槽 1 个、10 槽 152 个、11 槽 3 个、13 槽 1 个

仓库实现使用“归一化槽位串 + `sha1` 截断”生成稳定布局 ID；签名至少应包含 `column / row / x / y / adjacentSlotIds`。

## 对仓库实现的影响

- `public/data/v1/formations.json` 应承载唯一官方布局集合，并保留：`name.original / name.display`、`notes.original / notes.display`、`slots`、`applicableContexts`、`sourceContexts`
- `scripts/data/manual-overrides.json` 从“布局主来源”降级为必要覆写、中文补充说明和未来缺口补丁
- 阵型页文案应从“手工 MVP 布局”切换到“官方 definitions 自动提取的布局库”

## 当前边界与最终判断

- `language_id=7` 对部分新冒险或时空门条目仍可能回退英文
- 官方中文个别文本可能有翻译质量问题；当前策略应是优先保留官方返回，再为必要缺口补人工覆写
- 本次接入的是“布局数据自动提取”，还不是“按战役 / 冒险 / 变体筛选布局”的完整交互方案

最终判断：阵型布局数据已在官方 definitions 中，可直接自动提取；原先的 4 个手工示例布局应退出主链路；人工补充层仍需保留，但定位已从主来源变为必要覆写层。
