# 阵型编辑模块设计稿

- 设计日期：2026-04-13
- 模块目标：让用户能基于真实英雄数据和官方 definitions 自动提取的阵型布局，完成最小可用的“选布局 -> 放英雄 -> 看 seat 冲突 -> 形成草稿”闭环。
- 当前结论：第一阶段优先做阵型草稿编辑器，并把“最近草稿保存 / 恢复”纳入阵型页自身闭环；不直接追求真实战役全覆盖、拖拽交互或复杂规则模拟。

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
  - 当前由官方 definitions 自动提取唯一布局，并保留适用上下文映射
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
- 保存最近草稿
- 恢复最近草稿

第一阶段暂不支持：

- 拖拽
- 批量替换
- 布局缩放
- 导出分享链接

---

## 4. 数据模型建议

### 4.1 当前已存在模型

```ts
interface ScenarioRef {
  kind: 'campaign' | 'adventure' | 'variant' | 'trial' | 'timeGate'
  id: string
}

interface FormationLayout {
  id: string
  name: LocalizedText
  notes?: LocalizedText
  slots: FormationSlot[]
  applicableContexts?: ScenarioRef[]
  sourceContexts?: FormationContext[]
  laneHints?: {
    front?: string[]
    middle?: string[]
    back?: string[]
  }
}

interface FormationSlot {
  id: string
  row: number
  column: number
  x?: number
  y?: number
  adjacentSlotIds?: string[]
}
```

补充说明：

- 当前 `public/data/v1/formations.json` 已包含 `applicableContexts / sourceContexts`
- `laneHints` 仍可继续作为派生字段预留，避免后续补“前后排关系”时再重定义 `FormationLayout`

### 4.2 阵型草稿建议模型

后续应补一个与页面状态脱钩的草稿结构：

```ts
interface FormationDraft {
  schemaVersion: 1
  dataVersion: string
  layoutId: string
  scenarioRef: ScenarioRef | null
  placements: Record<string, string>
  updatedAt: string
}
```

说明：

- `schemaVersion`：草稿结构版本，便于后续迁移
- `dataVersion`：保存时对应的公共数据版本，例如 `v1`
- `layoutId`：当前采用的布局
- `scenarioRef`：当前草稿绑定的真实场景上下文；当前布局数据已经带 `applicableContexts`，但在页面完成场景筛选前仍允许为空
- `placements[slotId] = championId`
- `updatedAt`：用于“最近编辑”排序和存档同步

### 4.3 加载校验与回退策略

阵型草稿在恢复时，必须先校验下面几类引用：

- `dataVersion` 是否仍可识别
- `layoutId` 是否仍存在
- `scenarioRef` 若存在，其对应场景 / 规则上下文是否仍可识别
- `slotId` 是否仍属于该布局
- `championId` 是否仍能在当前英雄数据中找到

恢复语义必须分两层：

1. 优先按保存时的 `dataVersion` 恢复
   - 如果仓库仍保留该版本目录，例如 `v1/`
   - 就优先读取该版本下的 `formations / champions`
2. 仅在旧版本目录不可用时，才进入兼容恢复
   - 使用当前版本数据校验
   - 并明确告诉用户这是“兼容模式”，不是原样恢复

建议回退策略：

1. 保存版本可读且完全匹配
   - 直接恢复
2. 保存版本可读但部分失效
   - 保留仍然有效的放置结果
   - 列出失效布局 / 槽位 / 英雄
   - 让用户选择“重新保存”或“丢弃失效引用”
3. 保存版本不可读，转兼容恢复
   - 尝试用当前版本做校验
   - 明确提示“当前基于新版本兼容恢复，结果可能有偏差”
4. 整体失效
   - 不自动静默恢复
   - 以明确提示引导用户丢弃旧草稿

为支撑这套语义，数据访问层后续应补“按指定版本读取集合”的能力，而不是只能读取 `version.current`。

### 4.4 最近草稿的持久化策略

最近草稿不是页面内临时状态，而是本地持久化对象。

建议介质：

- 正式持久化统一走 `IndexedDB`
- 不再单独为草稿补一套长期 `localStorage` 方案

建议读写时机：

1. 页面初始化时
   - 读取最近一次草稿
   - 若存在且可恢复，则询问用户是否恢复
