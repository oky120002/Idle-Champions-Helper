#!/usr/bin/env bash
# scripts/ops/slim-git-history.sh
#
# 一次性运维：删除 .png / .json 的历史旧版本 blob，给 git 仓库瘦身。
# 用 git-filter-repo --strip-blobs-with-ids --prune-empty never：精准删除历史中
# 不被任何 ref tip 引用的旧 blob，保留所有 tip 当前版本，不 prune 变空的 commit。
#
# 🔴 高风险·不可逆：重写全部 commit hash，force push 覆盖远端。
#
# == 安全网（filter-repo 前创建全量备份 bundle）==
# 备份在 ${XDG_CACHE_HOME:-~/.cache}/slim-git-history.bundle （状态目录外，清状态不影响）
# 若 filter-repo 结果有误或需回退，恢复：
#   git -C ~/Workspaces/Idle-Champions-Helper fetch ~/.cache/slim-git-history.bundle --all --force
# push 前会校验 heads+tags tip 的 png/json 与重写前一致，不一致则中止并提示恢复。
#
# == 幂等保证 ==
# 任何阶段中断后可直接重新执行本脚本续跑。状态持久化到：
#   ${XDG_CACHE_HOME:-~/.cache}/slim-git-history/
# - strip 清单 / worktree 记录 / origin URL / verify 基线：首次生成后持久保存，重跑不重生成
#   （filter-repo 后原始历史已变，无法重算；filter-repo 原子，失败则 refs 不变）
# - filter-repo：phase3.done 标记，重跑跳过
# - force push：幂等，重复推无副作用
# - worktree 移除/重建：遍历当前 list，已处理的自会跳过
#
# 前置：停掉所有 worktree 的任务，关闭可能在跑 git 的进程。
# 用法：bash <此脚本路径>   （脚本内部 cd 主仓库，调用处无关）
# 二次清理需先清状态：rm -rf "${XDG_CACHE_HOME:-$HOME/.cache}/slim-git-history"

set -euo pipefail

MAIN_REPO="$HOME/Workspaces/Idle-Champions-Helper"
STATE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/slim-git-history"
BACKUP_BUNDLE="${XDG_CACHE_HOME:-$HOME/.cache}/slim-git-history.bundle"

mkdir -p "$STATE_DIR"
trap 'echo "⚠️ 失败，状态保留在：$STATE_DIR；备份 bundle：$BACKUP_BUNDLE；修复后重新执行本脚本即可续跑"' ERR

# 收集 refs/heads/ + refs/tags/ 所有 tip 的 .png/.json blob（去重排序），用于验证
collect_ht_tip_blobs() {
    local out="$1"
    git for-each-ref --format='%(refname)' refs/heads/ refs/tags/ > "$STATE_DIR/_htrefs.tmp"
    while read -r ref; do
        [ -n "$ref" ] || continue
        git ls-tree -r "$ref"
    done < "$STATE_DIR/_htrefs.tmp" | awk '$4 ~ /\.png$|\.json$/ {print $3}' | sort -u > "$out"
}

# ── 预检（每次执行都跑，只读，幂等）──
echo "=== 预检 ==="
[ -d "$MAIN_REPO/.git" ] || { echo "错误：$MAIN_REPO 不是主仓库（.git 非目录）"; exit 1; }
command -v git-filter-repo >/dev/null || { echo "错误：未安装 git-filter-repo"; exit 1; }

cd "$MAIN_REPO"

# (1) 所有 worktree 工作区必须干净（worktree remove --force 会丢弃未提交改动）
git worktree list --porcelain | awk '/^worktree /{print $2}' > "$STATE_DIR/_wt-check.tmp"
while read -r wt; do
    [ -n "$wt" ] || continue
    if [ -n "$(git -C "$wt" status --porcelain)" ]; then
        echo "错误：worktree 工作区不干净，先 commit/stash：$wt"
        git -C "$wt" status --short
        exit 1
    fi
done < "$STATE_DIR/_wt-check.tmp"

# (2) stash 必须为空（filter-repo 会破坏 stash）
if [ -n "$(git stash list)" ]; then
    echo "错误：存在 stash，filter-repo 会破坏它，先 pop/drop："
    git stash list
    exit 1
