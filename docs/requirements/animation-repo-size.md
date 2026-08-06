# 动画资源仓库体积治理

**优先级**：待评

## 是什么

1214 个动画 .bin（共 192MB）直接进 git，评估迁移到外部存储缓解仓库膨胀。

## 为何暂缓

调研确认 GitHub Pages 原生不支持 git-lfs（访客拿到指针文件而非真实内容），且小文件群用 lfs 指针开销反而更重；192MB 在 GitHub 推荐 <1GB 安全区。当前无部署压力。

## 关联

- [git-lfs-pages-support.md](../research/deployment/git-lfs-pages-support.md)
- [visual-asset-full-audit.md](./visual-asset-full-audit.md)（全量资源审计，提供体积数据）
