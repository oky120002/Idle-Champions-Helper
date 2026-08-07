#!/usr/bin/env bash
# scripts/ops/slim-git-history.sh
#
# 一次性运维：剥离 .png / .json 的历史旧版本 blob，给 git 仓库瘦身。
# 用 git-filter-repo --strip-blobs-with-ids --prune-empty never：精准剥离历史中
# 不被任何 ref tip 引用的旧 blob，保留所有 tip 当前版本，不 prune 变空的 commit。
#
# 🔴 高风险·不可逆：重写全部 commit hash，force push 覆盖远端。
#
# 用法：bash <此脚本路径> [--yes]
#   --yes / -y：跳过交互确认（agent/CI 场景）
#   可从主仓库或任意 worktree 调用，脚本自动定位主仓库；
#   仓库外调用用 MAIN_REPO=<路径> 环境变量或默认值。
#
# == 测试 ==
# 本脚本设计为可 `source`：函数定义在外，主流程在 main() + BASH_SOURCE 守卫内。
# source 后可单独调用各函数做单元测试；见 test_slim-git-history.sh。
#
# == 安全网 ==
# 备份：${XDG_CACHE_HOME:-~/.cache}/slim-git-history.bundle（状态目录外）
# 回退：git -C <主仓库> fetch ~/.cache/slim-git-history.bundle --all --force
# push 前校验 heads+tags tip 的 png/json 与重写前一致，不一致则中止并提示恢复。
#
# == 网络（自包含）==
# 远端操作从环境收集候选代理（HTTP_PROXY/HTTPS_PROXY + HTTP_PROXY_* 变量），
# ls-remote 探测选可达路由——代理优先（push 大数据比直连稳）；无候选或都失败则直连。
#
# == 幂等 ==
# 任何阶段中断后可直接重新执行续跑。状态持久化到：
#   ${XDG_CACHE_HOME:-~/.cache}/slim-git-history/
# 二次重置：清空状态目录 "${XDG_CACHE_HOME:-$HOME/.cache}/slim-git-history"

# 不在顶层 set -euo pipefail：source 时会污染调用方。改在 main() 内启用，
# 让被 source 的函数可在测试中安全调用（测试自行管理 errexit）。

# ── 全局配置（source 时即初始化，函数依赖这些；测试可覆盖）──
STATE_DIR="${STATE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/slim-git-history}"
BACKUP_BUNDLE="${BACKUP_BUNDLE:-${XDG_CACHE_HOME:-$HOME/.cache}/slim-git-history.bundle}"
MAIN_REPO="${MAIN_REPO:-}"
ASSUME_YES=0
# PROXY_CANDIDATES 由 main 填充：环境显式空=不收集代理；未设=自动收集。select_route 用 :- 容错
SELECTED_PROXY=""
NETWORK_DECIDED=0

# ── 依赖检查：缺失则提示安装并返回非0（不自动安装——改系统需用户显式决定）──
check_dep() {  # cmd install_hint
    command -v "$1" >/dev/null && return 0
    echo "错误：缺少 $1" >&2
    [ -n "$2" ] && echo "  $2" >&2
    return 1
}

# ── 纯函数：定位主仓库（worktree/主仓库自动解析；仓库外返回空）──
# 用 $1 作为 cwd（测试注入），默认 $PWD
detect_main_repo() {
    local from="${1:-$PWD}" toplevel common abs_common
    toplevel=$(cd "$from" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null) || return 1
    [ -n "$toplevel" ] || return 1
    common=$(git -C "$toplevel" rev-parse --git-common-dir 2>/dev/null) || return 1
    [ -n "$common" ] || return 1
    abs_common=$(cd "$toplevel" && cd "$common" && pwd 2>/dev/null) || return 1
    (cd "$abs_common/.." && pwd)
}

# ── 纯函数：收集代理候选（标准 HTTP_PROXY/HTTPS_PROXY + HTTP_PROXY_* 变量，去重保序）──
collect_proxy_candidates() {
    {
        [ -n "${HTTP_PROXY:-}" ] && echo "$HTTP_PROXY"
        [ -n "${HTTPS_PROXY:-}" ] && echo "$HTTPS_PROXY"
        env | sed -n 's/^HTTP_PROXY_[A-Z]*=//p'
    } | awk 'NF && !seen[$0]++'
}

