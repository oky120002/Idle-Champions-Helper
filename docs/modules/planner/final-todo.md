# 自动阵型计划器最终任务清单

本清单是 Ralph 执行总览。详细单例验收以 `.ralph/tasks/planner/acceptance-cases.md` 为准，机器可读队列以 `.ralph/tasks/planner/prd.json` 为准。

## 运行边界

- `US-001` 和 `US-002` 已由当前规划分支完成，后续 Ralph 不再重做规划与自举任务。
- Ralph/`glm-5.1` 从 `US-003` 开始实现业务任务。
- 每个任务必须 TDD：先写指定测试，再写最小实现。
- 每个完成任务必须单独 commit，格式为 `planner: US-XXX ...`。
- 失败最多 3 轮定向修复；仍失败则记录 blocker，不标记通过。
- 不提交凭证、`.env*.local`、`tmp/private-user-data/**`、`dist/`、私人快照或大日志。

建议启动命令：

```bash
RALPH_TASK_RANGE=3-34 RALPH_MAX_ITERATIONS=200 ./.ralph/scripts/run-task.sh planner
```

如果要先小跑：

```bash
RALPH_TASK_RANGE=3-5 RALPH_MAX_ITERATIONS=30 ./.ralph/scripts/run-task.sh planner
```

## 阶段 0：规划基座

| Story | 状态 | 交付 |
| --- | --- | --- |
| US-001 | 当前规划分支完成 | planner 总体计划、PRD、开发设计、最终任务清单和 docs 索引 |
| US-002 | 当前规划分支完成 | `.ralph` 通用脚本、planner 任务包、prompt、决策日志和 `ralph-tui` 验证 |

## 阶段 1：隐私和开发私有数据

| Story | 目标 | 验收重点 |
| --- | --- | --- |
| US-003 | 敏感输出扫描器 | fake secret 命中，占位符不误报，`tmp/private-user-data` 引用会失败 |
| US-004 | 私人环境变量加载器 | 只读 `IC_PRIVATE_USER_ID`/`IC_PRIVATE_HASH` 或显式 `.local`，拒绝 `VITE_` |
| US-005 | 私人快照 manifest | 输出强制在 `tmp/private-user-data/<timestamp>/`，manifest 脱敏 |

## 阶段 2：用户档案基础

| Story | 目标 | 验收重点 |
| --- | --- | --- |
| US-006 | 用户档案领域类型 | owned hero、装备、feat、传奇、formation save fixture 可类型检查 |
| US-007 | IndexedDB 存储 | fake-indexeddb 覆盖 snapshot 保存、读取、删除；默认不保存凭证 |
| US-008 | 官方只读 client allowlist | 允许只读接口，拒绝写接口，固定安全 fetch options |
| US-009 | 用户 payload 归一化器 | mock 用户详情、campaign、formation saves 归一化为 snapshot |
| US-010 | 用户数据页手动同步模型 | 无快照、快照年龄、安全错误、删除流程可组件测试 |

## 阶段 3：数字层和基线

| Story | 目标 | 验收重点 |
| --- | --- | --- |
| US-011A | `GameNumber` 解析和格式化 | `0`、`1.50e92`、`4.08e167`、`1e1000` 和非法输入 |
| US-011B | `GameNumber` 运算和比较 | 乘除幂、`log10`、超大值稳定排序 |
| US-011C | `GameNumber` 加法阈值 | `1e100 + 1e99` 改变尾数，`1e100 + 1e80` 忽略小项 |
| US-012 | 最后专精基线 | 提取最高专精等级，异常等级 warning |
| US-013 | 金币预算基线 | cost curve + budget 返回等级，低于专精标记 `below-baseline` |

## 阶段 4：模拟数据

| Story | 目标 | 验收重点 |
| --- | --- | --- |
| US-014 | 模拟器数据覆盖报告 | definitions key 标记 usefulness、current output、next action |
| US-015 | 英雄模拟 profile 投影 | upgrades、feats、loot、legendary、raw effects、unsupported effects |
| US-016 | Effect parser 核心 DPS 组 | global DPS、hero DPS、未知 prefix 不崩溃 |
| US-017 | Effect parser 位置和标签组 | adjacent、tagged multiplier hints 和 unsupported positional warning |
| US-018 | 变体规则投影 | only/disallow/force heroes 和未知 mechanics warning |

## 阶段 5：候选池和阵型评分

| Story | 目标 | 验收重点 |
| --- | --- | --- |
| US-019 | 候选池模式 | owned-only、all-hypothetical、manual override |
| US-020 | 假设英雄公平基线 | 同 seat 中位数、全局中位数、空账号 fallback |
| US-021 | 导入阵型保存归一化器 | `getallformationsaves` mock 保留专精、feat、familiars 和场景关系 |
| US-022 | 阵型合法性 | seat 冲突、禁用、强制、锁定 slot |
| US-023 | 稳态评分 fixture | adjacent support、global DPS、unsupported warnings |
| US-024 | Beam search 排序 | 4-slot fixture、beam width、Top result 解释 |

## 阶段 6：Planner UI

| Story | 目标 | 验收重点 |
| --- | --- | --- |
| US-025 | 路由和导航 | `#/planner` 可访问，导航可见，HashRouter 兼容 |
| US-026 | profile 状态面板 | 无 profile、快照年龄、warning，不自动刷新 |
| US-027 | 场景选择 | variant 文本筛选、formation 和限制摘要 |
| US-028 | 结果卡片 | 游戏记数法 score、slot 文本、解释和 warning |
| US-029 | 保存为 preset | 写入现有 formation preset，保留 layout/placements/scenario |

## 阶段 7：最终关卡

| Story | 目标 | 验收重点 |
| --- | --- | --- |
| US-030 | `privacy:scan` 脚本 | npm 脚本存在，扫描源码、docs、tests、dist |
| US-031 | 文档同步 | route 存在后同步 README、docs、final TODO |
| US-032 | 最终回归 | lint、typecheck、test、build、privacy scan 全部通过 |

## 明确后续 TODO

- speed/gem 队伍评分。
- survival/稳过关评分。
- balanced scoring：伤害、存活、速度、可获得性和解释复杂度混合。
- step simulation：逐区、击杀、时间窗口和动态堆叠。
- manual parameter panel：允许用户手动覆盖金币预算、装备、feat、传奇、专精和暂不支持变量。
- 更完整的 modron、patron、event、season、temporary buff 投影。
- 多队伍、Trials、Time Gate 和长期成长路线。
