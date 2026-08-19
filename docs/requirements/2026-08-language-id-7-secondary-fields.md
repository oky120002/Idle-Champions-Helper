# 官方中文链路次级字段核对

**优先级**：待评

## 是什么

`language_id=7` 双字段链路（`{original, display}`）已在主要名称字段落地；本提案收纳仍未展开的次级字段核对与缺口评估：

1. **次级字段核对**（`event_name` / `game_changes` / escort 名称）的页面价值评估——当前是否进入产物、是否被页面消费
2. **缺口评估**（BBEG、Vecna: Eve of Ruin、Tales of the Champions 等是否需要人工覆盖）
3. **变体说明字段系统化**——若后续页面展示更多变体说明，把 `description` / `objectives_text` / `requirements_text` 系统化成 `{original, display}` 双字段结构

## 为何暂缓

主要名称字段已覆盖，次级字段的页面价值需逐个评估后再决定是否做。

## 关联

- [language-id-7/coverage.md](../research/data/language-id-7/coverage.md)
- [language-id-7/data-contract.md](../research/data/language-id-7/data-contract.md)
