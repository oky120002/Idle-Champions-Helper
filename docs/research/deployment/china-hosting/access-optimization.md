# 国内访问优化：触发信号

- 作用：沉淀何时该评估国内访问优化、当前部署基线。
- 优化顺序与备选方案决策见 `decisions/0005-deployment-github-pages.md`；候选平台特性见 `options-and-filing.md`。本文件只保留触发信号事实。

## 当前部署

- 技术栈：`Vite + React + TypeScript`
- 部署：`GitHub Pages + GitHub Actions`，默认域名
- 国内访问优化优先级：`Cloudflare Pages` / CDN 加速 高于国内云托管

## 优化触发信号

当出现以下信号时评估优化：

- 中国大陆打开速度明显拖慢使用
- 静态 JSON 数据加载成为瓶颈
- 高频反馈“打不开”或“加载太慢”

国内云厂商方案保留为后续备选，当前不进入实现范围。
