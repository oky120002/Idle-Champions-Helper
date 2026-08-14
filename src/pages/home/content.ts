import type { MessageRef } from '../../app/i18n'

export const shippedItems: MessageRef[] = [
  { key: '基础页面与主导航' },
  { key: '基于 `import.meta.env.BASE_URL` 的数据读取约定' },
  { key: '`public/data/version.json + public/data/v1/` 版本化公共数据目录' },
  { key: '官方原文 + `language_id=7` 中文展示双字段数据' },
  { key: '官方 definitions 自动提取的阵型布局库' },
  { key: '`IndexedDB` 最近草稿与命名方案保存 / 恢复' },
  { key: '`Vitest + Playwright` 本地回归基线' },
]

export const nextSteps: MessageRef[] = [
  { key: '给阵型页补场景筛选、搜索与来源定位' },
  { key: '完善 seat 冲突校验与候选英雄约束提示' },
  { key: '把个人数据导入结果安全写入 `IndexedDB` 并接到页面状态' },
  { key: '扩展方案管理：删除、覆盖保存与更细标签' },
]

export const nonGoals: MessageRef[] = [
  { key: '不做全自动最优阵容求解器' },
  { key: '不做服务端数据库' },
  { key: '不做账号系统与云同步' },
  { key: '不做为了干净 URL 而额外增加的 SPA 回退复杂度' },
]
