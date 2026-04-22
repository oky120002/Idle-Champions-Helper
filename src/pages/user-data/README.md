# User data feature map

面向后续 AI 修改时的最小加载入口。

## 推荐加载顺序

1. `src/pages/UserDataPage.tsx`
   - 先看页面如何接入全站工作台壳层、工具条和右侧内容区；导入边界说明和下一阶段说明也已经直接并回这里。
2. `src/pages/user-data/useUserDataPageModel.ts`
   - 看当前输入状态、导入方式切换、解析动作和 sample 填充。
3. `src/pages/user-data/UserDataWorkbench.tsx`
   - 看按钮、导入方式 tabs 和主工作台结构。
4. `src/pages/user-data/UserImportFields.tsx`
   - 看三种输入方式对应的字段。
5. `src/pages/user-data/UserImportResultPanel.tsx`
   - 看 idle / success / error 状态与脱敏预览。
6. `src/pages/user-data/user-import-model.ts`
   - 看 messages、本地解析分派和 sample 默认值。

## 关键不变量

- 当前页只在浏览器本地解析，不联网、不自动持久化凭证。
- 切换导入方式时必须把 `parseState` 重置回 `idle`。
- `填入脱敏示例` 只填充当前所选导入方式的字段。
- Support URL 成功解析后必须继续展示 `network` 卡片；其他方式不展示。
- 回归至少跑 `tests/component/app.test.tsx` 与 `tests/unit/data/userImport.test.ts`。
