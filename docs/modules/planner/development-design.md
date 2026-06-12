# 自动阵型计划器开发设计

## 当前事实

- 站点是 `Vite + React + TypeScript` 静态站，生产部署在 GitHub Pages，必须继续兼容 `HashRouter` 与 `import.meta.env.BASE_URL`。
- 公共数据入口是 `npm run data:official`，会抓取中英文 definitions，归一化 `champions.json`、`champion-details/<id>.json`、`adventures.json`、`patrons.json`、`variants.json`、`game-rules.json`、`effect-reference.json`、`patron-perks.json`、`trials.json`、`formations.json`、`enums.json`，并同步立绘、动画、专精图和宠物数据。
- 当前私人数据页支持 Support URL、手填凭证和日志文本的本地解析预览；用户点击手动同步后，浏览器请求官方只读接口并把归一化快照写入 IndexedDB。
- IndexedDB 已包含 `formationDrafts`、`formationPresets`、`userProfileSnapshots` 和可选 `credentialVault` store；默认同步流程不保存凭证。
- 当前仓库已经落下 planner 的首批领域实现与测试；后续继续扩能力时，应优先沿 `src/domain/planner/*` 与 `public/data/v1/planner-*.json` 的确定性合同推进，而不是把规则继续堆回页面或一次性脚本。
- 当前 planner 已能稳定消费一批直接影响自动化阵型质量的官方目标语义：全阵型过滤、列方向关系、绝对前后两列、倒数列、邻接图距离，以及 `attack_type` 这类可静态落地的 carry 过滤条件。
- 当前 planner 还新增了一层确定性合同：`formationCountPositionQualifier`。它把“这个效果按谁来计数”的站位语义从受益目标语义里拆出来，供 parser、评分和测试复用。
- 当前 planner 还新增了一层确定性合同：`bonusScaleOfSignal`。当官方效果属于 `buff_upgrade*` 家族时，构建阶段会先解析被加成的基础升级信号，再生成一条派生 planner signal，把“增强已有 buff”的语义稳定保留下来，供评分与测试复用。
- 当前 `buff_upgrade*` 已优先打通高价值静态子集：`buff_upgrade`、`buff_upgrades`、`buff_upgrade_per_any_tagged_crusader_mult`、`buff_upgrade_per_any_crusader_where_mult`、`buff_upgrade_per_target_crusader`，以及按槽位距离增强基础 buff 的 `buff_upgrade_mult_by_distance_from_source_mult`。这些子集都走同一条 derived-signal 链路，不再各自维护第二套黑盒解析。

## 目标架构

```text
public/data/v1/*              公共游戏基座数据
public/data/v1/planner-*.json 推荐专用归一化 planner model
browser credential input       用户手动输入的凭证，只在前端内存中使用
IndexedDB user snapshot        归一化私人账号快照
IndexedDB planner overrides    浏览器本地 planner 语义覆盖
src/domain/simulator/*         数字层、基线、effect、评分
src/domain/planner/*           场景、候选池、合法性、搜索和排序
src/pages/planner/*            自动计划工作台 UI
scripts/private-user-data/*    本机开发私有抓取和泄漏扫描
```

页面层只编排状态和展示。凭证解析、官方只读 client、用户快照、模拟器和 planner 搜索都要放在邻近领域模块中，避免把长规则写进 JSX。

## 分篇阅读

- 数据、隐私、目录与存储：`docs/modules/planner/development-design-data.md`
- 推荐英雄、站位、planner model 与 merge 策略：`docs/modules/planner/recommendation-and-placement-design.md`
- 数字层、基线、模拟器、搜索、UI 与测试：`docs/modules/planner/development-design-simulator.md`

## 目录设计

- `src/data/user-sync/`：官方只读 client、allowlist、同步状态、payload normalizer。
- `src/data/user-profile-store/`：IndexedDB snapshot store 与可选 credential vault。
- `public/data/v1/planner-*.json`：供推荐引擎直接消费的归一化 planner model。
- `scripts/data/planner-semantic-overrides.json`：仓库跟踪的推荐语义补丁。
- `src/domain/user-profile/`：`UserProfileSnapshot`、`OwnedChampionState`、`ImportedFormationSave`、装备、feat、传奇和 warning 类型。
- `src/domain/simulator/`：`GameNumber`、最后专精基线、金币预算基线、英雄模拟 profile、effect parser、稳态评分。
- `src/domain/planner/`：variant rule projection、候选池、假设英雄公平基线、阵型合法性、beam search 和结果模型。
- `src/pages/planner/`：profile 状态面板、场景选择、候选模式、基线输入、结果卡和保存 preset 操作。
- `scripts/private-user-data/`：敏感扫描、私有 env loader、私有快照 manifest、后续只读抓取脚本。

## 执行约束

- Ralph 必须按 `.ralph/tasks/planner/acceptance-cases.md` 先写测试，再实现。
- 每个 story 只做指定范围，完成后单独 commit。
- UI 验收用 DOM、文本和状态断言，不用截图或图片识别。
- 任何无法静态计算的变量进入 warnings，不静默纳入 score。
