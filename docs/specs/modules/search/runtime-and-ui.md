# 全文检索：运行期引擎与 UI

- 目标：回答"索引怎么建、怎么查""高亮怎么来""顶栏框与 /search 页怎么协作"。

## 数据加载与单例

- `src/data/client.ts` 的 `loadSearchDocuments()` 拉取 `v1/search/search-documents.json` 并内存缓存，键 `search-documents`。
- `searchEngine.ts` 的 `getSearchEngine()` 是模块级单例：首次调用才加载文档并建索引，之后复用；失败时重置 promise 以便重试。App 启动不付代价。
- `useSearchEngine(enabled)` hook：`enabled` 控制是否触发加载。顶栏框仅聚焦时置 true；`/search` 页（懒加载路由）恒为 true。status 由 engine/failed 派生。

## 引擎：MiniSearch 配置

- 字段：title / body / meta 三桶。`toIndexedDocument` 把每桶的 en / zh 合并成单字段，兼容双语检索。
- 分词：`searchTokenizer.ts` 的 `tokenize`，索引与查询共用同一分词器保证一致。
- 查询选项：`prefix: true`、`fuzzy: 0.2`、`boost: { title: 3, meta: 2, body: 1.5 }`。
- 命中桶决定：MiniSearch 返回 `match`（词项 → 命中字段），反转得到命中字段集，按 `title > meta > body` 优先级取首个作为 snippet 来源与标签。

## 分词器

- 优先用 `Intl.Segmenter('zh-CN', { granularity: 'word' })`，中英文统一分词，取 `isWordLike` 片段并小写。
- 回退（`Intl.Segmenter` 不可用）：按 `\p{L}+` 切分，丢 CJK 词边界精度。标记为 ponytail 回退。
- 占位符已在构建期剥净，运行期不做模板处理。

## 高亮

- `pickBucketText(doc, bucket, terms, locale)`：优先取用户 locale 的桶文本，若命中的词项不在其中则回退另一语言，保证英文词在中文 locale（或反之）仍能高亮。
- `buildHighlightedSnippet(text, terms, windowChars=80)`：定位首个命中位置，以其为中心截取 80 字符窗口，窗口内所有命中词大小写不敏感高亮，窗口两端按需补 `…`。
- `SearchResultItem` 据此渲染头像、名称、seat、桶标签（名称 / 描述 / 属性）与高亮 snippet。

## UI：顶栏全局搜索框

- `GlobalSearchBox.tsx`：聚焦时触发引擎加载，160ms 防抖后查 Top 6 命中以下拉显示。
- 键盘导航：↑/↓ 在结果项与"查看全部结果"间移动，Enter 跳转选中项或全部结果页，Esc 关闭。
- "查看全部结果"跳 `/search?q=<query>`。
- combobox + listbox 语义（`role`、`aria-expanded`、`aria-controls`、`aria-autocomplete`）。

## UI：/search 页

- `SearchPage.tsx` + `useSearchPageState.ts`：完整结果列表（上限 100），160ms 防抖。
- 查询 ↔ URL `?q=` 双向同步：输入即时 replace 进 URL（可刷新 / 分享），浏览器前进后退回读。setState 只在异步回调（setTimeout / microtask）里调用。
- 结果点击跳 `/champions/<id>`。

## 接入点

| 位置 | 作用 |
| --- | --- |
| `src/app/HeaderTopbar.tsx` | 顶栏挂载 `GlobalSearchBox` |
| `src/app/appNavigation.ts` | 导航条 `/search` 项 |
| `src/app/App.tsx` | `SearchPage` 经 `lazyNamedPage` 懒加载，路由 `<Route path="/search" element={<SearchPage />} />` |
| `src/data/client.ts` | `loadSearchDocuments` 拉取与缓存 |
| `src/styles/app/site-header/search.css` | 顶栏搜索框样式 |
| `src/styles/pages/search.css` | `/search` 页样式 |

## 验收

- 单元（co-located）：`src/features/search/searchEngine.test.ts`、`searchTokenizer.test.ts`、`searchHighlight.test.ts`。
- E2E：`tests/e2e/search.spec.ts`。
