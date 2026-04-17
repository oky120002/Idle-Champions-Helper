# docs 文档入口

- 作用：`docs/` 总索引，只回答“去哪读”；专题细节留在主题目录 `README.md` 或单篇文档。
- 默认读取顺序：`README.md` -> `docs/README.md` -> 主题目录 `README.md` -> 单篇专题文档。
- 原则：入口文档只保留导航、边界和触发条件；实现细节、长清单、示例代码全部下沉。

## 先去哪一层

- 产品边界与路线：`docs/product/README.md`
- 数据 / 部署 / 测试等外部事实：`docs/research/README.md`
- 模块设计稿：`docs/modules/README.md`
- 排查与历史验证：`docs/investigations/README.md`
- 通用问题摘要：`docs/troubleshooting-log.md`

## 放置规则

- `docs/product/`：项目定位、阶段目标、全局规则、PRD
- `docs/research/`：数据来源、技术选型、部署、测试、外部核实
- `docs/modules/`：模块设计稿、模块补充研究、模块级验证
- `docs/investigations/`：排查、复现、环境确认、历史验证
- `docs/` 根目录：只放跨主题入口和台账

## 命名与维护

- 目录和文件统一 `kebab-case`
- 调研统一 `*-research.md`；排查统一 `*-investigation.md` / `*-verification.md`；设计优先 `*-design.md`
- 仓库内引用统一项目相对路径；历史结论必须写清“当前是否仍有效”
- 同一事实只在一处展开；其他位置只保留一句摘要和路径
- 某目录文档增长到不适合平铺时，先补该目录 `README.md`

## 何时更新

- 新增 / 删除目录级文档或局部 `README.md`
- 项目范围、路由、部署链路、数据目录、文档治理规则变化
- 发现根索引重新膨胀、重复维护、写入绝对路径或过期命令
