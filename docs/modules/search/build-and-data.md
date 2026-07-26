# 全文检索：构建期文本抽取器

- 目标：回答"检索文档从哪来""哪些文本进索引、哪些不进""占位符怎么处理"。

## 入口与产物

- 脚本：`scripts/data/build-search-index.ts`，npm 入口 `data:search`。
- 编排接入：`scripts/build-idle-champions-data.ts` 调用 `buildSearchIndex({ versionDir })`，随数据主流程一起产出。
- 产物：`<versionDir>/search/search-documents.json`，结构为 `{ items: SearchDocument[], updatedAt }`；`updatedAt` 取自 `champions.json` 的 `updatedAt`，标记这批检索文档对应的数据版本。
- 调试出口：`node scripts/data/build-search-index.ts --dump` 把每英雄抽取明细写到 `tmp/search-extract-dump.txt`，便于人工核对召回与噪声。

## 数据源

- `champions.json`：列表层权威（英雄名、seat、tags、roles、affiliations、portrait）。
- `champion-details/<id>.json`：详情树（背景、技能、专长、升级、传奇装备等）。

## 信封识别

详情树普遍使用 `{ original, display }` 双语信封。`classifyLocalized` 按值类型分三类：

| 形态 | 判定 | 处理 |
| --- | --- | --- |
| `leaf` | original/display 都非对象（字符串或 null） | original 进 en 桶、display 进 zh 桶 |
| `container` | original/display 都是对象（即 snapshots 嵌套） | 递归进对应语言子树 |
| `null` | 非信封结构 | 按数组/对象继续通用遍历 |

- display 缺省为 null 时仍索引 original，保证未本地化字段可被英文搜到。
- 非信封的纯字符串（如 `englishName`）仅在 langCtx 非 null 时索引；详情树根从 null 起，故裸字符串默认不索引。

## 三桶分类

`classifyBucket` 把每个 leaf 文本归入一个桶，决定 boost 与 snippet 来源：

| 桶 | 判定 | 用途 |
| --- | --- | --- |
| title | `characterSheet.fullName` | 英雄全名，命中优先级最高 |
| body | `BODY_LEAVES`（见下） | 长正文，靠语义命中 |
| meta | 其余信封 leaf | 短属性（职业、种族、阵营、技能名等） |

`BODY_LEAVES` 成员：`backstory`、`desc`、`pre`、`post`、`tipText`、`specializationDescription`、`override_key_desc`、`spec_option_post_apply_info`、`description`、`longDescription`。

列表层关键字短标签（`tags`、`roles`）语言中立，同时进 en 与 zh 的 meta 桶提升双语召回；`affiliations` 按 leaf 信封展开。

## 排噪：跳过代码字段与镜像子树

- `CODE_DENYLIST`：opcode / 目标过滤器 / 函数表达式等代码型字段，从不出现在人类描述里，遍历时整体跳过。成员：`effect_string`、`effectReference`、`for_time`、`targets`、`target_filters`、`filter_targets`、`amount_func`、`stack_func`、`amount_expr`、`stack_func_data`、`func`、`requirements`。
- `SKIP_SUBTREES`：顶层 `raw`（上游原始快照）与 `summary`（与 `champions.json` 同源镜像），整体跳过避免双倍索引。
- `legendaryEffects`：normalizer 未本地化的纯英文传奇装备效果，由 `collectLegendaryEffects` 在通用遍历之外补抓 `effect.description` 进 body/en 桶。

## 占位符剥离（cleanText）

游戏文本含大量运行时才求值的模板占位符（`$(name)`、`$(amount)`、`$(if|else|fi)` 等），静态数据拿不到替换值，故不求值只剥成空格。`cleanText` 依次处理：

| 顺序 | 正则 | 目标 |
| --- | --- | --- |
| 1 | `\$（[^）]*）` | 全角括号中文残留 `$（奖金）` |
| 2 | `\$[一-鿿぀-ヿ]+` | CJK 裸形残留 `$阈值` |
| 3 | `\$\([^)]*\)` | 主力形态 `$(name)` / `$(func arg)` / `$(if|else|fi)` / 中文函数名 |
| 4 | `\$[A-Za-z_][A-Za-z0-9_]*` | 裸形 `$amount` / `$target` |
| 5 | `\$[%0-9]+` | 数据 bug `$%` / `$10` |
| 6 | `\^\^` | 游戏内换行 markup |
| 末 | `\s+` → 空格 + trim | 合并多余空白 |

保留：`$#` 是脏话字面量而非占位符，不动。运行期分词器假设占位符已在此剥净，只做分词 + 小写。

## 验收

- `scripts/data/build-search-index.test.ts`（node:test）覆盖：
  - `cleanText` 全部 5 类占位符形态、数据 bug、换行 markup、`$#` 保留。
  - `buildSearchIndex` 抽取分桶、清洗、去重、排噪（summary 镜像跳过、display 缺省回退 original、代码字段跳过、关键字双桶）。
