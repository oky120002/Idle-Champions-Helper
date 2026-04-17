# modules 文档入口

- 作用：存放模块设计稿与模块级补充资料；开发时优先加载目标模块，而不是通读全部设计稿。

## 当前模块

- `docs/modules/champions/champions-filter-design.md`：英雄筛选的输入合同、筛选规则、页面结构与 MVP 边界。
- `docs/modules/champions/champion-detail-design.md`：英雄详情页的信息架构、路由入口与数据合同。
- `docs/modules/champions/champion-illustration-page-design.md`：立绘页在 GitHub Pages / 零成本约束下的资源方案。
- `docs/modules/formation/formation-editor-design.md`：阵型编辑、最近草稿、布局筛选与方案保存衔接。
- `docs/modules/presets/presets-design.md`：命名方案库、存储策略与和阵型页的接口。
- `docs/modules/pets/pets-page-design.md`：宠物图鉴页的范围、数据口径与页面结构。
- `docs/modules/shared-components/shared-components-design.md`、`docs/modules/shared-components/shared-components-catalog.md`：共享组件准入规则与现有可复用目录。
- `docs/modules/user-data/user-data-import-design.md`：`Support URL` / 日志 / `User ID + Hash` 的本地优先导入方案。

## 读取建议

- 做英雄列表、详情或立绘：只读 `docs/modules/champions/` 对应文档。
- 做阵型、方案存档、个人数据：从目标模块设计稿进入，再按需补相关模块。
- 新模块增长到多文档时，先在该模块目录补局部 `README.md`，不要把根索引重新做大。
