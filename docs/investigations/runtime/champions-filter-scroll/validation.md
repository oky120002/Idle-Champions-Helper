# 滚动稳定性：验证范围与依据

- 日期：2026-04-13
- 目标：记录这轮滚动稳定性修复已经补了哪些回归，哪些文件和命令构成依据。

## 当前验证范围

已补并执行的浏览器级回归：

- `tests/e2e/champions.scroll-stability.spec.ts`
  - 连续点击座位筛选时，整页 `scrollY` 保持稳定
  - 在长列表场景下收窄到少量结果时，页面会被带回结果区而不是被夹到页面顶部
  - 结果区快捷按钮可一键跳到底部，再返回结果顶部
- `tests/e2e/filter-layout-stability.spec.ts`
  - 英雄筛选页首次出现“当前筛选”摘要时，不会把结果说明段落向下推挤
  - 英雄筛选页在桌面宽度下向下滚动时，筛选区会保持粘性位置
  - 英雄筛选页桌面宽度下主内容区已放宽，不再维持旧版窄布局
- `tests/component/championsPage.filters.test.tsx`
  - 无匹配时可直接放开结构筛选或一键清空全部条件
  - 默认先展示 `48` 名英雄，并支持切换到显示全部再收起

## 本次验证依据

- `src/pages/ChampionsPage.tsx`
- `src/styles/global.css`
- `tests/e2e/champions.scroll-stability.spec.ts`
- `tests/e2e/filter-layout-stability.spec.ts`
- `tests/component/championsPage.filters.test.tsx`
- 本地命令：`npm run lint`
- 本地命令：`npx vitest run --project component tests/component/championsPage.filters.test.tsx`
- 本地命令：`npm run build`
- 本地命令：`npx playwright test tests/e2e/champions.scroll-stability.spec.ts tests/e2e/filter-layout-stability.spec.ts`