fi

# (3) 非标准 ref 警告（heads/tags/remotes 之外的，filter-repo 会一并重写）
NONSTD=$(git for-each-ref --format='%(refname)' | grep -vE '^refs/(heads|tags|remotes)/' || true)
if [ -n "$NONSTD" ]; then
    echo "⚠️ 警告：存在非标准 ref，filter-repo 会重写它们（tip 内容保留，hash 会变）："
    echo "$NONSTD"
    echo "（继续执行视为接受）"
fi

echo "主仓库: $MAIN_REPO"
echo "状态:   $STATE_DIR"
echo ""

# ── 阶段 1/5：fetch + 同步检查 + 生成 strip 清单 + 验证基线（仅首次）──
if [ -f "$STATE_DIR/phase1.done" ] && [ -f "$STATE_DIR/strip-blobs.txt" ]; then
    echo "阶段 1/5：跳过（已完成，复用持久化的 strip 清单）"
else
    echo "=== 阶段 1/5：fetch + 同步检查 + 生成旧版本 blob 清单 ==="
    git fetch origin --prune

    # (4) 每个本地 head 不得落后于 origin，否则 force push 会丢远端独有数据
    git for-each-ref --format='%(refname)' refs/heads/ > "$STATE_DIR/_heads.tmp"
    while read -r local_ref; do
        [ -n "$local_ref" ] || continue
        origin_ref="refs/remotes/origin/${local_ref#refs/heads/}"
        if git rev-parse --verify "$origin_ref" >/dev/null 2>&1; then
            behind=$(git rev-list --count "$local_ref..$origin_ref" 2>/dev/null || echo 0)
            if [ "$behind" -gt 0 ]; then
                echo "错误：${local_ref#refs/heads/} 落后 origin $behind 个 commit，force push 会丢远端数据，先 pull/merge"
                exit 1
            fi
        fi
    done < "$STATE_DIR/_heads.tmp"

    git remote get-url origin > "$STATE_DIR/origin-url.txt" 2>/dev/null || true

    # 保留集 = 所有 ref tip 的 .png/.json blob（用 refname，ls-tree 自动解引用 annotated tag）
    git for-each-ref --format='%(refname)' > "$STATE_DIR/_allrefs.tmp"
    while read -r ref; do
        [ -n "$ref" ] || continue
        git ls-tree -r "$ref"
    done < "$STATE_DIR/_allrefs.tmp" | awk '$4 ~ /\.png$|\.json$/ {print $3}' | sort -u > "$STATE_DIR/keep.txt"

    git rev-list --objects --all |
        awk '$2 ~ /\.png$|\.json$/ {print $1}' | sort -u > "$STATE_DIR/all.txt"

    comm -23 "$STATE_DIR/all.txt" "$STATE_DIR/keep.txt" > "$STATE_DIR/strip-blobs.txt"

    # (5) keep 必须非空，否则 strip=all 会删光（防 keep 生成异常导致灾难）
    if [ ! -s "$STATE_DIR/keep.txt" ]; then
        echo "错误：keep 集合为空（无任何 ref tip 含 png/json），strip 将删光，中止"
        exit 1
    fi

    # (6) 验证基线：heads+tags tip 的 png/json blob（push 的核心，filter-repo 后必须一致）
    collect_ht_tip_blobs "$STATE_DIR/verify-keep.txt"

    echo "tip 保留: $(wc -l < "$STATE_DIR/keep.txt" | tr -d ' ') 个 blob"
    echo "历史总计: $(wc -l < "$STATE_DIR/all.txt" | tr -d ' ') 个 blob"
    echo "将删除:   $(wc -l < "$STATE_DIR/strip-blobs.txt" | tr -d ' ') 个旧版本 blob"
    echo "验证基线: $(wc -l < "$STATE_DIR/verify-keep.txt" | tr -d ' ') 个 heads+tags tip blob"
    touch "$STATE_DIR/phase1.done"
fi
echo ""

