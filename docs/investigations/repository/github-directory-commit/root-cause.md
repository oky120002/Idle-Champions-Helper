# `.github` 目录：根因与本地依据

- 日期：2026-04-13
- 目标：解释为什么那次看起来像“.github 提交不上去”，以及本地证据是什么。

## 结论

当次排查时，`.github` 目录只有一个文件：`.github/.DS_Store`。而这个文件同时命中了仓库内 `.gitignore` 与 Git 全局忽略规则，所以 Git 看到的实际效果是：`.github` 目录里没有任何可跟踪文件；Git 不会跟踪空目录；提交时 `.github` 不会出现，也不会被推送到远端。

## 本地验证依据

### 目录实际内容

执行结果显示 `.github` 下只有 `.DS_Store`。

### 忽略规则命中

执行 `git check-ignore -v .github/.DS_Store` 后，命中 `.gitignore:20:.DS_Store`。

### 当前提交树里没有 `.github`

执行 `git ls-tree -r --name-only HEAD .github` 没有返回结果，说明当时的已提交历史中也没有被 Git 跟踪的 `.github` 内容。

## 为什么会误以为“提交不上去”

当时 `README.md` 把 `.github/workflows/deploy.yml` 写进了目录结构和部署说明，但工作区里实际上没有这个文件。所以现象看起来像“.github 提交不上去”，但本质上是目录为空。
