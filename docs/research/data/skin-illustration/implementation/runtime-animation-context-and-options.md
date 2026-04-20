# 皮肤动态动画：Kleho skins 页调研与仓库实现方案

- 日期：2026-04-17
- 目标：说明 `https://idle.kleho.ru/hero/strix/skins/` 为什么能播放皮肤动画、我们为什么之前只能做静态立绘，以及本仓库在 GitHub Pages 容量约束下的落地方案。

## 结论先行

- `idle.kleho.ru` 不是在放 GIF / APNG / 视频，而是在前端读取动画描述数据后，用 `canvas` 逐帧重绘。
- 我们之前做不出“动图”，不是因为官方没有动画数据，而是因为构建链路把 `SkelAnim` 主动压扁成了单帧 PNG。
- 对 GitHub Pages 最友好的主线不是“预渲染所有动图”，而是：
  - 保留静态 PNG 作为稳定回退；
  - 额外保存官方原始 `SkelAnim` 压缩容器；
  - 前端按需解码并用 `canvas` 播放。
- 这个方案现在已经在仓库里落地，并且当前仓库已切到“全量皮肤动画默认发布”的策略。

## 外站为什么能动

### 1. 它保留了动画数据，而不是只保留静态图

`idle.kleho.ru/hero/strix/skins/` 的页面会按皮肤的 `graphic_id` 拉取自己的动画描述文件，再去加载 atlas 贴图，并在浏览器里播放。

可直接核对的外站现象：

- 页面入口：[idle.kleho.ru/hero/strix/skins/](https://idle.kleho.ru/hero/strix/skins/)
- 动画描述文件示例：[idle.kleho.ru/assets/animations/2609.json](https://idle.kleho.ru/assets/animations/2609.json)
- 官方原始资源示例：[master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_Strix](https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_Strix)

`2609.json` 这一类文件里能看到：

- `format`
- `files`
- `characters`
- `sequences`
- piece / frame 级别的动画信息

这说明它的“动图”本质是：

1. 动画描述数据
2. 纹理贴图
3. 前端播放器

而不是一张已经编码好的 GIF。

### 2. 它做的是运行时 canvas 播放

这类站点的典型播放链路是：

1. 取回动画数据
2. 取回 atlas PNG
3. 每一帧根据 `depth / x / y / scale / rotation / pivot` 重算变换
4. 在 `canvas` 上逐帧绘制

所以它“能动”的关键不是格式魔法，而是前端仍然拿着完整动画数据。

### 3. 它的资源明显是旧快照，不适合当生产上游

调研时能看到：

- 它对一些老皮肤动画能返回数据；
- 对较新的皮肤资源会直接 `404`；
- 页面里注入的 patch 时间也显示它不是跟着当前官方 definitions 实时更新的。

所以它的价值是“证明这件事技术上可行”，但不适合作为我们站点的长期依赖源。

## 我们之前为什么不行

### 1. 我们其实已经能解官方动画

仓库本来就已经有这套能力：

- `scripts/data/skelanim-codec.mjs`
- `scripts/data/skelanim-renderer.mjs`
- `scripts/sync-idle-champions-illustrations.mjs`

也就是说，我们不是“没有动画数据”，而是“已经把动画数据解开过”。

### 2. 但之前的产物合同只允许静态图

旧链路的终点是：

- `public/data/v1/champion-illustrations.json`
- `public/data/v1/champion-illustrations/**/*.png`
- 页面组件直接 `<img>` 展示

所以之前的行为是：

1. 构建期读取 `SkelAnim`
2. 选择一个 sequence / frame
3. 渲染为单张 PNG
4. 丢掉其余动画数据

根因不是“前端画不出来”，而是“数据合同不让它画”。

## 方案比较

### 方案 A：预渲染 GIF / APNG / WebM

优点：

- 页面接入最简单

缺点：

- 体积膨胀最快
- 透明边缘和清晰度通常更差
- 不利于暂停、降速、动作切换
- 一旦默认动作要改，就得重导一批成品文件

结论：

- 不适合作为 GitHub Pages 主方案

### 方案 B：像 kleho 一样保存完整 JSON + atlas PNG

优点：

- 浏览器逻辑直观
- PoC 速度快

缺点：

- JSON 体积很大
- atlas 资源重复存储
- 全量铺开时很浪费仓库容量

结论：

- 可用于研究，但不适合作为全站长期主线

### 方案 C：保存官方原始容器 + 小 manifest，前端 canvas 播放

优点：

- 体积最省
- 与官方当前资源保持一致
- 兼容 GitHub Pages / local-first / 零预算约束
- 可以继续保留静态 PNG 作为回退

代价：

- 前端需要浏览器侧解码器
- 需要补一个 `canvas` 播放器

结论：

- 这是最合适的主线方案

