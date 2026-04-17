# 英雄筛选页滚动稳定性排查

- 日期：2026-04-13
- 作用：本页只做滚动稳定性主题入口；细节已拆到 `docs/investigations/runtime/champions-filter-scroll/`。
- 当前结论：问题不是单一原因；当前修复采用“三层稳定”方案：禁用根滚动锚定、结果区高度过渡 + 必要时平滑回带、桌面端筛选区粘性侧栏。

## 先读哪篇

- 复现结论、修复方案、当前仍有效的判断：`docs/investigations/runtime/champions-filter-scroll/problem-and-fix.md`
- 浏览器级回归范围与依据：`docs/investigations/runtime/champions-filter-scroll/validation.md`
