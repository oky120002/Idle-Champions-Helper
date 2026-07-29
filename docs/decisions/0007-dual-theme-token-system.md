# ADR-0007：双主题用纯 token 覆盖切换，不引入双轨类名或 dark: 变体

**Status**: Accepted
**Decided**: 2026-07-29

## 背景

整站原只有深色主题，颜色硬编码在各业务 CSS（`rgb()`/`rgba()`/`#hex`）。产品要求增加白天主题且用户可切换。约束：GitHub Pages 静态站、零运行时成本、不为加主题而维护两套视觉、迁移须零回归（深色现有视觉逐字保留）。

## 决策

单一 token 层承担主题切换：`:root` 为深色默认，`:root[data-theme="light"]` 只覆盖需要翻转的 token；业务 CSS 只引用 token，绝不感知主题。`data-theme` 由 `src/app/theme.tsx` 按 `system`/`light`/`dark` 三态写入，`index.html` 内联脚本在 React 挂载前先写 `data-theme` 防 FOUC。六个子选择：

- **色标记用 oklch**：L/C/H 分量可独立调，浅色翻转按「L 大幅反转、C 略降、H 保持」一条规则即可批量生成与深色呼应的浅值；hex/hsl 做不到感知均匀的跨主题派生。
- **gloss 三档基于 `--color-gloss-base` 派生**：深底 white 提亮、浅底暖深压暗，翻一个基色三档全跟随，不必为浅色另写三档。
- **`color-mix` 稀释锚点必须够强，不能复用带 alpha 的终值 token**：`color-mix(in srgb, var(--T) N%, transparent)` 的产物 alpha = `alpha(T) × N%`。若 `--T` 自身已带 alpha（如浅色 `--color-panel` 仅 0.06），再稀释会双计 alpha，产物落到 0.01–0.03 实质不可见。故派生叠层锚定 `--color-panel-base`（深色与 panel 同值保零回归，浅色提强到 0.3），与 `--color-gloss-base` 同属「为 color-mix 准备的基色」家族；`--color-scrim` 本就不透明，可直接稀释。
- **三种「暗」叠层语义分离，不合并**：`--color-scrim`（图上文字遮罩，随主题翻转，保跨主题可读）、`--color-backdrop`（模态遮罩，两主题都暗以突出模态）、投影（`color-mix(in srgb, black X%, transparent)`，两主题都暗）。三者都暗但服务不同可读性目标。
- **品牌色（铜/钢/金）与 categorical（`--cat-*`）/稀有度色两主题共用不翻转**：它们是数据语义，跨主题色相稳定；只有底色/文字/边框/阴影/gloss 翻转。
- **三态而非二值开关**：默认跟随系统以尊重 OS 偏好，`matchMedia` 订阅实时响应系统切换。
- **纯 token 覆盖而非 `dark:` 变体或双轨类名**：选择器与结构两主题完全一致，主题只是 token 值的差异；`scripts/check-colors.ts` 守护禁止业务 CSS 出现任何颜色字面量。

## 后果

- 正面：加/改颜色只动 `tokens.css` 一处；主题切换零条件分支、零双轨；深色视觉零回归（深值逐字保留）；守护脚本阻断未来硬编码回潮。
- 代价：新颜色须在 `tokens.css` 登记并按需成对提供深浅值；`color-mix` 与 `oklch` 依赖现代浏览器（目标浏览器均支持）。
- 关注：浅色取值的视觉协调（各组件 L/C/alpha 搭配）需人工切 `npm run dev` 确认；技术可读性（文字/背景 L 差 >65%）已自动保证。

## 替代方案

- **`dark:` 变体 / `@media` 分支写两份颜色**：颜色散落各处、维护成本高且易漂移；否决。
- **双轨类名（`.light`/`.dark` 显式）**：选择器翻倍、结构耦合主题，违背「主题只是值」；否决。
- **二值开关（无跟随系统）**：不尊重 OS 偏好，移动端体验差；否决。
- **gloss 三档各写两主题共六值**：可工作但浅色调色时三档需逐一手调，`--color-gloss-base` 单钮派生更省且不易漂移。
- **scrim / backdrop / 投影合并为一个「暗」token**：丢失「图上文字遮罩需随主题翻、模态遮罩与投影不需」的可读性语义；否决。

## 关联

- 依据：`docs/specs/guidelines/ai-first-css.md` §5（颜色 token 规则）、`.impeccable.md`（双主题视觉基线）
- 落地：`src/styles/foundations/tokens.css`、`src/app/theme.tsx`、`src/app/ThemeToggle.tsx`、`index.html`（FOUC 内联脚本）、`scripts/check-colors.ts`（守护）