# ── 收集 refs/heads/ + refs/tags/ tip 的 png/json blob sha（用 $1 为仓库目录）──
# ls-tree 输出 `<mode> <type> <sha>\t<path>`，用 -F'\t' 让 $2 为完整 path（含空格也安全）
collect_ht_tip_blobs() {
    local repo="$1" out="$2"
    git -C "$repo" for-each-ref --format='%(refname)' refs/heads/ refs/tags/ \
        | while read -r ref; do
            [ -n "$ref" ] || continue
            git -C "$repo" ls-tree -r "$ref"
        done | awk -F'\t' '{
            split($1, a, " ")
            if (a[2]=="blob" && $2 ~ /\.png$|\.json$/) print a[3]
        }' | sort -u > "$out"
}

# ── 纯函数：全历史 png/json blob（用 $1 为仓库目录）──
# rev-list --objects 输出 `<sha> <path>`（空格分隔），substr 取完整 path（含空格安全）
collect_all_blobs() {
    local repo="$1" out="$2"
    git -C "$repo" rev-list --objects --all | awk '{
        if (NF < 2) next
        path = substr($0, length($1)+2)
        if (path ~ /\.png$|\.json$/) print $1
    }' | sort -u > "$out"
}

# ── 纯函数：strip = all - keep（comm 要求已排序输入）──
compute_strip_list() {
    local all="$1" keep="$2" out="$3"
    comm -23 "$all" "$keep" > "$out"
}

# ── 选择网络路由：候选代理优先（HTTP/1.1），ls-remote 探测选第一个可达；都失败则直连 ──
# 用 $1 为仓库目录（测 origin URL），幂等（NETWORK_DECIDED=1 后不重探）
select_route() {
    local repo="$1" url proxy
    [ "$NETWORK_DECIDED" = 1 ] && return 0
    NETWORK_DECIDED=1
    url=$(git -C "$repo" remote get-url origin 2>/dev/null) || url="https://github.com"
    while read -r proxy; do
        [ -n "$proxy" ] || continue
        if timeout 30 env HTTP_PROXY="$proxy" HTTPS_PROXY="$proxy" \
            git -c http.version=HTTP/1.1 ls-remote --exit-code "$url" HEAD >/dev/null 2>&1; then
            SELECTED_PROXY="$proxy"
            echo "网络路由：代理 $proxy"
            return 0
        fi
    done <<< "${PROXY_CANDIDATES:-}"
    if timeout 30 git -C "$repo" ls-remote --exit-code "$url" HEAD >/dev/null 2>&1; then
        echo "网络路由：直连"
        return 0
    fi
    echo "⚠️ 候选代理与直连均不可达，远端操作可能失败"
    SELECTED_PROXY=""
    return 1
}

# ── 远端 git 命令（fetch/push）：注入选定路由 + HTTP/1.1（代理模式）──
git_net() {
    local repo="$1"; shift
    select_route "$repo" || true
    if [ -n "$SELECTED_PROXY" ]; then
        HTTP_PROXY="$SELECTED_PROXY" HTTPS_PROXY="$SELECTED_PROXY" ALL_PROXY="$SELECTED_PROXY" \
            git -C "$repo" -c http.version=HTTP/1.1 "$@"
    else
        git -C "$repo" "$@"
    fi
}

# ── 从 filter-repo commit-map 转换旧 sha → 新 sha（detached worktree 重建用）──
translate_sha() {
    local repo="$1" old="$2" map
    map="$repo/.git/filter-repo/commit-map"
    [ -f "$map" ] || { echo "$old"; return; }
    # commit-map 用完整 40 字符 sha，worktrees.txt 记录的是短 sha，用前缀匹配
    awk -v old="$old" 'index($1, old)==1 {print $2; found=1; exit} END{if(!found) print old}' "$map"
}

