# 官方中文链路后续核对

**Status**: Draft
**Type**: change
**Scope**: system
**Created**: 2026-07-27

## 目标

`language_id=7` 双字段链路（`{original, display}`）已在主要名称字段落地；本 change 收纳仍未展开的次级字段核对与缺口评估。

## 范围

- `scripts/normalize-idle-champions-definitions.ts`、`scripts/data/manual-overrides.json`
- 次级字段：`event_name`、`game_changes`、escort 名称等

## 阶段 Checklist

- [ ] 核对次级字段（`event_name` / `game_changes` / escort 名称）的页面价值 —— 验证方式：列出当前是否进入产物、是否被页面消费
- [ ] 评估 `BBEG`、`Vecna: Eve of Ruin`、`Tales of the Champions` 等缺口是否需要人工覆盖 —— 验证方式：缺口清单 + override 命中核对
- [ ] 若后续页面展示更多变体说明，把 `description / objectives_text / requirements_text` 系统化成 `{original, display}` 双字段结构 —— 验证方式：归一化产物字段 + 页面消费核对

## 验收

上述项任一落地时，同步更新对应 specs 与 `docs/research/data/language-id-7/coverage.md`；本 change 不描述系统现状。

## 落地后

- 本 change Status → Landed → 移 `archive/changes/`