# ── 阶段 2/5：记录原始 worktree + 移除非主 worktree（天然幂等）──
echo "=== 阶段 2/5：移除 worktree ==="
[ -f "$STATE_DIR/worktrees.txt" ] || git worktree list > "$STATE_DIR/worktrees.txt"
EXTRA_WTS=$(git worktree list | tail -n +2 | awk '{print $1}')
if [ -z "$EXTRA_WTS" ]; then
    echo "无额外 worktree（已全部移除）"
else
    echo "$EXTRA_WTS" | while read -r path; do
        echo "移除: $path"
        git worktree remove --force "$path"
    done
fi
echo ""

# ── 确认（仅首次重写前询问）──
if [ ! -f "$STATE_DIR/phase3.done" ]; then
    echo "🔴 即将重写全部历史并 force push 远端，不可逆。"
    read -r -p "输入 yes 继续： " CONFIRM
    [ "$CONFIRM" = "yes" ] || { echo "已取消，状态保留，可重新执行"; exit 1; }
    echo ""
fi

# ── 阶段 3/5：备份 + filter-repo + 结果验证（仅首次）──
if [ -f "$STATE_DIR/phase3.done" ]; then
    echo "阶段 3/5：跳过（已完成）"
else
    # (7) 全量备份 bundle（幂等，放状态目录外，清状态不影响）
    if [ ! -f "$BACKUP_BUNDLE" ]; then
        echo "创建备份 bundle：$BACKUP_BUNDLE"
        git bundle create "$BACKUP_BUNDLE" --all
    fi

    echo "=== 阶段 3/5：filter-repo 删除旧 blob（--prune-empty never 保留历史结构）==="
    git filter-repo --strip-blobs-with-ids "$STATE_DIR/strip-blobs.txt" \
        --prune-empty never --force

    # (8) 结果验证：heads+tags tip 的 png/json 必须与重写前逐字一致，否则中止不 push
    collect_ht_tip_blobs "$STATE_DIR/verify-keep-post.txt"
    if ! diff -q "$STATE_DIR/verify-keep.txt" "$STATE_DIR/verify-keep-post.txt" >/dev/null; then
        echo "❌ 守卫失败：filter-repo 后 heads+tags tip 的 png/json 与重写前不一致"
        echo "   refs 已被重写，切勿直接 push。从备份恢复："
        echo "   git -C \"$MAIN_REPO\" fetch \"$BACKUP_BUNDLE\" --all --force"
        echo "   恢复后清状态重新调查 strip 决策：rm -rf \"$STATE_DIR\""
        exit 1
    fi
    echo "✅ 验证通过：heads+tags tip 完整"
    touch "$STATE_DIR/phase3.done"
fi
echo "当前 .git 体积: $(du -sh .git | cut -f1)"
echo ""

# ── 阶段 4/5：重建 origin + force push（幂等）──
echo "=== 阶段 4/5：force push ==="
ORIGIN_URL=$(cat "$STATE_DIR/origin-url.txt" 2>/dev/null || echo "")
if [ -z "$ORIGIN_URL" ]; then
    echo "错误：未记录原 origin URL（状态损坏），手动 git remote add origin <URL> 后重跑"; exit 1
fi
if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "$ORIGIN_URL"
    echo "重新添加 origin: $ORIGIN_URL"
fi
git push --force origin --all
git push --force origin --tags
echo ""

# ── 阶段 5/5：重建 worktree（幂等，跳过已存在的）──
echo "=== 阶段 5/5：重建 worktree ==="
CURRENT_WTS=$(git worktree list --porcelain | awk '/^worktree /{print $2}')
tail -n +2 "$STATE_DIR/worktrees.txt" | while read -r path _sha branch; do
    branch=${branch#[}; branch=${branch%]}
    # detached worktree（无方括号分支名）回退到原 sha
    [ -z "$branch" ] && branch="$_sha"
    if echo "$CURRENT_WTS" | grep -qx "$path"; then
        echo "已存在，跳过: $path"
    else
        echo "重建: $path -> ${branch:-$_sha}"
        git worktree add --force "$path" "$branch"
    fi
done
echo ""

echo "=== ✅ 完成 ==="
echo "全部确认无误后清理状态：rm -rf \"$STATE_DIR\""
echo "确认不再需要回退后删备份：rm -f \"$BACKUP_BUNDLE\""
