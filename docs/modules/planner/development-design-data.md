# Planner 数据与隐私设计

## 数据流

生产私人数据流：

```text
用户粘贴 Support URL / User ID + Hash / 日志
  -> 前端本地解析并脱敏预览
  -> 用户点击手动同步
  -> official read-only client 调用 allowlist 接口
  -> normalizer 生成 UserProfileSnapshot
  -> IndexedDB 保存 snapshot
  -> planner 只读 snapshot + public/data/v1
```

开发私有数据流：

```text
IC_PRIVATE_USER_ID + IC_PRIVATE_HASH 或显式 .local 文件
  -> scripts/private-user-data env loader
  -> 一次性抓取只读用户数据
  -> tmp/private-user-data/<timestamp>/
  -> 脱敏 manifest
  -> privacy scanner 防止提交或构建泄漏
```

生产和开发两条流不能复用存储位置。开发凭证变量不得以 `VITE_` 开头，防止进入前端构建环境。

## 核心数据契约

`UserProfileSnapshot`：

- `id`、`schemaVersion`、`updatedAt`、`sourceSummary`
- `ownedChampions[]`：hero id、seat、level hints、owned state
- `equipment[]`：slot、rarity、item level、shiny/golden 标记
- `feats[]`、`specializations[]`、`legendaryEffects[]`、`pigments[]`
- `favorByCampaign[]`、`blessings[]`、`patronProgress[]`
- `formationSaves[]`：layout id、slot placements、specializations、feats、familiars、scenario relation
- `warnings[]`：缺字段、未知字段、无法映射的阵型或效果

`SimulationChampionProfile`：

- public champion summary、localized name、seat、tags、roles、ability scores
- upgrades、specialization unlock levels、feats、loot、legendary effects
- raw effect strings 和 `unsupportedEffects`
- 可解释文本来源，用于 result explanation

`PlannerScenario`：

- campaign/adventure/variant id
- formation layout id、objective area、area set/location hints
- restrictions、forced champions、banned champions、locked slots、escort slots
- favor/blessing context、gold budget input

`PlanResult`：

- `score: GameNumber`
- `mainDpsChampionId`
- `placements[]`
- `assumptions[]`
- `explanations[]`
- `warnings[]`
- `savePresetPayload`

## 官方只读 client

第一版 allowlist 只允许用户数据读取接口，例如 `getuserdetails`、`getcampaigndetails`、`getallformationsaves`。任何名字包含 claim、purchase、save、redeem、consume、set、update 语义的调用默认拒绝，除非后续 PRD 单独放开。

fetch 参数必须固定：

- `credentials: "omit"`
- `cache: "no-store"`
- `referrerPolicy: "no-referrer"`

错误对象只允许包含接口名、状态码、脱敏 message 和 retry hint，不允许包含完整 user id/hash。

## IndexedDB 设计

数据库版本升级时新增：

- `userProfileSnapshots`：key 使用 snapshot id 或固定 current key，保留最近一份当前快照。
- `userCredentialVault`：仅在显式 opt-in 时保存；默认为空。

删除私人数据必须同时清理 snapshot、vault、sync status cache 和 planner 派生状态。页面应显示“当前私人数据存在 X 天”，不自动刷新。

## 隐私测试

- scanner 命中 fake secret 和 `tmp/private-user-data` 引用。
- scanner 不因 `user_id` / `hash` 普通占位符误报。
- env loader 缺失凭证时不打印 secret。
- manifest 只输出脱敏 user id/hash。
- `dist` 存在时也纳入 `privacy:scan`。
