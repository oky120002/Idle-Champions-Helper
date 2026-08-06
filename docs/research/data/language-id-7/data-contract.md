# `language_id=7`：本地化字段合同与实现事实

- 作用：说明官方中文链路对归一化输出结构的影响，以及当前实现事实。
- 本地化字段合同（`{original, display}`）的权威定义在 `src/domain/types/common.ts`，多模块消费（检索、详情、阵型、方案）；本文件只保留中文覆盖事实与实现记录。

## 中文覆盖事实

`getDefinitions` 接受 `language_id=7`，返回结构与默认英文 definitions 一致，但会把部分字符串字段替换为官方中文。中文覆盖已足够支撑主要名称字段，但不是 100%；页面搜索、筛选和详情展示都需要同时支持中文展示、英文原文检索和中文缺失时的自动回退（见 `docs/research/data/language-id-7/coverage.md`）。

## 归一化输出形态

名称、限制等本地化字段统一输出为：

```json
{
  "original": "Bruenor",
  "display": "布鲁诺"
}
```

`original` 保留英文原文供检索与回退，`display` 给中文展示；中文缺失时前端回退 `original`。Zod 定义见 `src/domain/types/common.ts`（`LocalizedText` / `LocalizedLabeled`）。

## 当前实现记录

- 抓取流程默认同时保留两份快照：`language_id=1` 与 `language_id=7`。
- 归一化输出优先覆盖 `champions`、`affiliations`、`campaigns`、`variants`。
- 变体页已消费的限制文本已改成 `original + display`。
- 仍未翻译的项目先走英文回退，不在当前阶段手工强补。
