# 可访问性侦察（轮 9）

度量基准日：2026-08-01（分支 `opencode/dev1`，commit `6c5b7604`）。
透镜：键盘 / 焦点 / 通告 / 移动端触控 / 动态对比度。前置侦察——**发现 ≥2 个真 a11y 缺口才展开完整审计，否则登记「侦察健康」收口**。

## 1. 侦察范围与实测

| 区域 | 查法 | 发现 |
|---|---|---|
| 阵型拖拽编辑键盘可达 | 读 `FormationBoardCanvas.tsx` + `FormationBoardGrid.tsx` + `responsive.css` | **有键盘替代**：桌面每槽位 `<select aria-label>`（原生键盘可达）；移动 tap-target `<button>` 覆盖层 + `FormationMobileEditor`（HeroPicker button 模式）。DnD 是渐进增强，非唯一路径 |
| 动态内容通告 | 全仓 `aria-live`/`role=status`/`role=alert`/`aria-busy` 扫描 | **完备**：`PlannerPage`/`PlannerEvaluatePage` loading=`role=status aria-busy`、error=`role=alert`、result=`role=status`；`PlannerScenarioSelection` summary=`aria-live=polite`、empty=`role=status`；user-data/sync/preset 各 `role=alert`/`status` |
| 焦点管理 | loading/error 态是否焦点陷阱 | **无陷阱**：loading 是区域态（非 modal），`aria-busy`+`role=status` 通告，不禁焦 |
| 触控目标 | `responsive.css` mobile 槽位尺寸 | **达标**：tap-target `position:absolute;inset:0` 覆盖 `min-height:4.4rem`(~70px) 槽位，远超 44px 最小 |
| 静态对比度 | `check-colors`/`check-color-contrast` lint | 已接入 lint（查硬编码色 + 静态对比度）；浅主题可读性已审（见 [[theme-color-readability-audit]]） |
| ARIA 语义 | slot/select/button aria-label 核查 | select/button aria-label 描述性（"槽位 X 英雄选择"）；tap-target `aria-pressed`；**见 §2 唯一缺口** |

动态对比度（:hover/:active/:disabled 态）未深测——lint 仅覆盖静态，列为已知侦察边界（不达展开阈值）。

## 2. 唯一发现（P2，未达展开阈值）

**carry 标记 aria-label 被祖先 aria-hidden 废掉**（`FormationBoardCanvas.tsx:96`）：

```
<div className="formation-slot__summary" aria-hidden="true">   <!-- :96 祖先隐藏 -->
  ...
  <span aria-label="核心输出位"><Crown aria-hidden/></span>      <!-- :112-117 aria-label 对 AT 失效 -->
```

`aria-hidden="true"` 在祖先上会把**所有后代**移出可访问性树（含显式 aria-label 的元素）。意图（向 AT 通告 carry 槽位）未达成。`aria-hidden` 祖先本身合理（避免 avatar 与 select 双重通告英雄名），副作用是 carry 标记被一同隐藏。

**影响低**：carry 信息在结果卡 breakdown 文本中可读，棋盘仅作视觉辅助。**修复成本**：无 `sr-only`/visually-hidden 工具类，正确修复需新增 CSS 工具类或把 carry 移出 aria-hidden 子树（跨结构，非单行）。登记 P2，不当轮动手。

## 3. 结论

**侦察健康**。1 项 minor ARIA 缺口（carry 标记，影响低、信息冗余可得），不达「≥2 个真 a11y 缺口」展开阈值。键盘可达（DnD+select/button 双路径）、动态通告、触控目标、焦点管理均就位。**不展开完整 `a11y-audit.md`，收口**。
