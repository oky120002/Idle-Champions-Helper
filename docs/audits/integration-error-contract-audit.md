# 集成测试异常契约审计

度量基准日：2026-08-19。范围：`src/`、`scripts/`、`tests/e2e/` 中涉及多模块接线、真实产物、持久化边界和 smoke 的测试；纯展示层的视觉 fallback 只检查其业务语义，不把所有 fallback 视为缺陷。

## 1. 判定标准

| 输入情况 | 期望行为 | 测试要求 |
|---|---|---|
| 内部计算契约损坏：非法数值、枚举、必填字段、引用 | 立即抛出异常并阻断错误结果 | `toThrow` / `rejects.toThrow`，错误包含字段或接缝 |
| 外部原始数据字段缺失或格式差异 | 归一化为明确的领域缺省，或产生 warning | 断言归一化结果及 warning，不得把缺省写成内部合法值 |
| 可丢弃缓存 / 可选资源损坏 | 清理并重新获取，或进入可见降级状态 | 断言替代来源、状态和错误可观察性 |
| 未建模机制 | 不计入目标值 | 断言 warning / blocker 和聚合值未被污染 |

## 2. 全仓接缝结果

| 接缝 / 测试 | 结论 | 处置 |
|---|---|---|
| `src/domain/planner/*` → simulator / scorer | `baseDamage`、等级、聚合值、非法 signal、非法 override 等不能回退为合法计算值 | 已统一 fail-fast，并由 planner runtime/invariant/integration 测试覆盖 |
| `scripts/data/build-models.ts` → `hero-abilities.json` | 仓库内部 semantic override 损坏曾被任何读取错误吞成空补丁 | 仅 `ENOENT` 允许空补丁；损坏 JSON、权限等错误上抛，并补集成回归 |
| `scripts/simulator/smoke.test.ts` → 全量真实英雄 | 原测试最终会失败，但只保留崩溃数量，丢失英雄 id 和原始错误 | 保留批量继续执行能力，同时聚合具体错误后断言失败 |
| `src/data/client.ts` → IndexedDB / fetch | 缓存腐蚀属于可重建中间产物，不应阻断新鲜网络数据加载 | 保留“校验失败→删除坏键→fetch”并断言 fetch 发生 |
| formation draft / preset store → UI | 单条旧记录损坏可清理或跳过，不能连坐有效记录；这是持久化恢复语义 | 保留现有测试，并要求文档明确“坏记录不进入领域计算” |
| 官方 play server / 资源解码 | 镜像与编码格式 fallback 是外部服务/格式兼容，不是内部计算兜底 | 保留；测试必须覆盖最终全部失败时抛错 |
| user profile normalizer → planner snapshot | 官方 payload 字段缺失是外部数据兼容边界，可产生空集合和 warning | 保留；进入 scorer 前仍必须经过 stored-record schema 和数值契约 |
| E2E IndexedDB setup | 打开、写入、事务错误都会 reject；不是吞错 | 保留；错误必须带操作上下文 |

## 3. 结论

- 当前同类问题不是“所有 fallback 都错误”，而是**内部契约损坏被伪装成业务缺省**。
- 已发现并收口的必须 fail-fast 路径集中在 planner 计算链和 build 内部 override 读取；缓存、镜像、外部 payload、旧草稿属于有明确业务理由的恢复路径。
- 以后新增集成测试必须按 `docs/specs/guidelines/testing-methodology.md` §1-8 先写异常分类、测试层级和不变量，再按 `testing.md` 接入运行器和门禁；不能用“没有崩溃”替代契约验证。

## 4. 复核入口

- planner 契约和真实产物：`src/domain/planner/integrationContract.test.ts`、`src/domain/planner/recommendationEngine.runtimeEdge.test.ts`、`scripts/simulator/smoke.test.ts`
- 持久化腐蚀：`src/data/client.test.ts`、`src/data/formationStores.test.ts`、`src/data/user-profile-store/userProfileStore.test.ts`、`src/data/plannerOverridesStore.test.ts`
- 数据构建异常：`scripts/data/build-models.test.ts`、`scripts/normalize-idle-champions-definitions.test.ts`
- 既有 planner 审计：`docs/audits/integration-contract-audit.md`、`docs/audits/adversarial-invariant-audit.md`、`docs/audits/runtime-edge-audit.md`
