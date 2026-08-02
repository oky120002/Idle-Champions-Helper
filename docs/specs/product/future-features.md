# 未来特性清单

> 产品层面的**未来能力与需求库**。记录明确当前不做、但将来可能做的特性。
>
> **区别于**：
> - `TODO.md`（auto-todo canonical 区）：推进主目标时顺手发现、暂不展开的工程问题/优化（代码层面）
> - `changes/`：正在做或即将做的变更
> - `decisions/`（ADR）：技术决策的「为什么」
>
> 本清单是**需求库**性质：每条说明「是什么、为何暂缓、关联调研、粗优先级」，**不做排期**。
>
> 优先级约定：**劣后** = 主体收敛后再考虑；**待评** = 需更多信息或外部条件才能决策。

## 特性

### 护送占位（escort slot locking）

- **是什么**：护送任务（`slot_escort` / `slot_escort_by_area` / `slot_escort_wandering` mechanic）中，非英雄单位（鸡 / 小鬼 / VIP / Drizzt 等）占据一个阵型槽位。完整建模需：锁定该槽不放入英雄、并纳入护送目标（若为英雄）的能力贡献。
- **为何暂缓**：游戏官方导出数据**未标注护送目标占据的具体槽位**——`formations.json` 的槽位只有位置字段（`row` / `column` / `x` / `y` / `adjacentSlotIds`），无「护送槽」标记；`variant.mechanics` 只给 `slot_escort` 布尔标志，不给槽位 id。曾用「column 降序锁前排首槽」启发式（commit 历史），但属猜测、与游戏实际占位不符。现已移除全部占位逻辑，**所有阵型按全槽可用处理**。
- **数据源缺口**：要精确实现，需补一张「护送关卡 → 护送目标占哪个槽」的映射。游戏客户端运行时知道（玩家可见），但未进入导出的 JSON。两条路：①翻 `data:fetch` 拉下的完整原始 dump 逐字段找是否有未提取的字段；②人工校准各护送关（玩一遍记槽位）。
- **优先级**：劣后（锦上添花）。当前姿态不影响主体加成计算；护送关的槽位空着只是少放一个英雄，不致错误推荐。

### 动画资源仓库体积治理（E1）

- **是什么**：1214 个动画 .bin（共 192MB）直接进 git，评估迁移到外部存储缓解仓库膨胀。
- **为何暂缓**：调研确认 GitHub Pages 原生不支持 git-lfs（访客拿到指针文件而非真实内容），且小文件群用 lfs 指针开销反而更重；192MB 在 GitHub 推荐 <1GB 安全区。当前无部署压力。
- **关联**：[git-lfs-pages-support.md](../../research/deployment/git-lfs-pages-support.md)
- **优先级**：待评。若未来仓库体积成真痛点，首选 Release Assets。

### 条件性攻击加成建模（A3）

- **是什么**：对特定**种族 / 年龄 / 性别 / 小队**的攻击加成（effect_def tag 限定、favored_foe 等）目前保守丢弃（带 filter 未解析 → 不生效）。
- **为何暂缓**：条件性、实现复杂、收益边际，属锦上添花。当前姿态已符合「精确优先」原则（宁可不算，不要错算成无条件过度生效）。
- **关联**：[damage-bonus-sources.md §5](../../research/data/planner/damage-bonus-sources.md)
- **优先级**：劣后。主体加成正确性收敛后再做。

### 未建模加成源补建（A1 后续）

- **是什么**：vulnerability 条件生效 / modron（齿轮）/ 成就 / 药水 / gem / feat（专长）/ legendary（传奇装备）等伤害加成来源尚未接入评分。
- **为何暂缓**：A1 主体（同 key 跨源加法 bug）修复后，这些才暴露为真实正向偏差来源；逐类需核定 amount 与生效条件。vulnerability 条件生效 ROI 可能最高（生产 enemyTypes 含种族，数据已具备）。
- **关联**：[damage-bonus-sources.md §4、§7 选项 B](../../research/data/planner/damage-bonus-sources.md)
- **优先级**：待评。待 A1 主体决策后排序。

### per-hero 叠层默认值（A5）

- **是什么**：叠层初始值（pre_stack）当前统一默认 1000（满层），可引入 per-hero per-mechanism 合理默认。
- **为何暂缓**：体验/默认值缺口，非正确性；UI 已可按冒险区域手调。逐英雄逐机制定默认数据量大、收益不明。
- **关联**：[data-blindspot-audit.md §3.4](../../audits/data-blindspot-audit.md)
- **优先级**：待评。维持手调现状（默认 1000，可调整）。
