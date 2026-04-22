# 共享组件目录

| 组件 | 路径 | 适用场景 | 关键能力 | 当前使用位置 |
| --- | --- | --- | --- | --- |
| `SurfaceCard` | `src/components/SurfaceCard.tsx` | 页面级大卡片、说明卡、工作台容器 | 统一 `eyebrow / title / description / footer / body` 结构 | 英雄详情、阵型编辑、方案存档、个人数据 |
| `ChampionAvatar` | `src/components/ChampionAvatar.tsx` | 英雄头像、小卡片头像、阵型槽位头像、胶囊标签头像 | 统一头像路径、双语 `alt`、无图回退 | `FormationPage.tsx`、`ChampionIdentity.tsx`、`ChampionPill.tsx` |
| `ChampionIdentity` | `src/components/ChampionIdentity.tsx` | 结果卡标题区、英雄详情头部 | 统一“头像 + eyebrow + 主副名称”身份展示 | `ChampionsPage.tsx`、`FormationPage.tsx` |
| `ChampionPill` | `src/components/ChampionPill.tsx` | 已上阵英雄列表、恢复预览、紧凑型结果 | 统一“小头像 + 单行标签”模式，默认标签含 `seat + 名称` | `FormationPage.tsx`、`PresetsPage.tsx` |
| `LocalizedText` | `src/components/LocalizedText.tsx` | 游戏数据双语字段 `{ original, display }` | 统一主文本 / 副文本渲染，支持 `primary / pair / stacked` | `ChampionsPage.tsx`、`VariantsPage.tsx`、`FormationPage.tsx` |
| `StatusBanner` | `src/components/StatusBanner.tsx` | 加载、成功、错误、兼容恢复提醒 | 统一 `tone / title / detail / meta / actions` 结构 | `ChampionsPage.tsx`、`VariantsPage.tsx`、`UserDataPage.tsx`、`FormationPage.tsx`、`PresetsPage.tsx` |
| `FieldGroup` | `src/components/FieldGroup.tsx` | 带 `label` / `hint` 的字段块和筛选区 | 统一标题、提示和容器结构 | `ChampionsPage.tsx`、`VariantsPage.tsx`、`UserDataPage.tsx`、`FormationPage.tsx`、`PresetsPage.tsx` |
| `PageWorkbenchShell` | `src/components/workbench/PageWorkbenchShell.tsx` | 全站统一桌面工作台壳层 | 统一合并工具条、左抽屉开合、无左栏隐藏模式、双栏内滚和桌面锁滚 | `ChampionsPage.tsx`、`IllustrationsPage.tsx`、`PetsPage.tsx`、`VariantsPage.tsx`、`FormationPage.tsx`、`PresetsPage.tsx`、`UserDataPage.tsx`、`ChampionDetailPage.tsx` |
| `WorkbenchFloatingTopButton` | `src/components/workbench/WorkbenchFloatingTopButton.tsx` | 工作台右侧主滚动区回顶入口 | 统一悬浮返回顶部按钮的文案、图标和交互骨架 | 全站工作台页面 |
