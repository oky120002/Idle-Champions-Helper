# 导航与语言切换规范

- 作用：约束站点主导航、壳层密度和中英切换入口，避免顶部区域重新长回“说明过多、控件过碎、还要点开第二层”的状态。

## 主导航

1. 一级导航不显示序号；用户任务是找入口，不是读编号。
2. 导航按钮优先直接展示名称，并适度放大点击面积。
3. 桌面端保持一行紧凑导航；空间不足时优先缩文案、调密度，不恢复横向滚动。
4. 移动端继续用纵向 / 多列面板，不允许依赖横向滑动才能看到全部主入口。

## 语言切换

1. 当前仅有中英两种语言时，不使用下拉或二级弹层；渲染为单个 `<button role="switch" aria-checked>` toggle，点击翻转当前语言。
2. toggle 内部 track / thumb 与两个 option label（中 / EN）配合表达选中态，不再额外复制一层“当前语言”触发器。
3. 桌面端在顶栏（`ToolbarLocaleSwitcher`）与主导航面板（`PanelLocaleSwitcher`）同时渲染入口；移动端（≤720px）通过样式隐藏顶栏版本，收为导航面板一处。

## 壳层密度

- 顶部 sticky 区域优先保留导航、语言切换和当前页面识别信息。
- 非首页收紧态下，导航、语言切换和品牌条需要同步缩小，但仍保持可读可点。
- 如果某次改动会让顶部区域重新出现明显的高度跳增或横向溢出，应视为回归。

## 当前实现

- 主导航实现：`src/app/PrimaryNavigation.tsx` + `src/styles/app/navigation.css`
- 顶部状态与收紧逻辑：`src/app/SiteHeader.tsx`、`src/app/useSiteHeaderState.ts`、`src/styles/app/site-header.css`
- 语言切换：`src/app/LocaleSwitcher.tsx`
