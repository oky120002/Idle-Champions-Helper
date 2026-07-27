# 国内访问优化：触发信号

- 作用：沉淀何时该评估国内访问优化、当前部署基线。
- 优化顺序与备选方案决策见 `decisions/0005-deployment-github-pages.md`；候选平台特性见 `options-and-filing.md`。本文件只保留触发信号事实。

## 当前部署

- 技术栈：`Vite + React + TypeScript`
- 部署：`GitHub Pages + GitHub Actions`，默认域名
- 国内访问优化顺序由 `decisions/0005-deployment-github-pages.md` 定义。

## 优化触发信号

当出现以下信号时评估优化：

- 中国大陆打开速度明显拖慢使用
- 静态 JSON 数据加载成为瓶颈
- 高频反馈“打不开”或“加载太慢”
