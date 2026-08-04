# Lint 修法表

每种违规的修法由 **message** 决定（不只看规则名）。修复时先读 message，按下表对症，**禁止套统一模板**。

## 配置（基于行业共识，详见 [[lint-rule-industry-consensus]]）

- **typescript-eslint**：`strictTypeChecked`（官方严格共识）+ 手动加回 `strict-boolean`/`prefer-optional-chain`/`prefer-readonly`（不在 strictTypeChecked）
- **strict-boolean-expressions**：`allowString: false`、`allowNumber: false`（''/0 误会要明确）+ 默认（nullable+any 报，nullable object 不报，纯 boolean 总允许）
- **prefer-nullish-coalescing**：`ignorePrimitives: {string,number,boolean,bigint}`（原始类型 `||` 保留，对象改 `??`）
- **no-confusing-void-expression**：`ignoreVoidOperator: true`（社区共识，允许 `void fn()` 显式标记）
- **no-unnecessary-condition**：`allowConstantLoopConditions: 'only-allowed-literals'`（允许 `while(true)` 惯用法）
- **sonarjs**：recommended + 关闭 AWS/服务端安全/注释/命名/测试规则（vitest 项目用 @vitest/eslint-plugin）
- **jsx-a11y / import-x / @vitest/eslint-plugin**：recommended

## helper（tests/utils/dom-assertions.ts）

`unwrap<T>(value: T | null | undefined, msg): T`（非空或抛错）｜`queryOrFail(container, selector): Element`（querySelector 找不到即抛）

**当前 3088 违规，62 规则。**

---

## typescript-eslint（strictTypeChecked + 手动加回）

### strict-boolean-expressions（703，allowString/Number: false）

| message 类型词 | 修法 |
|---|---|
| 纯 `string` ... empty string | `if (x !== '')` |
| 纯 `number` ... 0 | `if (x !== 0)` |
| `string \| null/\|undefined` ... nullish/empty | `if (x != null && x !== '')` |
| `number \| null` ... nullish/0 | `if (x != null && x !== 0)` |
| `boolean \| null` ... nullish/false | `if (x === true)` |
| `Element \| null` 等对象 ... nullish | `if (x != null)`（对象无 falsy）|
| `any` ... explicit comparison | 缩小类型（标注/守卫）或显式比较 |

### restrict-template-expressions（461，strictTypeChecked 默认最严：allowAny/Boolean/Number/Nullish/RegExp/Never 全 false）

`${非string}` → `String(x)` / `x.toString()` / `.toFixed(n)`（浮点精度）

### no-non-null-assertion（353）

`querySelector(s)!`→`queryOrFail(c,s)`｜`arr[i]!`→提取+`if(x===undefined)throw`｜`fn()!`→`unwrap`｜`obj.prop!`→改类型/可选链

### no-confusing-void-expression（254，ignoreVoidOperator: true）

void 表达式当值 → 显式 `return void fn()`（规则允许）或改返回类型

### no-unnecessary-condition（108，allowConstantLoopConditions: 'only-allowed-literals'）

永真/假条件（类型已保证）→ 删条件或修类型标注。`while(true)`/`for(;;)` 字面量允许

### no-deprecated（40）

用 @deprecated API → 换非废弃替代

### no-unnecessary-type-conversion（26）

冗余转换（`!!x` x 已 boolean、`String(x)` x 已 string）→ 删冗余

### no-dynamic-delete（8）

`delete obj[动态key]` → 固定 key 或用 Record/Map

### prefer-optional-chain（17，手动加回）

`a && a.b` → `a?.b`（注意 `a && a.b()` 改 `a?.b()` 前确认 nullish 不应调用）

### prefer-nullish-coalescing（14，ignorePrimitives）

对象类型 `||` → `??`；原始类型 `||` 保留（规则已忽略）

### no-unnecessary-template-expression（6）

单变量 `${x}` 模板 → 直接 `x`

### use-unknown-in-catch-callback-variable（3）

catch 回调用 unknown → 显式 `unknown` 类型

### no-unnecessary-boolean-literal-compare（2）/ no-unnecessary-type-parameters（2）/ prefer-reduce-type-parameter（1）/ restrict-plus-operands（1）/ prefer-readonly（少量，手动加回）

按 message；prefer-readonly 给私有字段加 `readonly`

---

## sonarjs

### shorthand-property-grouping（305）

简写属性移到对象开头或尾

### prefer-read-only-props（160）

React props 接口成员加 `readonly`（Edit 精确，禁 sd）

### no-nested-conditional（90）

嵌套三元 → 早返回 / if-else / 映射

### 复杂度类：max-lines-per-function（81）/ cognitive-complexity（36）/ expression-complexity（36）

拆子函数 / 提取中间变量 / 早返回（`.test.ts` 已豁免规模类）

### no-reference-error（61）

多为动态访问 → 确认引用 / 加守卫 / 修类型

### prefer-regexp-exec（26）

`string.match(regex)` 取组 → `regex.exec(string)`

### no-alphabetical-sort（25）

`sort()` 无 compare → 加 compare

### no-inconsistent-returns（20）

函数 return 不一致 → 统一

### 正则类：super-linear-regex（13）/ concise-regex（7）/ regex-complexity（3）/ duplicates-in-character-class（2）

简化正则

### no-wildcard-import（9）

`import *` → 具名

### max-union-size（8）/ nested-control-flow（7）/ no-floating-point-equality（7）/ no-nested-template-literals（6）/ no-misleading-array-reverse（4）

按 message（拆类型/早返回/epsilon/提取变量/`toReversed()`）

### no-identical-functions（2）/ 分支重复 no-all-duplicated-branches（2）等

提取共享 / 合并分支

### 类型/规范小项（各 1-3）

different-types-comparison / function-return-type / void-use / use-type-alias / redundant-type-aliases / destructuring-assignment-syntax / no-nested-assignment / no-undefined-argument / no-undefined-assignment —— 按 message

---

## import-x（剩余手动）

### no-named-as-default（17）

default 导出当具名 → 重命名 import

### no-cycle（3）

循环依赖 → 重构模块边界，**不豁免**

---

## vitest

### no-conditional-expect（65）

`if (cond) expect` → 拆独立 it / `expect.unreachable`

### expect-expect（1）/ valid-expect（1）

加断言 / 修用法

---

## jsx-a11y

### click-events-have-key-events（4）/ no-static-element-interactions（2）/ no-noninteractive-element-interactions（2）

onClick 无键盘 / 非交互元素接事件 → `<button>` 或 `onKeyDown`+`role`+`tabIndex`（拖拽源 `<div draggable>` 可豁免）

### no-redundant-roles（4）/ no-autofocus（1）/ role-supports-aria-props（1）

删冗余 role / 删 autofocus / 修 aria 匹配 role

---

## core eslint

### max-lines（32）

拆文件（`.test.ts` 已豁免）

### complexity（23，圈复杂度）

拆函数 / 早返回 / 映射

---

## react-hooks

### exhaustive-deps（2）

补 effect 依赖；若死循环则重构（ref/拆 effect），**不 disable 掩盖**

---

## 修复流程（强制）

1. **读 message**（类型词/场景），不只看规则名
2. **查表对症**：string 带 `!== ''`、number 带 `!== 0`、object 用 `!= null`、any 先缩类型
3. **不套模板**：禁止统一 `!== null && !== undefined`
4. **改完验证**：`npx eslint <file>`（0 违规）+ `npx tsc -b`（无新 typecheck 错）
5. **不确定标注**：表未覆盖或语义存疑的，**不硬改**，标注确认
