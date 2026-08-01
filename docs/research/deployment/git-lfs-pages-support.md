# git-lfs 与 GitHub Pages 兼容性调研（E1）

> 背景：仓库 192MB 动画 .bin（1214 文件，平均 ~163KB）直接进 git，评估是否改用 git-lfs 缓解仓库膨胀。结论：**不引入 lfs**。

## 结论

**GitHub Pages 原生不支持 git-lfs**——访客请求 lfs 资源拿到的是指针文件（几十字节文本），非真实二进制。官方文档明确：「Git LFS cannot be used with GitHub Pages sites.」

对本场景（192MB / 1214 个小文件），lfs 是错的工具：小文件群的指针开销 + API 往返反而更重，且与 Pages 天然冲突。

## 依据

| 部署方式 | 构建期拿到 | 访客拿到 | 可用 |
|---|---|---|---|
| 经典分支部署 | 指针文件 | **指针（资源损坏）** | 否 |
| Actions 部署 + `actions/checkout` `lfs: true` | 真实二进制（构建期解析） | 真实二进制（来自上传产物） | 是，但每次构建消耗 lfs 带宽配额 |

- 官方禁用声明 + 单文件上限（Free/Pro 2GB）：[About Git LFS – GitHub Docs](https://docs.github.com/repositories/working-with-files/managing-large-files/about-git-large-file-storage)
- 机制解释（GitHub staff：Pages 不从 git 仓库服务静态资源，读内部产物快照）+ Actions 变通：[community #50337](https://github.com/orgs/community/discussions/50337)
- 配额（Free 10GiB 带宽/存储，超额且预算 $0 当月禁用）：[LFS billing – GitHub Docs](https://docs.github.com/billing/managing-billing-for-git-large-file-storage/about-billing-for-git-large-file-storage)
- `lfs: true` 历史不稳定（需额外 `git lfs pull`）：[actions/checkout #270](https://github.com/actions/checkout/issues/270)

## 为何不适用本场景

192MB / 1214 个 ~163KB 小文件，与 lfs 设计目标（少量 >50MB 大文件）相反：

- 每文件 ~130 字节指针 + lfs API 往返，clone/checkout 需 1214 次对象请求，比直接读 192MB 更慢。
- 192MB 直接 commit 在 GitHub 推荐 <1GB 安全区（[disk quota](https://docs.github.com/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-personal-account-settings/managing-your-account/what-is-my-disk-quota)）。
- lfs 不解决历史膨胀：当前版本挪到对象存储，历史版本的 lfs 对象仍算配额；真正解决的是「不在 git 历史留二进制 diff」，前提是 .bin 频繁更迭。

## 替代方案（若未来仓库体积成真痛点）

| 方案 | 利 | 弊 |
|---|---|---|
| 维持现状 | 零改动，走 Pages CDN 免费 | 体积随 .bin 更新累积 |
| Release Assets | 免费、走 GitHub CDN、不计 lfs 配额、单文件 2GB | URL 无语义、需同步脚本、版本自管 |
| 外部 CDN（Cloudflare R2 10GB 免费 / B2） | 访客带宽不占 GitHub、适合高流量 | 第三方依赖、CORS/域名配置 |
| jsDelivr（`cdn.jsdelivr.net/gh`） | 免费 CDN、与仓库同源 | 单文件 50MB 上限、缓存延迟、公开仓库限定 |

## 决策

当前 **维持现状**，登记到 `docs/specs/product/future-features.md`，待有空闲再评估 Release Assets。无需代码改动。
