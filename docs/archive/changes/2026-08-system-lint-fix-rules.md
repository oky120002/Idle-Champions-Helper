**Status**: Landed

# Lint 修法表

每种违规的修法由 **message** 决定（不只看规则名）。先读 message 再按下表对症，**禁止套统一模板**。配置见 `eslint.config.js` 与里程碑 `2026-08-system-lint-fix.md`（共识详见 [[lint-rule-industry-consensus]]）。

helper（`tests/utils/dom-assertions.ts`）：`unwrap<T>(value, msg): T`（非空或抛）｜`queryOrFail(container, selector): Element`（querySelector 找不到即抛）。

## typescript-eslint（strictTypeChecked + 手动加回）

### strict-boolean-expressions — 看 message 类型词（最大头）

| 类型词 | 修法 |
|---|---|
| 纯 `string` | `if (x !== '')` |
| 纯 `number` | `if (x !== 0)` |
| `string \| null/undefined` | `if (x != null && x !== '')` |
| `number \| null/undefined` | `if (x != null && x !== 0)` |
| `boolean \| null` | `if (x === true)` |
| 对象 \| null（Element 等） | `if (x != null)`（对象无 falsy） |
| `any` / `unknown` | 缩小类型（标注/守卫）或显式比较；`unknown` 真值判断常可 `x == null \|\| typeof x !== 'object'`（typeof 兜底原始 falsy） |

### 其他 tseslint 规则

| 规则 | 修法 |
|---|---|
| restrict-template-expressions | `${非string}` → `String(x)`/`x.toString()`/`.toFixed(n)` |
| no-non-null-assertion | `querySelector(s)!`→`queryOrFail`；`arr[i]!`→提取+`if(===undefined)throw`；`fn()!`→`unwrap`；`obj.prop!`→改类型/可选链 |
| no-confusing-void-expression | void 当值 → `return void fn()` 或改返回类型 |
| no-unnecessary-condition | 类型已保证的永真/假条件 → 删条件或修类型（`while(true)`/`for(;;)` 字面量允许） |
| no-deprecated | 换非废弃替代（如 zod4 `ZodTypeAny`→`ZodType`、`.passthrough()`→`.loose()`） |
| no-unnecessary-type-conversion | 冗余 `!!`/`String()` → 删 |
| prefer-optional-chain | `a && a.b`→`a?.b`（确认 nullish 不应调用；需类型收窄时保留 `!= null` 守卫并 disable） |
| prefer-nullish-coalescing | 对象 `\|\|`→`??`；原始类型保留（规则已忽略） |
| no-dynamic-delete | `delete obj[动态key]`→固定 key 或 Map |
| 其他小项 | no-unnecessary-template-expression（`${x}`→x）/ use-unknown-in-catch（`:unknown`）/ prefer-readonly（私有字段加 readonly）/ no-unnecessary-boolean-literal-compare / no-unnecessary-type-parameters / prefer-reduce-type-parameter / restrict-plus-operands——按 message |

## sonarjs

| 规则 | 修法 |
|---|---|
| shorthand-property-grouping | 简写属性移到对象首/尾 |
| prefer-read-only-props | React props 接口成员加 `readonly`（Edit 精确，禁 sd） |
| no-nested-conditional | 嵌套三元 → 早返回/if-else/映射 |
| 复杂度类（max-lines-per-function/cognitive/expression-complexity） | 拆子函数/提取变量/早返回（`.test.ts` 豁免规模类） |
| no-reference-error | 多为 Node 全局（Buffer/process/RequestInit）→ `import { Buffer } from 'node:buffer'`/`import process from 'node:process'`；与全局签名冲突者（RequestInit）disable 带理由；余者加守卫/修类型 |
| prefer-regexp-exec | `string.match(re)` 取组 → `re.exec(string)` |
| no-alphabetical-sort | `.sort()` 无 compare → 加 compare（string 用 `localeCompare`） |
| no-inconsistent-returns | 函数 return 不一致 → 统一 |
| 正则类（super-linear/concise/complexity/duplicates-in-character-class） | 简化正则；输入受限的固定格式（如 CSS tokens、游戏数据表达式）可 disable 带理由 |
| no-wildcard-import | `import *` → 具名 |
| max-union-size/nested-control-flow/no-floating-point-equality/no-nested-template-literals/no-misleading-array-reverse | 拆类型/早返回/epsilon/提取变量/`toReversed()` |
| no-identical-functions/no-all-duplicated-branches | 提取共享/合并分支 |
| 类型/规范小项 | different-types-comparison/function-return-type/void-use/use-type-alias/redundant-type-aliases/destructuring-assignment-syntax/no-nested-assignment/no-undefined-argument/no-undefined-assignment——按 message |

## import-x

| 规则 | 修法 |
|---|---|
| no-named-as-default | default 导出当具名 → 重命名 import |
| no-cycle | 循环依赖 → 重构模块边界，**不豁免** |

## vitest

| 规则 | 修法 |
|---|---|
| no-conditional-expect | `if(cond) expect`→`expect().toBe()+早返回`收窄 或 `expect.unreachable` |
| expect-expect/valid-expect | 加断言/修用法 |

## jsx-a11y

| 规则 | 修法 |
|---|---|
| click-events-have-key-events/no-static-element-interactions/no-noninteractive-element-interactions | → `<button>` 或 `onKeyDown`+`role`+`tabIndex`（拖拽源 `<div draggable>` 可豁免） |
| no-redundant-roles/no-autofocus/role-supports-aria-props | 删冗余 role/删 autofocus/修 aria 匹配 role |

## core eslint / react-hooks

| 规则 | 修法 |
|---|---|
| max-lines | 拆文件（`.test.ts` 豁免） |
| complexity | 拆函数/早返回/映射 |
| react-hooks/exhaustive-deps | 补 effect 依赖；死循环则重构（ref/拆 effect），**不 disable 掩盖** |

## 修复流程（强制）

0. **语义不变（铁律）**：每处修复保持修复前后运行时语义完全一致，只改写法不改逻辑。`string|null` 的 `if (x)` 必须改成 `if (x != null && x !== '')`，单写 `!== ''` 会漏 null；`x!` 去感叹号要确认运行期非空；排序比较器 `||` 链改早返回注意 NaN（原 `||` 视 NaN 为 falsy 回退，盲目 `!== 0` 会返回 NaN）。eslint/tsc 查不出行为漂移。**例外**：若局部改动改变局部真值/行为，必须在邻近代码指认补偿逻辑证明整体等价（哪行补什么）；指认不出即 bug。
1. 读 message（类型词/场景），不只看规则名
2. 查表对症：string 带 `!== ''`、number 带 `!== 0`、object 用 `!= null`、any/unknown 先缩类型
3. 不套模板：禁止统一 `!== null && !== undefined`
4. 改完验证：`npx eslint <file>`（0 违规）+ `npx tsc -b`（无新 typecheck 错）+ 跑相关单测确认语义未变
5. 不确定标注：表未覆盖或语义存疑的**不硬改**，行内 disable 带中文理由
