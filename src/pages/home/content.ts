import type { LocaleText } from '../../app/i18n'

export const shippedItems: LocaleText[] = [
  { zh: '基础页面与主导航', en: 'Base pages and primary navigation' },
  { zh: '基于 `import.meta.env.BASE_URL` 的数据读取约定', en: 'Data loading based on `import.meta.env.BASE_URL`' },
  { zh: '`public/data/version.json + public/data/v1/` 版本化公共数据目录', en: 'Versioned shared data under `public/data/version.json + public/data/v1/`' },
  { zh: '官方原文 + `language_id=7` 中文展示双字段数据', en: 'Dual-field data from official source text plus `language_id=7` Chinese labels' },
  { zh: '官方 definitions 自动提取的阵型布局库', en: 'Formation layouts extracted from official definitions' },
  { zh: '`IndexedDB` 最近草稿与命名方案保存 / 恢复', en: '`IndexedDB` recent-draft and named-preset save / restore flow' },
  { zh: '`Vitest + Playwright` 本地回归基线', en: '`Vitest + Playwright` local regression baseline' },
]

export const nextSteps: LocaleText[] = [
  { zh: '给阵型页补场景筛选、搜索与来源定位', en: 'Add scenario filtering, search, and source targeting to the formation page' },
  { zh: '完善 seat 冲突校验与候选英雄约束提示', en: 'Tighten seat-conflict validation and candidate champion guidance' },
  { zh: '把个人数据导入结果安全写入 `IndexedDB` 并接到页面状态', en: 'Persist imported user data into `IndexedDB` and wire it into page state' },
  { zh: '扩展方案管理：删除、覆盖保存与更细标签', en: 'Expand preset management with delete, overwrite, and richer tags' },
]

export const nonGoals: LocaleText[] = [
  { zh: '不做全自动最优阵容求解器', en: 'No fully automatic optimal formation solver' },
  { zh: '不做服务端数据库', en: 'No server-side database' },
  { zh: '不做账号系统与云同步', en: 'No account system or cloud sync' },
  { zh: '不做为了干净 URL 而额外增加的 SPA 回退复杂度', en: 'No extra SPA fallback complexity just for clean URLs' },
]
