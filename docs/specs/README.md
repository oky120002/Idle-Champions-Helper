# specs/ —— 活跃规范

系统的活跃规范：**当前是什么、怎么工作**。随实现演进重写。

## 子目录

- [`guidelines/`](./guidelines/)：系统级开发规范（TS/CSS/测试/数据归一化/移动端/视觉/文档治理）
- [`product/`](./product/)：产品定义（价值定位、产品形态、核心数据模型）
- [`modules/`](./modules/)：模块规范（每模块自治：README + design + rules + acceptance + contract）

## 核心规则

- **只描述「现在是什么」**，不描述「曾经计划做什么」或「里程碑交付了什么」
- **永不引用 `plans/` / milestone**（避免规范变谎言；计划落地后 specs 更新为最终态即可）
- 禁迁移叙事（历史对比、版本演进、已完成的迁移过程不写入）
- 决策依据指向 `decisions/`（ADR），不在规范里嵌决策叙事
- 外部事实指向 `research/`，不重展

## 何时读

- 改代码前 → 读对应 `modules/<name>/` 或 `guidelines/`
- 改产品定义 → 读 `product/`
- 确认「现在系统是怎样」→ 这里（不是 `plans/` 或 `archives/`）

## 何时写/更新

- 实现了新功能/改了行为 → 更新对应 specs
- plan 落地（`plans/` Status: Landed）→ 按其「落地后」清单更新 specs

详细的模块结构见 [`modules/README.md`](./modules/README.md)；跨类型写作与生命周期规则见 [`governance.md`](../governance.md)。