# ══════════════════════════════ 主流程 ══════════════════════════════
main() {
    set -euo pipefail
    trap 'echo "⚠️ 失败，状态保留在：${STATE_DIR:-状态目录}；备份 bundle：${BACKUP_BUNDLE:-备份}；修复后重新执行本脚本即可续跑"' ERR

    local arg
    for arg in "$@"; do
        case "$arg" in
            --yes|-y) ASSUME_YES=1 ;;
            --help|-h) sed -n '2,35p' "$0"; exit 0 ;;
            *) echo "未知参数: $arg（支持 --yes/-y）" >&2; exit 2 ;;
        esac
    done

    # 初始化全局配置（source 时为空，main 时填充）
    MAIN_REPO="${MAIN_REPO:-$(detect_main_repo || echo "$HOME/Workspaces/Idle-Champions-Helper")}"
    PROXY_CANDIDATES="${PROXY_CANDIDATES-$(collect_proxy_candidates)}"
    mkdir -p "$STATE_DIR"

    echo "=== 预检 ==="
    [ -d "$MAIN_REPO/.git" ] || { echo "错误：$MAIN_REPO 不是主仓库（.git 非目录）；用 MAIN_REPO=<路径> 指定"; exit 1; }
    # 三方依赖感知：缺失提示安装命令并退出（不自动安装——改系统需用户显式决定）
    check_dep git "安装：https://git-scm.com/（macOS：brew install git 或 xcode-select --install）" || exit 1
    check_dep git-filter-repo "安装：pip install git-filter-repo（或 pipx / brew install git-filter-repo）" || exit 1
    check_dep timeout "$(case $(uname -s) in Darwin) echo 'macOS：brew install coreutils';; *) echo 'Linux：通常自带或装 coreutils 包';;esac)" || exit 1

    # (1) origin 必须存在（fetch/push 依赖）
    git -C "$MAIN_REPO" remote get-url origin >/dev/null 2>&1 || { echo "错误：仓库无 origin remote"; exit 1; }

    # (2) 回收失效 worktree 注册，避免后续 worktree 操作受干扰
    git -C "$MAIN_REPO" worktree prune

    # (3) 所有 worktree 工作区必须干净
    git -C "$MAIN_REPO" worktree list --porcelain | awk '/^worktree /{print $2}' > "$STATE_DIR/_wt-check.tmp"
    local wt
    while read -r wt; do
        [ -n "$wt" ] || continue
        if [ -n "$(git -C "$wt" status --porcelain 2>/dev/null)" ]; then
            echo "错误：worktree 工作区不干净，先 commit/stash：$wt"; git -C "$wt" status --short; exit 1
        fi
    done < "$STATE_DIR/_wt-check.tmp"

    # (4) stash 必须为空
    if [ -n "$(git -C "$MAIN_REPO" stash list)" ]; then
        echo "错误：存在 stash，filter-repo 会破坏它，先 pop/drop："; git -C "$MAIN_REPO" stash list; exit 1
    fi

    # (5) 非标准 ref 警告
    local nonstd
    nonstd=$(git -C "$MAIN_REPO" for-each-ref --format='%(refname)' | grep -vE '^refs/(heads|tags|remotes)/' || true)
    [ -n "$nonstd" ] && { echo "⚠️ 非标准 ref（filter-repo 会重写，tip 保留）："; echo "$nonstd"; }

    echo "主仓库: $MAIN_REPO"
    echo "候选代理: ${PROXY_CANDIDATES:-（无，将走直连）}"
    echo ""

    # ── 阶段 1/5 ──
    if [ -f "$STATE_DIR/phase1.done" ] && [ -f "$STATE_DIR/strip-blobs.txt" ]; then
        echo "阶段 1/5：跳过（已完成）"
    else
        echo "=== 阶段 1/5：fetch + 同步检查 + 生成 strip 清单 ==="
        git_net "$MAIN_REPO" fetch origin --prune

        # 每个本地 head 不得落后 origin
        git -C "$MAIN_REPO" for-each-ref --format='%(refname)' refs/heads/ > "$STATE_DIR/_heads.tmp"
        local local_ref origin_ref behind
        while read -r local_ref; do
            [ -n "$local_ref" ] || continue
            origin_ref="refs/remotes/origin/${local_ref#refs/heads/}"
            if git -C "$MAIN_REPO" rev-parse --verify "$origin_ref" >/dev/null 2>&1; then
                behind=$(git -C "$MAIN_REPO" rev-list --count "$local_ref..$origin_ref" 2>/dev/null || echo 0)
                [ "$behind" -gt 0 ] && { echo "错误：${local_ref#refs/heads/} 落后 origin $behind 个 commit，先 pull/merge"; exit 1; }
            fi
        done < "$STATE_DIR/_heads.tmp"

        git -C "$MAIN_REPO" remote get-url origin > "$STATE_DIR/origin-url.txt"

        # 保留集 = 所有 ref tip 的 png/json blob（所有 ref，含 remotes，避免误伤跨 ref 共享 blob）
        git -C "$MAIN_REPO" for-each-ref --format='%(refname)' > "$STATE_DIR/_allrefs.tmp"
        while read -r ref; do
            [ -n "$ref" ] || continue
            git -C "$MAIN_REPO" ls-tree -r "$ref"
        done < "$STATE_DIR/_allrefs.tmp" | awk -F'\t' '{
            split($1, a, " ")
            if (a[2]=="blob" && $2 ~ /\.png$|\.json$/) print a[3]
        }' | sort -u > "$STATE_DIR/keep.txt"

        collect_all_blobs "$MAIN_REPO" "$STATE_DIR/all.txt"
        compute_strip_list "$STATE_DIR/all.txt" "$STATE_DIR/keep.txt" "$STATE_DIR/strip-blobs.txt"

        # keep 必须非空（防异常全剥离）
        [ -s "$STATE_DIR/keep.txt" ] || { echo "错误：keep 集合为空，strip 将全剥离，中止"; exit 1; }

        # strip 空检查：无旧版本则无需重写
        if [ ! -s "$STATE_DIR/strip-blobs.txt" ]; then
            echo "ℹ️ 无历史旧版本 blob 可剥离（仓库已瘦），无需重写历史。退出。"
            touch "$STATE_DIR/phase1.done"
            exit 0
        fi

        # 验证基线：heads+tags tip
        collect_ht_tip_blobs "$MAIN_REPO" "$STATE_DIR/verify-keep.txt"

        echo "tip 保留: $(wc -l < "$STATE_DIR/keep.txt" | tr -d ' ') 个 blob"
        echo "历史总计: $(wc -l < "$STATE_DIR/all.txt" | tr -d ' ') 个 blob"
        echo "将剥离:   $(wc -l < "$STATE_DIR/strip-blobs.txt" | tr -d ' ') 个旧版本 blob"
        echo "验证基线: $(wc -l < "$STATE_DIR/verify-keep.txt" | tr -d ' ') 个 heads+tags tip blob"
        touch "$STATE_DIR/phase1.done"
    fi
    echo ""

    # ── 阶段 2/5 ──
    echo "=== 阶段 2/5：移除 worktree ==="
    [ -f "$STATE_DIR/worktrees.txt" ] || git -C "$MAIN_REPO" worktree list > "$STATE_DIR/worktrees.txt"
    local extra_wts path
    extra_wts=$(git -C "$MAIN_REPO" worktree list | tail -n +2 | awk '{print $1}')
    if [ -z "$extra_wts" ]; then
        echo "无额外 worktree（已全部移除）"
    else
        echo "$extra_wts" | while read -r path; do
            echo "移除: $path"
            # 根因：worktree 的 untracked/ignored（node_modules 等）让 worktree remove 报 Directory not empty。
            # 脚本自己处理——先 git clean 清 untracked，再 worktree remove（注销+清追踪）。不甩用户。
            git -C "$path" clean -xfd 2>/dev/null || true
            if ! git -C "$MAIN_REPO" worktree remove --force "$path" 2>/dev/null; then
                # clean + remove 都失败：多为文件权限/进程占用（系统级，脚本无法强占），才报告用户
                echo "❌ worktree remove 失败（git clean 后仍失败）——多为权限或进程占用，脚本无法处理"
                echo "   $path 残留："
                find "$path" -maxdepth 1 2>/dev/null | head -5 || echo "   （目录不存在）"
                echo "   解决占用/权限后，重新执行本脚本（幂等）："
                echo "   cd \"$MAIN_REPO\" && bash \"$0\" --yes"
                exit 1
            fi
        done
    fi
    echo ""

    # ── 确认 ──
    if [ "$ASSUME_YES" = 0 ] && [ ! -f "$STATE_DIR/phase3.done" ]; then
        echo "🔴 即将重写全部历史并 force push 远端，不可逆。"
        read -r -p "输入 yes 继续（或用 --yes 跳过）： " confirm
        [ "$confirm" = "yes" ] || { echo "已取消，状态保留，可重新执行"; exit 1; }
        echo ""
    fi

    # ── 阶段 3/5 ──
    if [ -f "$STATE_DIR/phase3.done" ]; then
        echo "阶段 3/5：跳过（已完成）"
    else
        [ -f "$BACKUP_BUNDLE" ] || { echo "创建备份 bundle：$BACKUP_BUNDLE"; git -C "$MAIN_REPO" bundle create "$BACKUP_BUNDLE" --all; }

        echo "=== 阶段 3/5：filter-repo 剥离旧 blob（--prune-empty never）==="
        git -C "$MAIN_REPO" filter-repo --strip-blobs-with-ids "$STATE_DIR/strip-blobs.txt" \
            --prune-empty never --force

        # 结果验证：heads+tags tip 必须与重写前一致
        collect_ht_tip_blobs "$MAIN_REPO" "$STATE_DIR/verify-keep-post.txt"
        if ! diff -q "$STATE_DIR/verify-keep.txt" "$STATE_DIR/verify-keep-post.txt" >/dev/null; then
            echo "❌ 守卫失败：filter-repo 后 heads+tags tip 与重写前不一致（strip 决策可能误伤 tip）"
            echo "   refs 已重写。⚠️ 直接重跑会持续失败——按顺序执行："
            echo "   ① 恢复历史：cd \"$MAIN_REPO\" && git fetch \"$BACKUP_BUNDLE\" --all --force"
            echo "   ② 清空状态目录 \"$STATE_DIR\" 的内容（脚本不自动执行，需你手动清空）"
            echo "   ③ 调查 strip 决策后重跑：cd \"$MAIN_REPO\" && bash \"$0\" --yes"
            exit 1
        fi
        echo "✅ 验证通过：heads+tags tip 完整"
        touch "$STATE_DIR/phase3.done"
    fi
    echo "当前 .git 体积: $(du -sh "$MAIN_REPO/.git" | cut -f1)"
    echo ""

    # ── 阶段 4/5 ──
    echo "=== 阶段 4/5：force push ==="
    local origin_url
    origin_url=$(cat "$STATE_DIR/origin-url.txt" 2>/dev/null)
    [ -n "$origin_url" ] || { echo "错误：未记录 origin URL（状态损坏）"; exit 1; }
    git -C "$MAIN_REPO" remote get-url origin >/dev/null 2>&1 || git -C "$MAIN_REPO" remote add origin "$origin_url"
    # filter-repo 移除过 origin，强制重探测网络
    NETWORK_DECIDED=0; SELECTED_PROXY=""
    git_net "$MAIN_REPO" push --force origin --all
    git_net "$MAIN_REPO" push --force origin --tags
    echo ""

    # ── 阶段 5/5 ──
    echo "=== 阶段 5/5：重建 worktree ==="
    local current_wts
    current_wts=$(git -C "$MAIN_REPO" worktree list --porcelain | awk '/^worktree /{print $2}')
    # 重建循环临时关闭 errexit：单个 worktree 失败（如 detached 旧 sha 失效）不中止全部
    set +e
    tail -n +2 "$STATE_DIR/worktrees.txt" | while read -r path _sha branch; do
        wt_path="$path"  # 固定到本地变量，规避后续命令的变量作用域边角
        case "$branch" in \(*) branch="" ;; *) branch=${branch#[}; branch=${branch%]} ;; esac
        if [ -z "$branch" ]; then
            branch=$(translate_sha "$MAIN_REPO" "$_sha")
        fi
        if echo "$current_wts" | grep -Fxq "$wt_path"; then
            echo "已存在，跳过: $wt_path"; continue
        fi
        if git -C "$MAIN_REPO" worktree add --force "$wt_path" "$branch" 2>/dev/null; then
            echo "重建: $wt_path -> ${branch:-$_sha}"
        else
            echo "⚠️ 无法重建 $wt_path（detached HEAD 旧 sha 重写后失效或路径冲突）"
            echo "   手动重建——在主仓库目录执行："
            echo "   cd \"$MAIN_REPO\" && git worktree add --detach <重写后的sha> \"$wt_path\""
            echo "   （<重写后的sha> 用 git log 查；本仓库通常无 detached worktree，多数情况可忽略）"
        fi
    done
    set -e
    echo ""

    echo "=== ✅ 完成 ==="
    echo "⚠️ 重建的 worktree 缺 node_modules（gitignore），运行项目前先 npm install"
    echo "重置状态：清空 \"$STATE_DIR\""
    echo "确认不再需要回退后重置备份：清空 \"$BACKUP_BUNDLE\""
}

# 守卫：直接执行才跑 main；source 时只暴露函数（供测试）
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    main "$@"
fi
