# modules 文档入口

- 作用：存放模块设计稿与模块级补充资料；开发时优先加载目标模块目录，不通读全部设计稿。

## 模块入口

- `docs/specs/modules/champions/README.md`：英雄筛选、用户英雄、详情、立绘页
- `docs/specs/modules/formation/README.md`：阵型编辑与最近草稿
- `docs/specs/modules/presets/README.md`：方案存档与恢复
- `docs/specs/modules/pets/pets-page-design.md`：宠物图鉴页
- `docs/specs/modules/planner/README.md`：自动阵型计划器产品需求与架构设计
- `docs/specs/modules/shared-components/README.md`：共享组件治理与可复用资产
- `docs/specs/modules/user-data/user-data-import-design.md`：本地优先的个人数据导入
- `docs/specs/modules/search/README.md`：全站全文检索（构建期抽取 + 运行期引擎 + 顶栏 / 页面 UI）

## 读取建议

- 做英雄页：先进 `docs/specs/modules/champions/README.md`
- 做阵型、方案、个人数据：直接打开对应模块目录 README 或单篇文档
- 新模块增长到多文档时，先在模块目录补 `README.md`
