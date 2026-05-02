# 自动阵型计划器总体计划

## 目标

把当前“信息集合体”升级为本地优先的自动计划模块：用户选择目标地图/变体、阵型、候选英雄范围和预算基线后，系统基于公共游戏基座数据与本地私人账号快照，计算可解释的上场英雄和阵型候选。

本计划只定义第一条可落地纵切。后续开发由 `.ralph/tasks/planner/` 的 Ralph story 执行；本目录负责 PRD、开发设计和验收标准。`US-001` 和 `US-002` 属于规划与运行基座，必须由当前规划分支完成；Ralph 从 `US-003` 开始做业务实现。

## 硬边界

- 生产环境没有后端，不能把个人凭证发送到本项目后端。
- 凭证只在浏览器中用于手动同步官方私有数据；默认不保存凭证。
- 私人快照只保存到本地浏览器 IndexedDB；页面显示快照年龄，不自动刷新。
- 开发用私人凭证只允许来自环境变量或被忽略的 `.local` 文件，输出只进入 `tmp/private-user-data/`。
- 规划分支不做 `src/` 业务实现；Ralph 后续按验收用例开发、测试并逐任务提交。
- 不追求完整战斗模拟；只计算可预计算的稳态伤害和明确可解释加成。
- 暂不支持的变量必须进入 warnings，不能静默当作已计算。

## 总体路线

1. **规划与 Ralph 基座**：由当前分支完成文档、`.ralph` 任务包、运行脚本、`ralph-tui` 验证和验收用例。
2. **隐私护栏**：新增敏感输出扫描、开发凭证加载、私人快照 manifest，先防泄漏再抓数据。
3. **用户快照**：定义 `UserProfileSnapshot`，用 IndexedDB 保存拥有英雄、装备、feat、传奇、favor/blessing、进度和游戏内阵型保存。
4. **官方只读同步**：前端 allowlist 只允许 `getuserdetails`、`getcampaigndetails`、`getallformationsaves` 等只读调用。
5. **数字与基线**：引入 `GameNumber` wrapper，默认使用“最后专精 + 金币预算”基线，固定 1 级只保留调试。
6. **模拟数据投影**：从公开英雄详情投影 upgrades、feats、loot、legendary effects 和 raw effect strings，并输出覆盖报告。
7. **候选池与合法性**：支持 owned-only、all-hypothetical、manual override；校验 seat 冲突、禁用、强制和锁定 slot。
8. **评分与搜索**：用可解释稳态评分和 deterministic beam search 产出 top results。
9. **Planner UI**：新增 planner 工作台，显示 profile 状态、场景选择、结果卡、warnings，并可保存为 preset。
10. **最终关卡**：隐私扫描、lint、typecheck、测试、build 全部通过。

## 本分支交付

- 完成 `.ralph` 通用运行层和 `.ralph/tasks/planner/` 任务包。
- 完成 planner 总体计划、PRD、开发设计和最终任务清单。
- 完成每个 Ralph story 的 TDD 验收用例。
- 标记 `US-001`、`US-002` 为已完成，避免弱模型自举规划任务。
- 不实现 `src/` 业务代码，不运行 Ralph 开发循环。

## 关键决策

### 凭证与私人数据

生产路径是“用户手动输入或粘贴凭证 -> 浏览器请求官方只读接口 -> 归一化快照 -> IndexedDB”。凭证默认只驻留在内存中，同步完成后丢弃。若未来增加“记住本机凭证”，必须是显式 opt-in、只在本机浏览器保存、可一键删除，并仍然禁止自动刷新。

开发路径使用 `IC_PRIVATE_USER_ID` 和 `IC_PRIVATE_HASH` 环境变量或 `.local` 文件，抓取结果只写 `tmp/private-user-data/<timestamp>/`，并由 scanner 阻止进入提交或构建产物。

### 基线

默认计算基线不是 1 级或 100 级。第一纵切使用：

```text
目标地图/区域 + 账号 favor/blessing + 关卡金币估算 + 英雄 cost curve
  -> 可负担等级
  -> 与最后专精所需等级对比
  -> 可计算稳态伤害
```

如果预算低于最后专精等级，结果标记为 `below-baseline`，不能静默接受。1 级只用于调试与 parser smoke test；100 级不作为默认模式。

### 数字层

使用 `break_eternity.js` 这类 incremental-game 大数库，但只允许通过 `GameNumber` wrapper 接触业务代码。比较、乘法、除法、幂和 `log10` 走 wrapper；显示层格式化为游戏风格如 `1.50e92`。加法使用集中阈值：当较小项不会影响显示精度和排序时直接返回较大项。

### 未拥有英雄公平性

未拥有英雄默认不直接使用“无装备/无 feat”作为唯一基线。优先使用账号中同 seat 已拥有英雄的中位装备/feat 假设；同 seat 不足时使用账号全局中位数；空账号才明确标记为 `no-equipment/no-feat`。

### 算法

第一纵切用 deterministic beam search，而不是全量暴力搜索。每个候选结果必须包含 score、placements、解释、assumptions 和 warnings。未来可扩展 speed/gem、survival、balanced scoring 和 step simulation。

## 外部参考

- Byteglow 用户配置入口：`https://ic.byteglow.com/user`
- 社区常见获取方式：游戏内 support URL 通常包含 `user_id` 和 hash；部分平台可能需要向官方支持请求 User ID/Hash。
