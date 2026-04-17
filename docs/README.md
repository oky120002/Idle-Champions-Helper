# docs 文档入口

- 作用：`docs/` 总索引，只回答“去哪读”；专题细节留在各目录 `README.md` 或单篇文档。
- 默认加载顺序：`README.md` -> `docs/README.md` -> 目标目录 `README.md` -> 单篇专题文档。
- 压缩原则：入口文档只保留导航、放置规则和触发条件；长清单、代码块、实现细节优先留在专题文档或仓库文件本身。

## 高频入口

- `docs/product/README.md`：项目边界、路线图、移动端和文档治理。
- `docs/research/README.md`：数据来源、部署、测试、资源链路等外部事实。
- `docs/modules/README.md`：模块设计稿与共享组件治理。
- `docs/investigations/README.md`：运行、仓库、环境排查入口。
- `docs/troubleshooting-log.md`：可复用问题摘要台账。

## 放置规则

- `docs/product/`：项目定位、阶段目标、全局规则、PRD。
- `docs/research/`：数据来源、技术选型、部署、测试、外部核实。
- `docs/modules/`：模块设计稿、模块补充研究、模块级验证。
- `docs/investigations/`：排查、复现、环境确认、历史验证。
- `docs/` 根目录：仅跨主题入口与台账，不放普通专题文档。

## 命名与维护

- 目录和文件统一 `kebab-case`。
- 调研统一 `*-research.md`；排查统一 `*-investigation.md` 或 `*-verification.md`；模块设计优先 `*-design.md`。
- 仓库内引用统一项目相对路径；历史结论要标明当前是否仍有效。
- 同一事实只在一处展开，其他入口只保留一句摘要和链接。
- 某目录文档增长到不适合平铺时，先补该目录 `README.md`，再继续加专题文档。

## 需要更新本目录的情况

- 新增或删除目录级文档、局部 `README.md`。
- 项目范围、路由、部署链路、数据目录、文档治理规则发生变化。
- 发现根索引重新膨胀、重复列举专题细节、写入绝对路径或过期命令。
