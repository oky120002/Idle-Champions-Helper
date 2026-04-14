# Idle Champions 英雄立绘与皮肤资源调研

- 调研日期：2026-04-13
- 调研目标：确认官方 definitions 中除英雄头像外，是否还能稳定定位英雄立绘、皮肤立绘与皮肤头像，并确定本仓库的落地策略。
- 调研方式：基于仓库内 2026-04-13 的官方 definitions 快照，对 `hero_defines`、`hero_skin_defines`、`graphic_defines` 与 `mobile_assets` 返回内容做交叉核实。

---

## 1. 结论先行

- 官方 definitions 里不只有头像字段，也有英雄本体立绘与皮肤立绘的资源引用。
- 对可上阵的 161 名英雄：
  - `161 / 161` 都有 `hero_defines[].graphic_id`
  - `161 / 161` 都有 `hero_defines[].portrait_graphic_id`
- 对可上阵英雄关联到的皮肤：
  - 共核到 `672` 条 `hero_skin_defines`
  - `672 / 672` 都同时带有 `base_graphic_id / large_graphic_id / xl_graphic_id / portrait_graphic_id`
- 这些资源可以按 `graphic_defines[].graphic` 拼出官方 `mobile_assets` 地址，但**立绘类资源不是直接 PNG**：
  - `Portraits/...`：原始响应里可直接定位 PNG 数据头，属于“包装头 + PNG”
  - `Characters/...`：原始响应是 zlib 压缩数据，解压后内部再包着 PNG
- 因此当前最合理的落地方式是：
  - 头像继续本地同步到版本化目录
  - 英雄本体立绘、皮肤立绘与皮肤头像不落本地二进制
  - 只在数据基座里保留 `graphicId / sourceGraphic / remoteUrl / delivery` 等远端可解析元数据，后续页面需要时再实时请求和解包
- 但要注意一个部署边界：
  - 2026-04-14 对 `master.idlechampions.com/~idledragons/mobile_assets/...` 做响应头核查时，未见 `Access-Control-Allow-Origin`
  - 这意味着在 `GitHub Pages` 这类纯静态站点里，浏览器侧未必能直接跨域 `fetch` 这些官方二进制资源
  - 所以前端页面应按“能预览则预览，失败则回退到元数据与原始地址”的方式设计，不能把浏览器直连解包当成稳定前提

---

## 2. 已核实的字段链路

### 2.1 英雄本体

在 `hero_defines[]` 里可以稳定看到：

- `graphic_id`
- `portrait_graphic_id`

以布鲁诺为例：

- `hero_defines[].graphic_id = 2`
- `graphic_defines[2].graphic = "Characters/Hero_Bruenor"`
- `hero_defines[].portrait_graphic_id = 13`
- `graphic_defines[13].graphic = "Portraits/Portrait_Bruenor"`

这说明：

- `portrait_graphic_id` 对应我们已经在页面里使用的小头像
- `graphic_id` 对应英雄本体立绘资源引用

### 2.2 皮肤资源

在 `hero_skin_defines[].details` 里可以稳定看到：

- `base_graphic_id`
- `large_graphic_id`
- `xl_graphic_id`
- `portrait_graphic_id`

以“海盗布鲁诺”为例：

- `base_graphic_id -> Characters/Hero_BruenorPirate`
- `large_graphic_id -> Characters/Hero_BruenorPirate_Large`
- `xl_graphic_id -> Characters/Hero_BruenorPirate_4xup`
- `portrait_graphic_id -> Portraits/Portrait_BruenorPirate`

这说明官方已经给出了皮肤的小头像、本体图、大图与更大图的完整引用链路。

---

## 3. mobile_assets 返回格式核实

### 3.1 头像类：`Portraits/...`

头像类资源沿用之前已确认的格式：

- 原始响应最前面有一层包装头
- 在二进制里能直接找到 PNG 文件头
- 裁到 PNG 的 `IEND` 后即可得到标准 PNG

这也是当前英雄头像同步脚本能稳定工作的原因。

### 3.2 角色立绘类：`Characters/...`

对 `Characters/Hero_Bruenor`、`Characters/Hero_BruenorPirate_Large`、`Characters/Hero_BruenorPirate_4xup` 做实际请求后确认：

