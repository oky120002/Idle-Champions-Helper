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
7. `src/pages/user-data/useUserSyncModel.ts`
   - 看手动同步、IndexedDB 快照读取、删除和安全错误展示。
8. `src/data/user-sync/officialClient.ts`
   - 看官方只读端点 allowlist、URL 构造和安全 fetch 选项。
9. `src/data/user-sync/userProfileNormalizer.ts`
   - 看官方 payload 到 `UserProfileSnapshot` 的容错归一化。

## 关键不变量

- 当前页只在浏览器本地解析凭证；只有用户点击 `手动同步` 后才请求官方只读接口。
- 凭证默认只驻留在内存中，不自动持久化；同步结果写入本地 IndexedDB 快照。
- 切换导入方式时必须把 `parseState` 重置回 `idle`。
- `填入脱敏示例` 只填充当前所选导入方式的字段。
- Support URL 成功解析后必须继续展示 `network` 卡片；其他方式不展示。
- 同步失败展示安全错误，不显示完整 User ID 或 Hash。
- 回归至少跑 `tests/component/userDataPage.importModes.test.tsx`、`tests/component/userDataPage.syncFlow.test.tsx`、`tests/component/app.test.tsx` 与 `tests/unit/data/userImport.test.ts`。