2. `layoutId` 或 `placements` 变化后
   - 以防抖方式自动保存最近草稿
3. 用户点击“清空当前阵型”且当前草稿为空时
   - 同步清理最近草稿记录
4. 用户“保存为方案”时
   - 不删除最近草稿
   - 让工作草稿与命名方案分层共存

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

- 默认从官方 definitions 的 `campaign_defines / adventure_defines` 提取阵型布局
- 归一化后输出到 `public/data/v1/formations.json`
- 页面只消费归一化产物，不直接读脚本源文件
- `scripts/data/manual-overrides.json` 仅用于必要的布局覆写与补充说明

### 6.2 当前注意事项

- 同一布局会被多个战役 / 冒险 / 变体复用，因此 `formations.json` 需要保留 `sourceContexts / applicableContexts`
- 页面当前还没有把这些上下文做成筛选器，所以默认先按“唯一布局库”消费
- `language_id=7` 对部分新活动或时空门条目仍可能回退英文原文

否则用户会误以为当前布局已经和游戏战役一一对应。

---

## 7. 与方案存档模块的衔接

阵型编辑模块不是终点，后续需要把当前草稿交给方案存档模块。

这里要明确区分两类对象：

1. 阵型页负责
   - 正在编辑的工作草稿
   - 最近草稿的保存与恢复
2. 方案存档页负责
   - 已命名、可复用、可管理的方案库

推荐衔接数据：

- 布局 `layoutId`
- 已放置英雄 `placements`
- 自动提取的已占用 seat 列表
- 用户补充备注
- 当前场景标签

其中需要区分两层：

- `scenarioRef`：用于恢复和校验的正式场景身份
- 场景标签：用于卡片展示或用户理解的可读文案

不要只把“推图 / 试炼 / 某变体”写成自由文本标签，否则后续恢复时无法唯一定位规则上下文。

也就是说，阵型页后续最自然的下一步不是“更复杂的编辑器”，而是“把当前草稿安全保存下来”。

“保存为方案”应由阵型页发起，但写入结果进入方案存档模块管理；“最近草稿”本身不应和命名方案库混为一层。

---

## 8. 验收标准

第一阶段完成后，应满足：

- 至少能稳定加载 1 组以上布局
- 用户能完成“选布局 -> 放英雄 -> 看冲突 -> 看摘要”的完整流程
- seat 冲突提示能实时更新
- 清空阵型不会留下脏状态
- 最近草稿能被保存并恢复
- 最近草稿的读写介质与时机明确，不再留给实现阶段临时决定
- 旧草稿在公共数据变动后不会静默损坏
- 草稿若绑定了场景上下文，恢复时不会把 `scenarioRef` 悄悄降级成纯文本标签
- 后续接方案存档时，不需要推翻当前数据结构

### 8.1 当前实现更新（2026-04-13）

当前仓库已落下列实现：

- 阵型页会在初始化时读取最近草稿，并提供“恢复 / 先保留不恢复 / 丢弃旧草稿”三种处理入口。
- `layoutId / placements / scenarioRef` 变化后，会以防抖方式把最近草稿写入 `IndexedDB`。
- 恢复逻辑已经支持“优先按保存时 `dataVersion` 原样恢复；旧版本不可读时退回兼容恢复并显式提示”。
- 清空阵型且阵型为空时，会同步清理最近草稿记录，避免残留脏状态。
- 阵型页已新增“保存为方案”入口，把当前工作草稿转成命名方案并交给方案存档模块管理。

当前对应实现文件：

- `src/pages/FormationPage.tsx`
- `src/data/formationDraftStore.ts`
- `src/data/formationPersistence.ts`
- `src/data/localDatabase.ts`
- `src/data/client.ts`
- `src/domain/types.ts`

### 8.2 当前验证结果（2026-04-13）

- `npm run build`：通过
- `npm run lint`：通过
- 浏览器自动化验收：已在 `danger-full-access` 会话中通过，覆盖“放英雄 -> 最近草稿自动保存 -> 刷新恢复 -> 保存为方案 -> 方案恢复 -> 删除方案”主链路
- 受限会话里的 Playwright 启动失败记录仍保留在 `docs/investigations/runtime/playwright-browser-launch-verification.md`

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
