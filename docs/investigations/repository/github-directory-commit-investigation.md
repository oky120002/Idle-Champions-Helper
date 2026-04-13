# `.github` 目录无法提交问题排查

- 排查时间：2026-04-13
- 排查对象：仓库内 `.github/` 目录（历史问题）
- 当前结论：**当 `.github/` 下只有被忽略文件时，Git 不会跟踪这个目录；当前仓库已存在 `.github/workflows/deploy.yml`，本文仅保留原理说明，不代表现状仍有阻塞。**

---

## 1. 结论

当前仓库里的 `.github` 目录只有一个文件：

- `.github/.DS_Store`

而这个文件被以下规则忽略：

- 仓库内 `.gitignore` 第 20 行：`.DS_Store`
- 用户全局忽略文件 `~/.gitignore_global`：`.DS_Store`

因此 Git 看到的实际效果是：

- `.github` 目录里没有任何可跟踪文件
- Git 不会跟踪空目录
- 所以提交时 `.github` 不会出现，也不会被推送到远端

这说明当前阻塞点在**本地目录内容与忽略规则**，不是 GitHub 仓库设置。

---

## 2. 本地验证依据

### 2.1 目录实际内容

执行结果显示 `.github` 下只有 `.DS_Store`：

```text
.github
.github/.DS_Store
```

### 2.2 忽略规则命中

执行 `git check-ignore -v .github/.DS_Store` 后，命中结果为：

```text
.gitignore:20:.DS_Store	.github/.DS_Store
```

### 2.3 当前提交树里没有 `.github`

执行 `git ls-tree -r --name-only HEAD .github` 没有返回结果，说明当前已提交历史中也没有被 Git 跟踪的 `.github` 内容。

---

## 3. 为什么会误以为“提交不上去”

当前 `README.md` 里把 `.github/workflows/deploy.yml` 写进了目录结构和部署说明，但工作区里实际上没有这个文件。

所以现状是：

- 文档把 `.github/workflows/deploy.yml` 当成“应存在”
- 本地目录里实际上没有任何可提交的工作流文件
- 结果看起来像是“.github 提交不上去”，但本质上是**目录是空的**

---

## 4. 什么时候才需要去 GitHub 配置

只有在你已经把真实文件提交进 `.github` 之后，才可能需要 GitHub 侧配置。

例如你后续新增：

- `.github/workflows/deploy.yml`

这时才需要再看 GitHub 仓库设置，比如：

- `Settings -> Pages` 是否选择 `GitHub Actions`
- 仓库是否开启了限制工作流变更的权限策略
- 如果你用的是权限受限的 Personal Access Token，是否具备更新 workflow 的权限

但就这次排查结果看，**你现在还没到 GitHub 配置这一步**。

---

## 5. 可行修复方式

如果你的目标是让 `.github` 真的进入版本控制，有两种常见做法：

### 5.1 提交真实用途文件

最合理的做法是直接创建你真正需要的文件，例如：

- `.github/workflows/deploy.yml`
- `.github/ISSUE_TEMPLATE/bug-report.yml`
- `.github/pull_request_template.md`

### 5.2 只想保留目录本身

如果只是暂时想把目录结构占住，可以放一个占位文件，例如：

- `.github/.gitkeep`

注意：

- `.DS_Store` 不适合作为占位文件
- 即使强行取消忽略 `.DS_Store`，也不推荐把它提交进仓库

---

## 6. 当前建议

建议按下面顺序处理：

1. 先决定 `.github` 里到底要放什么；如果是部署，优先补 `.github/workflows/deploy.yml`
2. 如果暂时还没准备好工作流，就不要单独提交一个空 `.github` 目录
3. 顺手修正文档中“已存在 `.github/workflows/deploy.yml`”的表述，避免后续继续误判

---

## 7. 本次排查使用的本地依据

- 仓库文件系统：`.github` 目录实际内容
- 仓库忽略规则：`.gitignore`
- 用户全局忽略规则：`~/.gitignore_global`
- Git 当前树状态：`git ls-tree -r --name-only HEAD .github`
