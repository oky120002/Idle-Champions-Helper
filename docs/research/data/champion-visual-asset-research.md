# Idle Champions 英雄立绘与皮肤资源调研

- 日期：2026-04-13
- 作用：本页只做视觉资源主题入口；细节已拆到 `docs/research/data/visual-asset/`。
- 当前结论：definitions 能稳定定位英雄本体立绘、皮肤立绘和皮肤头像，但很多 `Characters/...` 资源本质上是 `SkelAnim` atlas，不能把“能解包 PNG”误当成“已经拿到最终人物图”。

## 先读哪篇

- 字段链路、transport 和浏览器直连边界：`docs/research/data/visual-asset/resource-links-and-transport.md`
- 样例尺寸 / 体积与仓库存储边界：`docs/research/data/visual-asset/size-and-storage.md`
