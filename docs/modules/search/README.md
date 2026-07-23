# search 模块文档入口

- 日期：2026-07-18
- 作用：收纳全站全文检索模块的范围、构建期数据契约、运行期引擎与页面交互；默认只加载当前变更会碰到的子主题。

## 模块定位

- 全站唯一的全文检索入口，覆盖英雄名、技能、背景、专长、装备等任意文本，命中后跳转英雄详情。
- 横跨三层：构建期把英雄详情树抽成检索文档；静态 JSON 随站点发布；运行期在浏览器内建索引并提供查询与高亮。
- 本质是"只读静态站内搜索"：无服务端、无索引接口，索引在构建期一次产出，运行期除首次拉取索引文件外零额外网络往返。

## 三层架构与数据流

构建 → 静态产物 → 引擎 → UI：

1. 构建（`scripts/data/build-search-index.mjs`）：遍历 `champions.json` + `champion-details/*.json`，抽取全部人类可读文本，按 title/body/meta × en/zh 分桶清洗，产出 `public/data/v1/search/search-documents.json`。
2. 传输：索引文件随静态站发布，运行期经 `src/data/client.ts` 的 `loadSearchDocuments()` 首次拉取并内存缓存。
3. 引擎（`src/features/search/searchEngine.ts`）：用 MiniSearch 对三桶建索引，双语合并、prefix + 模糊匹配、桶权重排序。
4. UI：顶栏 `GlobalSearchBox` 下拉即搜；`/search` 页提供完整结果列表与 URL 同步。

## 先读哪篇

- 构建期数据契约、信封识别、三桶分类、占位符剥离、排噪规则：`docs/modules/search/build-and-data.md`
- 运行期引擎、分词、高亮、顶栏框与 /search 页交互：`docs/modules/search/runtime-and-ui.md`

## 关键文件

| 层 | 文件 |
| --- | --- |
| 构建 | `scripts/data/build-search-index.mjs`、`scripts/data/build-search-index.test.mjs` |
| 编排 | `scripts/build-idle-champions-data.ts`（接入 `buildSearchIndex`） |
| 产物 | `public/data/v1/search/search-documents.json` |
| 引擎 | `src/features/search/searchEngine.ts`、`searchTokenizer.ts`、`searchTypes.ts` |
| 高亮 | `src/features/search/searchHighlight.ts` |
| Hook | `src/features/search/useSearchEngine.ts` |
| UI | `src/features/search/GlobalSearchBox.tsx`、`SearchResultItem.tsx`、`src/pages/SearchPage.tsx`、`src/pages/useSearchPageState.ts` |
| 接入 | `src/data/client.ts`、`src/app/App.tsx`、`src/app/appNavigation.ts`、`src/app/HeaderTopbar.tsx` |
| 样式 | `src/styles/app/site-header/search.css`（顶栏框）、`src/styles/pages/search.css`（`/search` 页） |
