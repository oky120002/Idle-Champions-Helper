# 英雄详情 Kleho 式内容区改造 TODO

## 目标

- 保持整站页面骨架为上方工作台 toolbar + 下方内容区。
- 只在英雄详情下方内容组件内部实现局部左右布局。
- 借鉴 Kleho 英雄详情的信息密度、左资料栏和 tab 组织，但保留本站深色战术台风格。

## 全局约束

- 不做 Links tab。
- Skins tab 只提供查看和本地预览入口，不提供下载按钮、下载文案或下载链接。
- Loot / Legendary 只来自官方 definitions 归一化数据，不做运行时第三方请求。
- 移动端必须回到单列上下结构，不能横向溢出。
- 每完成一个 TODO，更新本文件状态。

## Checklist

- [x] 1. 创建工作树和分支：`codex/champion-detail-kleho-layout`。
- [x] 2. 创建 `kleho-layout-todo.md`，写入本计划的 checklist。
- [x] 3. 扩展 `ChampionDetail` 数据合同：新增 `loot`、`legendaryEffects`，不新增 `links`。
- [x] 4. 扩展归一化脚本：从 `loot_defines` 和 `legendary_effect_defines` 生成详情数据。
- [x] 5. 补归一化测试 fixture，验证 Loot / Legendary 输出。
- [x] 6. 重构 `ChampionDetailBody` 内容区骨架：全站仍上下结构，内容区内部局部左右布局。
- [x] 7. 重构左侧资料栏：压缩英雄身份、头像、属性、角色、来源、计数字段。
- [x] 8. 实现 tab 状态与 hash 兼容：Specializations、Abilities、Loot、Legendary、Feats、Skins、Story & Misc。
- [x] 9. 实现 `Specializations` tab：默认打开，专精对比 + 关键升级轨道。
- [x] 10. 实现 `Abilities` tab：基础攻击、大招、事件升级、非专精关键能力。
- [x] 11. 实现 `Loot` tab：装备 slot、稀有度、名称、描述、效果摘要。
- [x] 12. 实现 `Legendary` tab：按 6 个装备槽位展示传奇效果。
- [x] 13. 实现 `Feats` tab：复用并压缩现有天赋内容。
- [x] 14. 实现 `Skins` tab：只查看和预览，不提供下载按钮、下载文案或下载链接。
- [x] 15. 实现 `Story & Misc` tab：角色卡、背景故事、系统字段、原始字段折叠区。
- [x] 16. 收敛 CSS：深色战术台风格、桌面局部左右、移动端单列、无横向溢出。
- [x] 17. 更新详情页文档和数据合同说明。
- [x] 18. 跑验证：`lint`、`typecheck`、`test:run`、`build`，可用时跑相关 Playwright 检查。
- [x] 19. 更新 TODO MD 的验证记录。
- [ ] 20. 提交、合并到 `main`、推送远端、同步本地。本地提交与合并已完成；推送远端因 GitHub 直连超时且当前环境无代理候选而阻塞。

## 验证记录

- `node --test scripts/normalize-idle-champions-definitions.test.mjs`：通过。
- `npm run lint`：通过；剩余 3 个既有 warning（`ChampionResultCard.tsx` hook dependency、`skelanimCanvasModel.test.ts` 行数）。
- `npm run typecheck`：通过。
- `npm run test:run -- tests/component/championDetailPage.content.test.tsx tests/component/championDetailPage.navigation.test.tsx tests/component/championDetailPage.interactions.test.tsx`：通过。
- `npm run test:run`：通过，68 个 test files / 187 个 tests。
- `npm run build`：通过。
- Playwright system Chrome 预览检查：桌面为上 toolbar + 下内容区，内容区内部左资料栏 + 右 tab；移动端单列；无 Links tab；页面文本无下载 / download。
