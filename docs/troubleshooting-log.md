# 问题排查台账

## 用途

这份文档用于沉淀仓库内出现过的典型问题，作为统一的快速备查入口。

适用范围包括但不限于：

- Git 与仓库配置问题
- GitHub Pages 与 GitHub Actions 部署问题
- 本地运行、构建、预览问题
- 数据脚本、环境变量、认证与网络问题

## 使用方式

后续出现新问题时，直接在本文件追加一条新记录，不再为每个小问题单独新增一份零散文档；只有当某类问题需要非常深入、长期维护的独立说明时，再拆成专题文档。

## 记录模板

每条问题记录至少包含这些信息：

- 问题标题
- 状态
- 发现/确认时间
- 影响范围
- 问题描述
- 排查过程摘要
- 根因
- 解决方案
- 验证结果
- 引用信息
- 后续预防建议

---

## 记录 001：GitHub Pages 首次部署失败

### 状态

- 已解决

### 发现与确认时间

- 首次失败确认时间：`2026-04-13`
- 成功恢复时间：`2026-04-13`

### 影响范围

- 仓库：`Idle-Champions-Helper`
- 发布链路：`GitHub Pages + GitHub Actions`
- 线上地址：`https://oky120002.github.io/Idle-Champions-Helper/`

### 问题描述

- 工作流 `.github/workflows/deploy.yml` 已经推到远端
- 仓库 `Actions` 页面有运行记录，但首次部署失败
- `Pages` 页面没有正常站点信息，线上地址最初无法访问
- 排查期间还伴随 token 认证异常、权限不足和网络解析不稳定等混杂现象

### 排查过程摘要

1. 先确认 workflow 文件确实已经推到远端 `main`
2. 再确认工作流确实触发过，而不是“根本没有运行”
3. 进一步查看运行详情，定位到失败步骤是 `配置 GitHub Pages`
4. 查询仓库信息，发现仓库当时 `has_pages = false`
5. 重新检查 PAT，确认此前既出现过 token 失效，也出现过缺少 `workflow` 权限的问题
6. 排查过程中还发现本机网络/代理并不稳定，出现过 `Could not resolve proxy` 和 `Could not resolve host`，干扰了定位
7. 最终先开启仓库 `Pages`，再重跑失败工作流，部署恢复成功

### 根因

这次不是单点问题，而是多因素叠加：

1. 直接根因：仓库没有启用 `GitHub Pages`，导致 `actions/configure-pages` 在读取 Pages 站点配置时返回 `Not Found`
2. 次级问题：旧的 `GITHUB_TOKEN` 已失效
3. 次级问题：新的 PAT 一度缺少 `workflow` 权限，导致 workflow 相关推送失败
4. 干扰因素：本机网络或代理不稳定，导致部分 GitHub API 请求失败

### 关于“环境变量里的引号”这件事

- 如果是在 shell 里这样写：`export GITHUB_TOKEN="ghp_xxx"`，双引号只是 shell 语法，一般不会进入最终变量值
- 如果是在某个环境变量配置界面、配置文件或工具设置里，把引号本身也一起保存成真实值，例如 `"ghp_xxx"`，这会导致认证失败
- 因此，“真实值里混入字面量引号”确实可能是问题，但**不是这次部署失败的唯一根因，也不是最核心的根因**
- 这次最核心的直接故障仍然是：仓库未启用 `Pages`

### 解决方案

1. 重新申请可用的 GitHub PAT
2. PAT 权限补齐为：
   - `repo`
   - `workflow`
3. 将 workflow 文件推到远端 `main`
4. 为仓库开启 `GitHub Pages`
5. 将发布方式设置为 `GitHub Actions`
6. 重跑失败的工作流
7. 等待 Pages 站点发布完成并验证可访问

### 验证结果

- 第二次运行中，`build` 成功
- `deploy` 成功
- 线上地址已可访问：`https://oky120002.github.io/Idle-Champions-Helper/`
- 成功运行记录：`https://github.com/oky120002/Idle-Champions-Helper/actions/runs/24312930707`

### 引用信息

- 工作流文件：`.github/workflows/deploy.yml`
- 仓库首页：`https://github.com/oky120002/Idle-Champions-Helper`
- 成功站点：`https://oky120002.github.io/Idle-Champions-Helper/`
- 成功工作流：`https://github.com/oky120002/Idle-Champions-Helper/actions/runs/24312930707`
- 相关部署方案：`docs/research/deployment/static-hosting-research.md`
- 本地运行验证：`docs/investigations/runtime/local-run-verification.md`

### 后续预防建议

- 新仓库第一次上 GitHub Pages 前，先确认仓库 `Pages` 已启用
- 遇到 workflow 推送失败，优先检查 PAT 是否包含 `workflow` 权限
- 遇到 `gh`、`curl`、`git` 结果互相矛盾，先排网络/代理，再排权限
- 设置环境变量时，优先用 shell 标准写法，避免把引号、空格、换行作为真实值写进去
- 优先先修配置问题，再重跑 workflow，不要在代码层反复试错
