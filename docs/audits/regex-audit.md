# 全站正则表达式审计

**审计日期**: 2026-08-14  
**范围**: `src/`、`scripts/data/` 生产代码及其 co-located 测试  
**来源**: TODO `atd_regex_audit_001`  
**状态**: 已收口

## 盘点

使用 TypeScript AST 盘点正则字面量与 `new RegExp()`，共发现 277 处：

| 范围 | 数量 |
|---|---:|
| 生产代码 | 122 |
| 测试代码 | 155 |
| 动态 `RegExp` 构造 | 5 |

动态构造中，生产代码为搜索高亮和属性门槛解析；搜索项先经过 `escapeRegExp`，不会把用户输入当作正则语法执行。测试中的动态构造仅用于文本匹配断言。

## 审查结论

- `src/data/userImport.ts`、`src/domain/abilities/heroPredicate.ts`、`src/domain/effects/effect-string.ts`、`src/pages/champion-detail/effect-payload.ts` 的协议解析正则均有锚点或明确边界，未发现字符类遗漏、错误转义或可导致误解析的贪婪匹配。
- `src/features/search/searchHighlight.ts` 对用户搜索词做正则元字符转义后再构造表达式；空词、Unicode 和多个词项由现有测试覆盖，未发现 ReDoS 扩散路径。
- `scripts/data/normalize-adventures.ts`、`scripts/data/official-rule-helpers.ts` 和 `scripts/data/restrictions-parser.ts` 的动态文本解析使用有限长度/明确关键字边界；交替符插值处使用非捕获分组，未发现裸 alternation 改变复合模式优先级的问题。
- 其余正则主要是日期、标识符、分隔符、格式化和测试断言，未发现需要改动的业务缺陷。

## 已修复缺陷

`restrictions-parser.ts` 原先会把以下文本：

`every 8-10 seconds, dealing 40% damage to a random Champion`

解析成 `healthDrainRate=0.05`。但 `ViabilityContext.healthDrainRate` 只表达全局/携带位有效生命扣减，不能表达随机目标概率；这会把单英雄随机受击错误放大为持续全局伤害。现改为：

- `random Champion` burst 不折算为 `healthDrainRate`，保留“未解析 restriction” warning；
- 明确作用于每名英雄的 burst 仍可解析；区间取最短间隔（例如 `8-10` 取 8）作为保守上界；
- 已重建 `public/data/v1/scenarios.json`，9 个随机目标 burst 不再进入 `healthDrainRate`。

## 未改动但已确认的边界

`scenarioWarnings` 对已解析可行性文本仍可能保留 warning，这是有意的保守提示：当前面积模型只消费数值近似，不能证明自然语言 restriction 的全部机制均已覆盖。未知机制不因某个正则局部命中而静默消失。

## 验证

- `scripts/data/restrictions-parser.test.ts`：86 tests passed。
- `npm run typecheck`、`npm run lint`、构建及 `git diff --check` 通过；正则解析与文档治理回归测试共 102 个通过。全量测试有 4 个与本审计无关的失败（3 个 UI 用例、1 个文档治理用例；文档治理用例已修复后单独复验），3 个 UI 用例已记录独立 TODO。
