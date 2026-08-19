**状态**: 已否决（不做外链 + Pages 不支持 lfs；2026-08-07）

# 动画资源仓库体积治理

## 是什么

动画 `.bin` 直接进 git，曾考虑迁移外部存储缓解仓库膨胀。

## 为何否决

- **不做外链**，坚持 GitHub 一站式。
- **Pages 原生不支持 git-lfs**（访客拿到指针文件而非真实内容），无可用外链方案。
- **体积实测**（2026-08-07）：`.bin` 1224 个 / 195M，`.png` 立绘+图标 5619 个 / 144M，`.json` 196 个 / 71M；工作区 `public/data` 合计 424M，`.git` 历史 643M。原提案「192MB」只数了 `.bin`，偏低；但 1GB 余量当前仍足够。
- 待真正接近上限再评估，首选 Release Assets（不进 git 历史）。

## 关联

- [git-lfs-pages-support.md](../../research/deployment/git-lfs-pages-support.md)
- [2026-08-visual-asset-full-audit.md](../../requirements/2026-08-visual-asset-full-audit.md)（全量资源审计，待评）
