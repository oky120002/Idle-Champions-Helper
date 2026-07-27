# 英雄筛选：MVP 补全与扩展

**Status**: Draft
**Type**: change
**Scope**: champions-filter
**Created**: 2026-07-27

## 目标

补齐英雄筛选模块的 MVP 缺口并按顺序扩展。

## 范围（MVP 必补）

- `Patron` 过滤
- 目标模式过滤及 `modeEligibilityTags` 资格字段
- 结构化规则数据集合，供筛选与不可用原因共用
- 结果解释：命中 `Patron`、命中模式标签、「可用/不可用原因」摘要

## 扩展顺序

1. 补 MVP 缺口（Patron、目标模式、规则集合、资格字段）
2. 更可读的过滤标签（阵营、种族、职业、活动年限）
3. 个人画像（owned/unowned、已解锁/未解锁）
4. 细场景规则（Variant 规则、冒险/变体上下文联动）
5. 推荐层（只做可解释模板推荐，不做黑盒打分）

## 阶段 Checklist

- [ ] Patron 过滤 + 结果解释 —— 验证：Patron 维度可过滤并显示命中
- [ ] 目标模式过滤 —— 验证：模式维度可缩小候选池
- [ ] 规则集合与资格字段 —— 验证：筛选结果和不可用原因消费同一规则来源
- [ ] 过滤标签扩展 —— 验证：阵营/种族/职业/年限标签可筛
- [ ] 个人画像接入 —— 验证：owned/unowned 标记正确
- [ ] 场景规则联动 —— 验证：Variant 规则生效
- [ ] 可解释模板推荐 —— 验证：模板推荐不黑盒

## 落地后

- `specs/modules/champions/filter/rules.md`：新规则条目
- Status → Landed → `archive/changes/`
