# `.github` 目录：修复方式与 GitHub 配置边界

- 日期：2026-04-13
- 目标：说明什么时候才需要去看 GitHub 配置，以及当时有哪些可行修复方式。

## 什么时候才需要去 GitHub 配置

只有在已经把真实文件提交进 `.github` 之后，才可能需要 GitHub 侧配置。例如新增 `.github/workflows/deploy.yml` 之后，才需要再看：`Settings -> Pages` 是否选择 `GitHub Actions`、仓库是否限制工作流变更、当前 PAT 是否具备更新 workflow 的权限。

但就那次排查结果看，当时还没到 GitHub 配置这一步。

## 可行修复方式

### 提交真实用途文件

最合理的做法是直接创建真正需要的文件，例如：`.github/workflows/deploy.yml`、`.github/ISSUE_TEMPLATE/bug-report.yml`、`.github/pull_request_template.md`。

### 只想保留目录本身

如果只是暂时想把目录结构占住，可以放一个占位文件，例如 `.github/.gitkeep`。

注意：`.DS_Store` 不适合作为占位文件；即使强行取消忽略 `.DS_Store`，也不推荐把它提交进仓库。

## 当前建议

1. 先决定 `.github` 里到底要放什么；如果是部署，优先补 `.github/workflows/deploy.yml`
2. 如果暂时还没准备好工作流，就不要单独提交一个空 `.github` 目录
3. 顺手修正文档中“已存在 `.github/workflows/deploy.yml`”的表述，避免后续继续误判
