# 英雄筛选页滚动稳定性排查

- 验证时间：2026-04-13
- 验证对象：`英雄筛选` 页在长结果列表下的筛选交互
- 当前结论：**原问题不是单一原因。除了浏览器根滚动锚定带来的随机跳动外，长结果列表在被快速收窄时还会因为页面总高度骤减而把整页滚动位置直接夹回顶部。当前修复采用“两层稳定”方案：禁用根滚动锚定，并把英雄结果区改为固定高度的内部滚动面板，避免整页高度在筛选时剧烈塌缩。**

---

## 1. 复现结论

本次针对 `#/champions` 做了浏览器级复现，确认存在两类独立但会叠加的体验问题：

1. 当点击筛选条件时，浏览器根滚动锚定会尝试“帮忙”维持视口位置，导致页面出现突兀的上下跳动。
2. 当原始列表很长，而筛选结果骤减到很少甚至为空时，页面总高度会突然缩短；如果当前窗口滚动位置已经低于新页面允许的最大值，浏览器会立刻把整页 `scrollY` 夹回更靠上的位置，体感上像“整页被猛地拽回去”。

第二类问题即使在禁用根滚动锚定后仍会出现，所以不能只靠 `overflow-anchor: none` 解决。

---

## 2. 当前修复方案

### 2.1 全局层：禁用根滚动锚定

在 `src/styles/global.css` 中对 `html, body` 设置：

```css
overflow-anchor: none;
```

目的：

- 去掉浏览器对根页面的自动滚动补偿，避免筛选时出现“随机”跳动。

### 2.2 英雄筛选页层：固定结果区高度

在 `src/pages/ChampionsPage.tsx` 中把结果区域改为：

- 一个固定高度的 `results-panel`
- 元信息区（当前筛选 + 当前展示）
- 一个内部可滚动的 `results-panel__body`

对应样式位于 `src/styles/global.css`：

- `results-panel`
- `results-panel__meta`
- `results-panel__body`
- `results-grid--stable`

目的：

- 让英雄卡片列表在筛选前后都停留在同一个内部滚动容器里
- 即使结果从很多条缩到很少，也不会再让整页高度突然塌掉
- 用户看到的是“结果区内部状态变化”，而不是“整个页面被拉回顶部”

### 2.3 结果区内部滚动回顶

在筛选条件变化时，会把 `results-panel__body` 的内部滚动位置重置到顶部。

目的：

- 当用户刚刚还在浏览长列表底部，接着把结果收窄到很少时，新的结果会从结果区顶部重新呈现
- 避免内部滚动条停留在无意义的旧位置

### 2.4 首次出现“当前筛选”时预留占位

`当前筛选：...` 这行摘要在无筛选条件时仍保留占位，只是隐藏文本。

目的：

- 避免第一次选中筛选项时，结果说明文字被整体向下推一行，造成轻微抖动感

---

## 3. 当前验证范围

已补并执行的浏览器级回归：

- `tests/e2e/champions.scroll-stability.spec.ts`
  - 连续点击座位筛选时，整页 `scrollY` 保持稳定
  - 在结果区内部已经向下滚动的情况下，输入无匹配关键词后，整页不会被猛拉回顶部，结果区内部滚动会重置到顶部
- `tests/e2e/filter-layout-stability.spec.ts`
  - 英雄筛选页首次出现“当前筛选”摘要时，不会把结果说明段落向下推挤

---

## 4. 当前仍有效的判断

- 这个问题本质上是“浏览器滚动行为 + 页面高度突变 + 结果区布局策略”的组合问题
- 单纯修补按钮点击逻辑，或者在事件后强行 `window.scrollTo(...)`，都只是临时补丁
- 让长列表停留在固定高度的结果容器内，是当前最稳妥、最可解释、也最容易回归验证的方案

---

## 5. 本次验证依据

- `src/pages/ChampionsPage.tsx`
- `src/styles/global.css`
- `tests/e2e/champions.scroll-stability.spec.ts`
- `tests/e2e/filter-layout-stability.spec.ts`
- 本地命令：`npm run lint`
- 本地命令：`npx vitest run --project component tests/component/championsPage.filters.test.tsx`
- 本地命令：`npm run build`
- 本地命令：`npx playwright test tests/e2e/champions.scroll-stability.spec.ts --config=.playwright.page-ux.config.ts`
- 本地命令：`npx playwright test tests/e2e/filter-layout-stability.spec.ts --config=.playwright.page-ux.config.ts`
