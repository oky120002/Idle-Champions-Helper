# planner：产品范围

## 背景

站点核心是公共游戏资料查询：英雄、变体、阵型、方案存档、宠物和个人数据凭证解析。用户真正想要的是「在不同关卡、不同阵型、不同拥有英雄和不同可激活假设下，自动计算较优上场英雄和阵型」。

planner 不做全玩法完整模拟器，而是一个可解释、可验证、本地优先的推荐引擎。

## 用户目标

- 我能输入自己的账号凭证，手动拉取官方私有数据，并确认这些数据只留在本地浏览器。
- 我能看到私人数据快照存在多少天，并手动刷新或删除。
- 我能选择目标 campaign / adventure / variant 与阵型。
- 我能选择只计算已拥有英雄，或把未拥有英雄加入假设对比。
- 我能调整未拥有英雄的假设，不被默认无装备 / 无 feat 误导。
- 我能看到 top formation results，包含目标量、位置、核心解释和无法支持的变量。
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

玩家打开静态站，进入个人数据页，粘贴 support URL、手动填写 User ID / Hash 或粘贴日志片段。页面解析出凭证后，用户点击「手动同步」，浏览器请求官方只读接口，归一化结果写入 IndexedDB。

### Planner 使用者

玩家进入 planner 页，选择目标变体和阵型布局。系统读取公共 `public/data/v1` 与本地 `UserProfileSnapshot`，生成可上场候选、评分和候选阵型。

### 开发者

开发者可用环境变量、被忽略的 `.local` 文件，或仓库内仅供本地使用的私有 mock / token 输入，运行 scripts 一次性抓取开发快照到 `tmp/private-user-data/`。这些数据可用于本地预览和本地 planner 验证，但不得提交，也不得进入生产构建。

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
  -> 选择候选模式 owned-only / all-hypothetical
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
- 错误：不包含完整 user id / hash。

### Planner 页

- 使用工作台布局，不做营销页。
- 顶部显示 profile 状态和私人数据年龄。
- 无快照时只显示导入引导，不显示推荐结果或保存入口。
- 左侧或工具区提供 scenario、formation、candidate mode 输入。
- 主区显示 result cards：目标量、slot assignments、解释和 warnings。
- 结果可保存到 formation preset。
- 长限制文本必须以文本可访问，不依赖图片。
