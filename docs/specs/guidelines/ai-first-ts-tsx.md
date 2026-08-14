# AI-first TS / TSX 开发规范

- 适用范围：`src/**/*.ts`、`src/**/*.tsx`、`tests/**/*.ts`、`tests/**/*.tsx`
- 目标：在 100% AI 开发前提下，降低一次任务的无关上下文、误改概率和回跳次数。

## 1. 结构优先级

- 页面入口只做编排：路由参数、顶层 Hook、区块组合、动作透传。
- 纯规则、状态机、长链式派生、边界适配放 `.ts`；视觉区块和局部交互壳层放 `.tsx`。
- 一个目录优先对应一个 feature；一个文件优先只承载一个主职责。
- 超过 5 个核心文件的 feature，补一个局部 `README.md`，只写入口、状态来源、主要子模块和不变量。

## 2. 默认读取顺序

1. `Page.tsx` / 入口组件
2. `usePageModel.ts` / `usePageState.ts`
3. 区块组件或动作模块
4. `model.ts` / 规则模块
5. `types.ts` / `constants.ts`

不要为了改一处而先扫完整个 feature；命中后再逐层展开下一跳。

## 3. 体量预算

| 类别 | 默认保留 | 评估拆分 | 应拆 | 必须拆 |
| --- | --- | --- | --- | --- |
| `.ts`（model / hook / rule / adapter） | <= 240 | 241-320 | 321-480 | > 480 |
| `.tsx`（区块 / 组件） | <= 180 | 181-260 | 261-360 | > 360 |
| 页面入口 `.tsx` | <= 220 | 221-320 | 321-420 | > 420 |
| 测试 / fixture | <= 260 | 261-360 | 视内容决定 | 大型字面量应先抽 builder |

这些阈值服务于 token 成本，不是为了把文件切得越小越好。

## 4. 拆分规则

- 先按读者意图拆：入口编排、状态、动作、纯派生、类型、静态映射。
- 常见修改若总是同时碰到两类逻辑，就不要硬拆成更多文件；应该换更自然的边界。
- 大型常量、schema、标签表、fixture 优先单独落文件，避免把页面入口变成数据仓库。
- 不在 JSX 中直接写复杂变换；先命名中间结果，必要时下沉到 `.ts`。
- 注释只用于业务陷阱、状态边界、兼容性约束；重复解释性注释应删。

## 5. AI-first 约束

- 命名导出优先，禁止 `default export`。
- 新代码默认优先 `type`；只有公共对象契约确实需要扩展时才用 `interface`。
- 禁止新增 `utils.ts`、`helpers.ts`、`common.ts`、`misc.ts`。
- Barrel 只允许局部、稳定、低扇出的聚合；禁止跨 feature 全量出口。
- Effect 只用于外部同步；能在 render 或纯函数阶段完成的计算，不放进 Effect。
- 共享渲染组件（Canvas 等纯渲染壳）的副作用回调（drop/scroll/拖放等）必须条件挂载：回调未传则不挂 handler，避免只读消费方误接 `preventDefault` 等副作用而成为错误的事件目标。
- 同页可能多实例的组件，DOM `id` 用 `useId()` 实例唯一化：模块常量 id 在 `display:none` 共存或多实例渲染时重复（违反 HTML 唯一性 + `aria-controls` 指向错误目标 + 测试被迫用多匹配 scoping 适配）；`data-testid` 多实例重复同理，能合并实例或加后缀就先合并，别让测试靠 scoping 兜底。
- 交互元素语义必须与实际行为一致：可点击元素用 `<button>` 且必须接 `onClick`；纯拖拽源（无点击动作）用 `<div draggable>`，不渲染 `<button onClick={undefined}>`（button 不可激活却消耗 tab 顺序 + 误导用户可点击）。
- ARIA 角色必须补齐其要求的容器与关联属性：`role="radio"` 在 `role="radiogroup"` 内、`role="tab"` 在 `role="tablist"` 内并接 `aria-controls`+`tabpanel`；半实现的 ARIA 比不用更误导（承诺了不提供的交互契约）。复制既有组件模式时连 a11y 一起复制正确，否则缺口随复制扩散。
- 同一数据 + 同一动作不建两个展示组件：两个组件消费同一 props 集合、触发同一回调、渲染同源数据时合并为一个；"换皮再展示一遍"是冗余，不是新增价值。
- 简化数据生产者时同步删无人消费的字段，测试不得断言死字段：删一条生产分支后留下无人读取的字段即死代码；若仅测试在断言该字段（如 `buildCandidatePool` 产的 `isHypothetical` 无生产消费方），测试反而掩盖死代码——简化后回归一遍字段消费方。
- 引擎/纯函数算出的结构化中间量（pool/signal/factor 拆解等）在输出契约原样透出，不压成展示字符串丢弃：`scoreFormation` 曾把 pool 拆解压成 `"hero: kind x1.5 -> carry"` 字符串塞进 explanations 又被上层忽略，导致「每位英雄加成」数据存在却拿不到。展示叙事由消费层从结构化数据生成，引擎只产结构化数据（+ 可选附带叙事）。
- JSON 输出契约里声明"可超 `Number.MAX_VALUE` / JSON 可序列化"的字段统一走游戏记数法字符串，不得用 `.toNumber()` 回退 number：decimal.js Decimal 一经 `.toNumber()` 就可能溢出为 `Infinity`，`JSON.stringify` 静默变 `null`，契约无报错崩坏（`SimulationBreakdown.levelCurve` 曾声明字符串却赋 number，高 level carry 直接丢值）。这类字段必须配 `JSON.parse(JSON.stringify(...))` 往返断言——`typeof === 'string'` 与"往返后不为 null"双保险，否则类型声明与序列化现实漂移无人察觉。
- 新增引擎入口与既有入口的限制语义必须对称：`evaluateFormation`（评估指定阵型）不像 `buildPlannerRecommendation`（搜索）那样在候选阶段过滤 `only_allow_crusaders` 白名单与未拥有英雄，就必须把这两类违规以 warning 体现——否则用户指定的非法/低质阵型被静默按 level 1 评估，两入口结果不可比。新入口的合法性/数据质量检查清单对照既有入口逐条核对，别让"不搜索"变成"不校验"。
- `exactOptionalPropertyTypes: true` 下，可选属性 `prop?: T` 接受 `T` 但**不接受显式 `undefined`**：值来源是 `T | undefined`（如三元 `cond ? str : undefined`）时，类型必须写 `prop?: T | undefined`，否则赋 `undefined` 报 TS2375。透传链上每跳都要带 `| undefined`——`ActionButtonItem.disabledReason` 曾写成 `string` 而底层 `ActionButtonProps` 是 `string | undefined`，中间层漏写让 `string | undefined` 传不下去，typecheck 红、vitest 靠 esbuild 转译照常绿（见 testing.md §7），回归混进 main。

