# `language_id=7`：数据合同与落地建议

- 日期：2026-04-13
- 目标：说明这条中文链路对归一化结构和页面消费的直接影响。

## 对数据结构的直接影响

推荐统一输出：

```json
{
  "original": "Bruenor",
  "display": "布鲁诺"
}
```

原因：中文覆盖已足够支撑 MVP 的主要名称字段，但不是 100%；页面搜索、筛选和详情展示都需要同时支持中文展示、英文原文检索和中文缺失时的自动回退。

## 落地建议

1. 抓取流程默认同时保留两份快照：`language_id=1` 与 `language_id=7`
2. 归一化输出优先覆盖 `champions`、`affiliations`、`campaigns`、`variants`
3. 变体页已消费的限制文本也同步改成 `original + display`
4. 仍未翻译的项目先走英文回退，不在这一阶段手工强补

## 后续待办

- 继续核对 `event_name`、`game_changes`、escort 名称等次级字段的页面价值
- 评估 `BBEG`、`Vecna: Eve of Ruin`、`Tales of the Champions` 等缺口是否需要人工覆盖
- 若后续页面展示更多变体说明，再把 `description / objectives_text / requirements_text` 系统化成双字段结构
