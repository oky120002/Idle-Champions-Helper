# Planner 变更范围审计

**状态**: 已收口
**审计范围**: `59f9d129..2d583211`，并包含本次审计发现的根因修复
**审计日期**: 2026-08-15

## 结论

代码、场景产物、消息引用 schema、planner 页面和相关文档已完成收口。未发现需要继续阻断发布的确定性缺陷。

## 发现与处置

| 级别 | 问题 | 证据与处置 |
|---|---|---|
| 高 | 英文递增占格检测漏掉“每 N 区域新实体加入”，变体 18 会把动态占格固定为 1 | 全量 `variants.json` 扫描定位；补 `a new ... joins your team/formation/party/train` 检测和 v18 回归测试；重建后 `occupiedSlotCount=0` |
| 中 | 多行 restriction warning 因正则 `.` 不匹配换行而退化为不可翻译 `literal` | 改用 `\\s` 覆盖多行内容；新增 builder 测试；真实产物 `literal` warning 数为 0 |
| 中 | “计时或点击限制”场景 warning 没有中央英文翻译，34 条记录会在英文界面显示中文 | 补齐字典条目和翻译测试；全量产物 warning key 覆盖检查无缺失 |
| 中 | `MessageRef.params` 只校验为 `unknown`，畸形对象可能在渲染时触发异常；领域与 UI 层还各自定义类型 | 新增递归共享 `messageRefSchema`，统一领域/UI 类型，拒绝数组等不可渲染参数并保留嵌套引用测试 |
| 中 | 中央 i18n 字典把开发态私有快照文案编进生产 `app-i18n` bundle，生产边界扫描失败 | 开发态条目收进 `import.meta.env.DEV` 分支；开发翻译保留，生产构建与 `privacy:scan-build` 通过 |
| 中 | E2E IndexedDB 夹具使用异步 init script，且遗漏运行时 OwnedHero 字段，导致 planner 在 `Object.values(undefined)` 崩溃或数据校验失败 | 改为同源静态数据页完成确定性写库，补齐与领域 fixture 一致的字段；同时修正过时的选择器和视口就绪断言 |
| 低 | planner 规范仍把用户手动锁槽误写成场景模型字段 | 更新 `data-and-privacy.md` 与 `recommendation.md` 的当前字段合同 |

## 产物核验

- `public/data/v1/scenarios.json` 共 1424 个场景；主体字段（去除 warning 与更新时间后）与审计基线哈希一致。
- warning 共 1304 条，全部为结构化 `MessageRef`；9 个唯一 key 全部存在于中央字典。
- `npm run data:validate-schema`：175 个目标，0 失败。

## 验证

- `npm run lint`
- `npm run test:run`：246 个测试文件，1825 个用例通过。
- `npm run test:data`：50 个测试文件，452 个用例通过；数据 schema 0 失败。
- `npm run build`
- `npm run privacy:scan-build`
- `npm run test:e2e`：30 个用例通过（含构建和生产隐私边界门禁）。
- restriction parser 全量变体边界扫描：仅固定占格加位置轮换样本保留固定计数，动态占格不再产固定计数。

## 边界

本审计只覆盖指定提交范围及其直接根因修复；未扩大到与本范围无关的历史 TODO。后续新增特殊机制仍须按现有 restriction parser、真实产物守护和 `MessageRef` schema 规则补测试。
