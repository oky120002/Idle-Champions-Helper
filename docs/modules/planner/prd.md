# 自动阵型计划器 PRD

## 背景

当前站点主要是公共游戏资料查询：英雄、变体、阵型、方案存档、宠物和个人数据凭证解析。用户真正想要的是“在不同关卡、不同阵型、不同拥有英雄和不同可激活假设下，自动计算较优上场英雄和阵型”。

第一阶段目标不是做全玩法完整模拟器，而是建立一个可解释、可验证、可逐步增强的本地 planner。

## 用户目标

- 我能输入自己的账号凭证，手动拉取官方私有数据，并确认这些数据只留在本地浏览器。
- 我能看到私人数据快照存在多少天，并手动刷新或删除。
- 我能选择目标 campaign/adventure/variant 与阵型。
- 我能选择只计算已拥有英雄，或把未拥有英雄加入假设对比。
- 我能调整未拥有英雄的假设，不被默认无装备/无 feat 误导。
- 我能让系统基于金币预算和最后专精基线估算英雄等级。
- 我能看到 top formation results，包含 score、位置、核心解释和无法支持的变量。
- 我能把满意结果保存为现有 formation preset。

## 非目标

- 不做生产后端、账号系统或云端私人数据存储。
- 不自动轮询刷新私人数据。
- 不把凭证写入 URL、构建产物或提交文件。
- 不做完整逐帧战斗模拟。
- 不把随机、时间窗口、玩家手动操作和不可预测事件当作已精确计算。
- 不使用图片识别作为验收条件。

## 角色与场景

### 本地玩家

玩家打开静态站，进入个人数据页，粘贴 support URL、手动填写 User ID/Hash 或粘贴日志片段。页面解析出凭证后，用户点击“手动同步”，浏览器请求官方只读接口，归一化结果写入 IndexedDB。

### Planner 使用者

玩家进入 planner 页，选择目标变体和阵型布局。系统读取公共 `public/data/v1` 与本地 `UserProfileSnapshot`，生成可上场候选、等级基线、评分和候选阵型。

### 开发者

开发者可用环境变量或 `.local` 文件提供私有凭证，运行 scripts 一次性抓取开发快照到 `tmp/private-user-data/`。这些数据不得提交，也不得进入前端构建。

## 用户流程

### 私人数据获取

```text
打开个人数据页
  -> 选择凭证输入方式
  -> 本地解析并脱敏预览
  -> 点击手动同步
  -> 前端调用官方只读接口
  -> 归一化为 UserProfileSnapshot
  -> 写入 IndexedDB
  -> 页面显示更新时间和快照年龄
```

同步入口必须是手动操作。同步失败时显示安全错误，不显示完整凭证。

### Planner 计算

```text
进入 planner 页
  -> 读取本地 UserProfileSnapshot
  -> 选择目标 variant/adventure 和 formation layout
  -> 选择候选模式 owned-only / all-hypothetical / manual override
  -> 选择或确认金币预算基线
  -> 运行 legality + scoring + search
  -> 查看 top results 和 warnings
  -> 保存为 preset
```

## 页面需求

### 个人数据页扩展

- 无快照：提供凭证解析和手动同步入口。
- 有快照：显示快照更新时间、距今天数、拥有英雄数量、导入阵型数量和 warning 数。
- 同步：必须由用户点击触发；不自动刷新。
- 删除：删除 snapshot 和可选凭证 vault。
- 错误：不包含完整 user id/hash。

### Planner 页

- 使用工作台布局，不做营销页。
- 顶部显示 profile 状态和私人数据年龄。
- 左侧或工具区提供 scenario、formation、candidate mode、baseline 输入。
- 主区显示 result cards：score、slot assignments、解释和 warnings。
- 结果可保存到 formation preset。
- 长限制文本必须以文本可访问，不依赖图片。

## 数据需求

### 公共基座数据

现有 `npm run data:official` 已抓取并生成：

- `champions.json`
- `champion-details/<id>.json`
- `variants.json`
- `formations.json`
- `enums.json`
- 头像、立绘、动画、宠物等资源

planner 需要审计 definitions 中对模拟器有用但尚未归一化的字段，生成覆盖报告，不要一开始假设数据已经齐全。

### 私人用户快照

`UserProfileSnapshot` 至少包含：

- snapshot id、schema version、updatedAt、source summary
- owned champions
- equipment / loot / rarity / item level
- feats
- specializations
- legendary effects
- favor / blessing / campaign progress
- imported formation saves
- warnings

## 计算需求

### GameNumber

底层使用大数库，业务只接触 `GameNumber` wrapper。必须支持 parse、format、multiply、divide、pow、log10、compare、sort，以及带阈值的 add。显示默认游戏记数法。

### 等级基线

默认基线是金币预算 + 最后专精：

- 从英雄 upgrades 中提取最高专精所需等级。
- 根据 cost curve 和目标金币预算估算可负担等级。
- 如果可负担等级低于最后专精，标记 `below-baseline`。
- 固定 1 级只作为调试模式。
- 不提供默认 100 级模式。

### 评分

第一阶段只计算可预计算的稳态 DPS 类加成：

- global DPS
- hero DPS
- adjacent support
- tagged champion multiplier
- 可识别的 positional hints

未知 effect、事件变量、随机触发和复杂条件进入 warnings。

## 隐私需求

- 生产凭证不能发到本项目后端。
- 不自动保存凭证。
- 不自动刷新私人快照。
- 私人数据只写 IndexedDB。
- 开发私有快照只写 `tmp/private-user-data/`。
- 必须提供 `npm run privacy:scan`，阻止真实凭证和私人路径进入提交或构建。

## 验收总则

- 每个 Ralph story 必须先测试后实现。
- 每个完成 story 必须单独 commit。
- story 不能修改允许范围外的文件，除非写入 decision log。
- 任何无法计算的模拟变量必须有 warning。
- 最终通过 `npm run lint && npm run typecheck && npm run test:run && npm run build && npm run privacy:scan`。