- 多模式共用字段命名取超集概念，不用单模式量名或遗留泛名：被 carry-dps（carryDps）与 team-gold（teamGoldFind）共用的输出字段叫 `score` 会与已淘汰的启发式评估混淆、叫 `carryDps` 在 team-gold 模式名实不符——改 `objectiveValue`（优化目标量）模式中性、见名知意。内部管道（`ScoringResult`）同理：跨模式字段要么改中性别名，要么注释点明"当前模式目标量，非单模式量"。

## 6. 国际化（i18n）

全站双语（zh-CN / en-US），通过 `useI18n()` 获取中央字典 `t('中文 key', params?)` 翻译函数。领域诊断使用 `MessageRef`，外部单语文本使用 `{ literal }`。

- **所有用户可见文本必须走 `t()`**：JSX 文本节点、`aria-label`、`placeholder`、`title` 一律使用中央字典 key，禁止新增内联双语对象或硬编码产品文案。
- **工具函数返回用户可见标签时必须接收 `locale`**：`formatXxxLabel(value, locale)` 返回当前语言文本，禁止返回单语硬编码。
- **生产存根（`.prod.ts`）签名必须与 dev 版完全一致**：vite alias 在构建时替换 import，TypeScript 只检查 dev 签名，prod 存根签名漂移在类型检查中不可见。位置参数不匹配时第一个参数被绑定到错误的形参（如 dev `(source, locale)` → prod `(locale)` 时 `source` 值 `'browser-sync'` 被当作 `locale`），导致 prod 构建永远返回错误语言。**新增参数时必须同步更新 `.prod.ts` 存根签名**，即使存根不消费该参数也要声明为 `_param` 占位。
- **组件缺少 `useI18n()` 时先补 Hook**：无 `t()` 的组件（如 `ConfirmDialog`）加 `useI18n()`；有 `locale` prop 的组件用 `locale === 'zh-CN' ? '中' : 'EN'` 三元（与同目录其他组件一致）。
- **`aria-label` 是高频遗漏点**：组件已有 `t()` 但 `aria-label` 仍写死单语字符串是最常见模式，新增或修改 `aria-label` 时务必检查。
- **两种语言相同的技术标识符无需包裹**：`graphic id`、`Support URL` 等在 zh/en 下一致的术语不强制走 `t()`，避免无价值仪式。

## 7. 大数计算（GameNumber / decimal.js）

游戏数值可达 `1e1000`+，远超 JS number 上限。统一走 `gameNumber.ts`（ADR 0014）。

- 库：`decimal.js`，封装为 `GameNumberValue`。**只有 `gameNumber.ts` 可直接 import，业务代码一律用 wrapper，禁止直接 import。**
- wrapper：`parseGameNumber` / `formatGameNumber` / `multiplyGameNumbers` / `divideGameNumbers` / `powerGameNumber` / `addGameNumbers` / `compareGameNumbers`（排序用）/ `log10GameNumber`（仅离线校准）。
- 序列化：可超大数边界的字段走游戏记数法字符串，禁止 `.toNumber()` 回退（见 §5）。

## 8. 例外与减债

- 长字符串、大型映射、生成代码、测试夹具可以适度豁免，但必须保持职责单一。
- 超大文件按”触碰即减债”处理：本次改到它，就至少顺手拆出一层更自然的边界。
- 如果某次拆分会让高频任务必须额外多开多个文件，就先回退这次拆分思路，换更稳的边界。