- 原始响应头是 zlib 压缩流，不是直接 PNG
- 对响应体做 `inflate` 后，内部能找到 PNG 文件头
- PNG 后面仍可能有额外尾数据，因此解压后仍应：
  - 先定位 PNG 文件头
  - 再裁到 `IEND`

样例结果：

- `Characters/Hero_Bruenor` -> 可解出 `1024x1024`
- `Characters/Hero_BruenorPirate_Large` -> 可解出 `1024x1024`
- `Characters/Hero_BruenorPirate_4xup` -> 可解出 `1024x512`

当前可以确认：

- 英雄立绘与皮肤立绘是“可解析”的
- 但它们不是适合直接静态托管进仓库的轻量资源

### 3.3 浏览器直连约束：当前未见 CORS 允许头

2026-04-14 进一步对以下地址做响应头核查：

- `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Hero_Bruenor`
- `https://master.idlechampions.com/~idledragons/mobile_assets/Portraits/Portrait_Bruenor`

结果：

- 响应可正常返回 `200`
- 但当前未见 `Access-Control-Allow-Origin`

这带来的实际影响是：

- Node 脚本、命令行抓取或后续代理链路仍然可以请求并解包
- 但如果前端部署在 `GitHub Pages` 这类纯静态站点，浏览器端想直接 `fetch(remoteUrl)` 再做二进制解包，存在被跨域策略阻断的高概率风险

因此当前仓库的页面接入策略应当是：

- 保留运行时解包能力，方便后续代理、浏览器策略变化或本地特殊环境直接复用
- 页面本身必须提供失败兜底：即使远端预览拉不起来，也要继续展示 `graphicId / remotePath / remoteUrl / delivery`

---

## 4. 本仓库落地策略

### 4.1 已落地

- 保留现有 `public/data/<version>/champion-portraits/` 本地头像目录
- 新增 `public/data/<version>/champion-visuals.json`
- 在 `champion-visuals.json` 中为每个英雄写入：
  - 英雄基础头像：本地路径 + 远端元数据
  - 英雄本体立绘：远端元数据
  - 该英雄全部皮肤：皮肤名 + portrait/base/large/xl 远端元数据

### 4.2 不落本地的部分

以下资源目前只保留远端元数据，不把二进制拉进仓库：

- 英雄本体立绘
- 皮肤本体图
- 皮肤 large 图
- 皮肤 xl 图
- 皮肤头像

原因：

- 数量多
- 体积明显大于卡片头像
- 当前页面尚未直接消费
- 用远端元数据更适合后续按需请求与实时解析

### 4.3 数据字段建议

远端资源元数据统一保留：

- `graphicId`
- `sourceGraphic`
- `sourceVersion`
- `remotePath`
- `remoteUrl`
- `delivery`
- `uses`

其中 `delivery` 当前已确认至少有两类：

- `wrapped-png`
- `zlib-png`

后续如果页面要实时展示这些资源，只需按 `delivery` 选择对应的解包方式。

---

## 5. 当前结论的边界

- 当前已确认“引用链路 + 响应格式 + 样例可解包”成立。
- 当前**还没有**为所有立绘资源逐个落地尺寸审计，也没有把这些大图同步进仓库。
- 当前也**不能假设**纯静态站点里的浏览器一定能直接跨域解包这些远端资源，因为官方响应头暂未显式开放 CORS。
- 如果后续要做英雄详情页、皮肤图鉴或大图预览，建议继续保留 `remoteUrl + delivery` 元数据，并以“浏览器按需尝试 + 失败回退元数据 / 后续代理 / 离线脚本”的方式推进，而不是预先把所有图片写入 Git 仓库。

---

## 6. 本次确认用到的官方来源

1. Play server 发现接口  
   `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
2. 2026-04-13 英文 definitions  
   `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=1`
3. 2026-04-13 中文 definitions  
   `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=7`
4. 样例英雄本体立绘  
   `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Hero_Bruenor`
5. 样例皮肤 large / xl 资源  
   `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Hero_BruenorPirate_Large`  
   `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Hero_BruenorPirate_4xup`
