# 阵型编辑模块设计稿

- 设计日期：2026-04-13
- 模块目标：让用户能基于真实英雄数据和手工维护的阵型布局，完成最小可用的“选布局 -> 放英雄 -> 看 seat 冲突 -> 形成草稿”闭环。
- 当前结论：第一阶段优先做阵型草稿编辑器，不直接追求真实战役全覆盖、拖拽交互或复杂规则模拟。

---

## 1. 模块定位

阵型编辑模块承担的是“把候选英雄摆进槽位”的能力，是查询页与方案存档页之间的连接层。

它当前要解决的问题：

1. 不同布局下，当前阵型摆成什么样。
2. 同一 seat 是否出现冲突。
3. 当前已经放了哪些英雄，方便后续保存为方案。

它当前不负责：

- 自动推荐站位
- 真实战役布局全量映射
- 敌人机制模拟
- 技能连线和增益覆盖计算

---

## 2. 当前输入与依赖

### 2.1 数据输入

- `public/data/v1/formations.json`
  - 当前只放手工维护的 MVP 布局
- `public/data/v1/champions.json`
  - 提供可选英雄及其 seat / roles

### 2.2 前端依赖

- `src/pages/FormationPage.tsx`
  - 当前阵型页入口
- `src/domain/types.ts`
  - 提供 `FormationLayout`、`FormationSlot`、`Champion`
- `src/rules/seat.ts`
  - 提供 `findSeatConflicts`

---

## 3. 第一阶段交互闭环

### 3.1 页面结构

建议继续保留两块主卡片：

1. 阵型编辑卡
   - 布局选择
   - 指标卡
   - 当前布局说明
   - 冲突提示
   - 槽位编辑面板
   - 清空按钮
2. 阵型摘要卡
   - 当前已放置英雄列表
   - 对应 slotId、seat、roles

### 3.2 关键交互

第一阶段支持：

- 切换布局
- 为每个槽位选择英雄
- 清空单个槽位
- 清空整个阵型
- 实时提示 seat 冲突
- 实时生成阵型摘要

第一阶段暂不支持：

- 拖拽
- 批量替换
- 布局缩放
- 导出分享链接

---

## 4. 数据模型建议

### 4.1 当前已存在模型

```ts
interface FormationLayout {
  id: string
  name: string
  notes?: string
  slots: FormationSlot[]
}

interface FormationSlot {
  id: string
  row: number
  column: number
}
```

### 4.2 阵型草稿建议模型

后续应补一个与页面状态脱钩的草稿结构：

```ts
interface FormationDraft {
  layoutId: string
  placements: Record<string, string>
  updatedAt: string
}
```

说明：

- `layoutId`：当前采用的布局
- `placements[slotId] = championId`
- `updatedAt`：用于“最近编辑”排序和存档同步

---

## 5. 规则边界

### 5.1 第一阶段只做一条硬规则

- 同一 seat 只能出现一名英雄

这条规则已经由 `findSeatConflicts` 支撑，优先把这条规则做稳。

### 5.2 后续再扩的规则

- 某些变体占位槽不可用
- 冒险 / 变体绑定布局
- 站位前后排关系提示
- 仅允许特定标签英雄上阵

这些都不应直接硬编码在页面 JSX 里，而应逐步沉到规则层。

---

## 6. 布局数据策略

### 6.1 当前策略

- 继续使用 `scripts/data/manual-overrides.json` 维护布局来源
- 归一化后输出到 `public/data/v1/formations.json`
- 页面只消费归一化产物，不直接读脚本源文件

### 6.2 当前注意事项

当前 `formations.json` 明确写的是“手工示例”，并不对应已核实战役布局，因此阵型页文案必须继续强调：

- 这是 MVP 联调布局
- 不是正式战役映射

否则用户会误以为当前布局已经和游戏战役一一对应。

---

## 7. 与方案存档模块的衔接

阵型编辑模块不是终点，后续需要把当前草稿交给方案存档模块。

推荐衔接数据：

- 布局 `layoutId`
- 已放置英雄 `placements`
- 自动提取的已占用 seat 列表
- 用户补充备注
- 当前场景标签

也就是说，阵型页后续最自然的下一步不是“更复杂的编辑器”，而是“把当前草稿安全保存下来”。

---

## 8. 验收标准

第一阶段完成后，应满足：

- 至少能稳定加载 1 组以上布局
- 用户能完成“选布局 -> 放英雄 -> 看冲突 -> 看摘要”的完整流程
- seat 冲突提示能实时更新
- 清空阵型不会留下脏状态
- 后续接方案存档时，不需要推翻当前数据结构

---

## 9. 当前明确不做

- 不做真实战役布局全量核实
- 不做拖拽或动画优先的交互重构
- 不做技能覆盖、DPS 或 BUD 计算
- 不做自动站位优化

---

## 10. 对应文件

- `src/pages/FormationPage.tsx`
- `src/rules/seat.ts`
- `src/domain/types.ts`
- `public/data/v1/formations.json`
- `scripts/data/manual-overrides.json`
