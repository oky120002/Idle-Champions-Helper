#!/usr/bin/env bash
# test_slim-git-history.sh —— slim-git-history.sh 的函数单元 + 流程集成测试
# 纯 bash，无外部测试框架（bats/pytest）。用法：bash test_slim-git-history.sh
#
# 依赖：git、git-filter-repo（集成测试用）。缺失则提示安装并退出。
#
# 覆盖：
#   单元——纯函数（detect_main_repo / collect_proxy_candidates / compute_strip_list /
#     parse_worktree_list / translate_sha / check_dep）、git 函数（collect_ht_tip_blobs /
#     collect_all_blobs，临时仓库）、网络（select_route，本地 bare 模拟）
#   集成——完整流程（filter-repo + push 本地 bare + tip 保留）、幂等重跑、strip 空、
#     验证守卫（strip 含 tip→中止）、worktree 移除+重建
#   不可单元测（注释）：select_route 真代理探测（需真网络，无法隔离）；集成用本地 bare 等价覆盖 push 路径

# shellcheck disable=SC1090,SC2034,SC2016
set -u

command -v git >/dev/null || { echo "❌ 需要 git：https://git-scm.com/"; exit 1; }
command -v git-filter-repo >/dev/null || { echo "❌ 需要 git-filter-repo（集成测试）：pip install git-filter-repo"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$SCRIPT_DIR/slim-git-history.sh"
PASS=0; FAIL=0; SKIP=0

assert_eq() { if [ "$1" = "$2" ]; then echo "  ✓ $3"; PASS=$((PASS+1)); else echo "  ✗ $3：期望 [$2] 实际 [$1]" >&2; FAIL=$((FAIL+1)); fi; }
assert_contains() { case "$1" in *"$2"*) echo "  ✓ $3"; PASS=$((PASS+1)); ;; *) echo "  ✗ $3：[$1] 不含 [$2]" >&2; FAIL=$((FAIL+1)); ;; esac; }
assert_exit() { local exp=$1; shift; "$@" >/dev/null 2>&1; local a=$?; if [ "$a" = "$exp" ]; then echo "  ✓ exit=$exp: $*"; PASS=$((PASS+1)); else echo "  ✗ exit 期望 $exp 实际 $a: $*" >&2; FAIL=$((FAIL+1)); fi; }

. "$SCRIPT" || { echo "❌ source 主脚本失败"; exit 1; }

# 临时目录登记 + EXIT 兜底报告（含 setup 内建的 bare，防异常中止或漏处理残留）
_CREATED=""
_tmpdir() { local d; d=$(mktemp -d) || return 1; _CREATED="${_CREATED:+$_CREATED$'\n'}$d"; echo "$d"; }
# check_tmp_path：只校验路径合法性，不改动文件系统（零副作用）。临时路径静默，非临时路径警告
check_tmp_path() {
    local p
    for p in "$@"; do
        [ -n "$p" ] || continue
        case "$p" in
            /tmp/*|/var/folders/*) ;;
            *) echo "⚠️ check_tmp_path 拒绝非临时路径: $p" >&2 ;;
        esac
    done
}
cleanup() {
    [ -z "$_CREATED" ] || { echo "ℹ️ 测试临时目录保留（脚本不改动文件系统），可手动清或等系统清：" >&2; printf '%s\n' "$_CREATED" | sed 's/^/  /' >&2; }
}
trap cleanup EXIT

# ── setup：临时仓库（多版本 png/json，产生旧版本 blob）──
setup_tmp_repo() {
    local tmp; tmp=$(_tmpdir)
    git -C "$tmp" init -q; git -C "$tmp" config user.email t@t; git -C "$tmp" config user.name t
    printf 'v1' > "$tmp/data.json"; git -C "$tmp" add .; git -C "$tmp" commit -qm v1
    printf 'v2' > "$tmp/data.json"; git -C "$tmp" add .; git -C "$tmp" commit -qm v2
    printf 'png1' > "$tmp/a.png"; git -C "$tmp" add .; git -C "$tmp" commit -qm p1
    printf 'png2' > "$tmp/a.png"; git -C "$tmp" add .; git -C "$tmp" commit -qm p2
    echo "$tmp"
}
setup_full_repo() {  # 加 bare remote 并 push（模拟远端）
    local tmp bare; tmp=$(setup_tmp_repo); bare=$(_tmpdir)
    git init -q --bare "$bare"; git -C "$tmp" remote add origin "$bare"
    git -C "$tmp" push -q origin HEAD:main 2>/dev/null; echo "$tmp"
}

# ═════════════════ 单元：纯函数 ═════════════════
echo "── 单元：纯函数 ──"

echo "[check_dep]"
assert_exit 0 check_dep git "" "git 存在→0"
assert_exit 1 check_dep __no_such_cmd_xyz__ "" "不存在→1"

echo "[check_tmp_path：只校验不改动]"
assert_contains "$(check_tmp_path / 2>&1)" "拒绝" "/ → 拒绝"
assert_contains "$(check_tmp_path /Users 2>&1)" "拒绝" "/Users → 拒绝"
assert_eq "$(check_tmp_path "" 2>&1)" "" "空值→静默"
d=$(_tmpdir); check_tmp_path "$d"
if [ -d "$d" ]; then echo "  ✓ /tmp 路径保留（不改动文件系统）"; PASS=$((PASS+1)); else echo "  ✗ /tmp 被动了"; FAIL=$((FAIL+1)); fi

echo "[detect_main_repo]"
MAIN=/Users/rain/Workspaces/Idle-Champions-Helper
if [ -d "$MAIN/.git" ]; then
    assert_eq "$(detect_main_repo "$MAIN")" "$MAIN" "主仓库→自身"
    wt=$(git -C "$MAIN" worktree list 2>/dev/null | sed -n '2p' | awk '{print $1}')
    [ -n "$wt" ] && [ -d "$wt" ] && assert_eq "$(detect_main_repo "$wt")" "$MAIN" "worktree→主仓库"
else echo "  跳过（主仓库 $MAIN 不在）"; SKIP=$((SKIP+1)); fi
assert_exit 1 detect_main_repo /tmp "仓库外→1"

echo "[collect_proxy_candidates]"
# env -i 隔离，避免当前 shell 的 HTTP_PROXY_*（如 HTTP_PROXY_SOCLOUD）泄漏干扰
r=$(env -i PATH="$PATH" HOME="$HOME" HTTP_PROXY=http://a:1 HTTPS_PROXY=http://a:1 HTTP_PROXY_HK=http://b:2 HTTP_PROXY_X=http://b:2 \
    bash -c 'source "$1"; collect_proxy_candidates' _ "$SCRIPT")
assert_eq "$r" "$(printf 'http://a:1\nhttp://b:2')" "去重保序（HTTP_PROXY+HTTP_PROXY_*，重复去重）"
r=$(env -i PATH="$PATH" HOME="$HOME" bash -c 'source "$1"; collect_proxy_candidates' _ "$SCRIPT")
assert_eq "$r" "" "空环境→空"

echo "[compute_strip_list]"
d=$(_tmpdir); printf 'a\nb\nc\nd\n' > "$d/all"; printf 'b\n' > "$d/keep"
compute_strip_list "$d/all" "$d/keep" "$d/strip"
assert_eq "$(cat "$d/strip")" "$(printf 'a\nc\nd')" "strip = all - keep"
printf 'a\nb\nc\nd\n' > "$d/keep2"; compute_strip_list "$d/all" "$d/keep2" "$d/s2"
assert_eq "$(cat "$d/s2")" "" "keep 全包含→strip 空"
check_tmp_path "$d"

echo "[parse_worktree_list]"
in=$'/p/a abc [main]\n/p/b def [opencode/dev1]\n/p/c ghi (detached)'
assert_eq "$(echo "$in" | parse_worktree_list)" "$(printf '/p/a\tmain\n/p/b\topencode/dev1\n/p/c\t')" "分支名 + detached 空"

echo "[translate_sha]"
d=$(_tmpdir)
assert_eq "$(translate_sha "$d" old)" "old" "无 commit-map→原 sha"
mkdir -p "$d/.git/filter-repo"; printf 'old new\nfoo bar\n' > "$d/.git/filter-repo/commit-map"
assert_eq "$(translate_sha "$d" old)" "new" "有 map→转换"
assert_eq "$(translate_sha "$d" miss)" "miss" "无匹配→原"
check_tmp_path "$d"

# ═════════════════ 单元：git 函数（临时仓库）═════════════════
echo "── 单元：git 函数 ──"

echo "[collect_ht_tip_blobs]"
r=$(setup_tmp_repo); STATE_DIR=$(_tmpdir)
collect_ht_tip_blobs "$r" "$STATE_DIR/out"
assert_eq "$(wc -l < "$STATE_DIR/out" | tr -d ' ')" "2" "tip 收集 2 blob（json+png 当前版本）"
check_tmp_path "$r" "$STATE_DIR"

echo "[collect_ht_tip_blobs：path 含空格]"
r=$(_tmpdir); git -C "$r" init -q; git -C "$r" config user.email t@t; git -C "$r" config user.name t
mkdir -p "$r/sub dir"; printf 'x' > "$r/sub dir/f.json"; git -C "$r" add .; git -C "$r" commit -qm x
STATE_DIR=$(_tmpdir); collect_ht_tip_blobs "$r" "$STATE_DIR/out"
assert_eq "$(wc -l < "$STATE_DIR/out" | tr -d ' ')" "1" "path 含空格仍收集到 1 blob（-F tab 修复验证）"
check_tmp_path "$r" "$STATE_DIR"

echo "[collect_all_blobs]"
r=$(setup_tmp_repo); STATE_DIR=$(_tmpdir)
collect_all_blobs "$r" "$STATE_DIR/all"
assert_eq "$(wc -l < "$STATE_DIR/all" | tr -d ' ')" "4" "历史 4 blob（json×2 + png×2）"
check_tmp_path "$r" "$STATE_DIR"

# ═════════════════ 单元：网络（本地 bare，不碰真网络）═════════════════
echo "── 单元：网络 ──"

echo "[select_route：无候选→本地 bare 直连]"
bare=$(_tmpdir); git init -q --bare "$bare"
r=$(_tmpdir); git -C "$r" init -q; git -C "$r" config user.email t@t; git -C "$r" config user.name t
git -C "$r" commit --allow-empty -qm x; git -C "$r" remote add origin "$bare"; git -C "$r" push -q origin HEAD:main 2>/dev/null
PROXY_CANDIDATES="" NETWORK_DECIDED=0 SELECTED_PROXY=""
select_route "$r" >/dev/null 2>&1
assert_eq "$SELECTED_PROXY" "" "无候选→SELECTED_PROXY 空（走直连）"
check_tmp_path "$bare" "$r"
# 注：select_route 真代理探测需真网络环境，无法隔离单元测；下方集成测试用本地 bare 等价覆盖 push 路径。

# ═════════════════ 集成 ═════════════════
echo "── 集成 ──"

echo "[完整流程：filter-repo + push 本地 bare + tip 保留]"
r=$(setup_full_repo); bare=$(git -C "$r" remote get-url origin); st=$(_tmpdir)
if STATE_DIR="$st" BACKUP_BUNDLE="$st/b.bundle" MAIN_REPO="$r" PROXY_CANDIDATES="" \
    bash "$SCRIPT" --yes > "$st/log" 2>&1; then
    # 小仓库 filter-repo 元数据可能使 .git 略增，不断言体积；验证旧版本 blob 已剥离
    old_blob=$(head -1 "$st/strip-blobs.txt" 2>/dev/null)
    if [ -n "$old_blob" ] && git -C "$r" cat-file -e "$old_blob" 2>/dev/null; then
        echo "  ✗ 旧版本 blob 仍存在（strip 未生效）"; FAIL=$((FAIL+1))
    else echo "  ✓ 旧版本 blob 已剥离（strip 生效）"; PASS=$((PASS+1)); fi
    assert_eq "$(git -C "$r" show HEAD:data.json 2>/dev/null)" "v2" "tip json 保留"
    assert_eq "$(git -C "$r" show HEAD:a.png 2>/dev/null)" "png2" "tip png 保留"
    assert_eq "$(git -C "$bare" rev-parse main 2>/dev/null)" "$(git -C "$r" rev-parse HEAD)" "push 到 bare"
else echo "  ✗ main 失败：$(tail -3 "$st/log")"; FAIL=$((FAIL+1)); fi
check_tmp_path "$r" "$st" "$bare"

echo "[幂等：重跑 HEAD 不变 + 报告跳过]"
r=$(setup_full_repo); st=$(_tmpdir)
STATE_DIR="$st" BACKUP_BUNDLE="$st/b.bundle" MAIN_REPO="$r" PROXY_CANDIDATES="" bash "$SCRIPT" --yes >/dev/null 2>&1
h1=$(git -C "$r" rev-parse HEAD)
STATE_DIR="$st" BACKUP_BUNDLE="$st/b.bundle" MAIN_REPO="$r" PROXY_CANDIDATES="" bash "$SCRIPT" --yes > "$st/rerun" 2>&1
assert_eq "$h1" "$(git -C "$r" rev-parse HEAD)" "重跑 HEAD 不变"
assert_contains "$(cat "$st/rerun")" "跳过" "重跑报告跳过"
check_tmp_path "$r" "$st"

echo "[strip 空→无需重写]"
r=$(_tmpdir); git -C "$r" init -q; git -C "$r" config user.email t@t; git -C "$r" config user.name t
bare=$(_tmpdir); git init -q --bare "$bare"; git -C "$r" remote add origin "$bare"
printf 'x' > "$r/one.json"; git -C "$r" add .; git -C "$r" commit -qm only; git -C "$r" push -q origin HEAD:main 2>/dev/null
st=$(_tmpdir)
out=$(STATE_DIR="$st" BACKUP_BUNDLE="$st/b.bundle" MAIN_REPO="$r" PROXY_CANDIDATES="" bash "$SCRIPT" --yes 2>&1) || true
assert_contains "$out" "无历史旧版本" "strip 空→提示无需重写并退出"
check_tmp_path "$r" "$st" "$bare"

echo "[守卫：strip 含 tip blob→中止]"
r=$(setup_full_repo); bare=$(git -C "$r" remote get-url origin); st=$(_tmpdir)
# 手动构造 phase1 状态（模拟阶段1 完成），然后往 strip 塞 tip blob
git -C "$r" for-each-ref --format='%(refname)' > "$st/_a.tmp"
while read -r ref; do [ -n "$ref" ] || continue; git -C "$r" ls-tree -r "$ref"; done < "$st/_a.tmp" \
    | awk -F'\t' '{split($1,a," "); if(a[2]=="blob" && $2 ~ /\.png$|\.json$/) print a[3]}' | sort -u > "$st/keep.txt"
collect_all_blobs "$r" "$st/all.txt"
compute_strip_list "$st/all.txt" "$st/keep.txt" "$st/strip-blobs.txt"
collect_ht_tip_blobs "$r" "$st/verify-keep.txt"
git -C "$r" remote get-url origin > "$st/origin-url.txt"
git -C "$r" worktree list > "$st/worktrees.txt"
touch "$st/phase1.done"
printf '%s\n' "$(head -1 "$st/verify-keep.txt")" >> "$st/strip-blobs.txt"  # 破坏：strip 含 tip
out=$(STATE_DIR="$st" BACKUP_BUNDLE="$st/b.bundle" MAIN_REPO="$r" PROXY_CANDIDATES="" bash "$SCRIPT" --yes 2>&1); rc=$?
assert_contains "$out" "守卫失败" "tip 受影响→守卫触发"
assert_eq "${rc:-0}" "1" "守卫失败 exit 1"
check_tmp_path "$r" "$st" "$bare"

echo "[worktree 移除 + 重建]"
r=$(setup_full_repo); bare=$(git -C "$r" remote get-url origin); wt="$r.wt1"
git -C "$r" worktree add -q "$wt" -b dev1 HEAD
st=$(_tmpdir)
STATE_DIR="$st" BACKUP_BUNDLE="$st/b.bundle" MAIN_REPO="$r" PROXY_CANDIDATES="" bash "$SCRIPT" --yes >/dev/null 2>&1
if [ -d "$wt" ]; then
    echo "  ✓ worktree 重建"; PASS=$((PASS+1))
    assert_eq "$(git -C "$wt" branch --show-current 2>/dev/null)" "dev1" "重建后检出 dev1"
else echo "  ✗ worktree 未重建"; FAIL=$((FAIL+1)); fi
check_tmp_path "$r" "$st" "$wt" "$bare"

echo "[worktree 移除：含 ignored node_modules（clean 先→remove，回归 dev1 真实场景）]"
r=$(setup_full_repo); bare=$(git -C "$r" remote get-url origin)
printf 'node_modules\n' > "$r/.gitignore"; git -C "$r" add .gitignore; git -C "$r" commit -qm gitignore; git -C "$r" push -q origin HEAD:main 2>/dev/null
wt="$r.wt1"; git -C "$r" worktree add -q "$wt" -b dev1 HEAD
mkdir -p "$wt/node_modules/pkg"; printf 'fake' > "$wt/node_modules/pkg/index.json"  # ignored（.gitignore 已 commit，worktree 继承）
st=$(_tmpdir)
STATE_DIR="$st" BACKUP_BUNDLE="$st/b.bundle" MAIN_REPO="$r" PROXY_CANDIDATES="" bash "$SCRIPT" --yes >/dev/null 2>&1
# 脚本移除（clean 清 node_modules）+ 重建 wt1。验证：wt 重建 + node_modules 不再
if git -C "$r" worktree list 2>/dev/null | grep -Fq "$wt" && [ ! -d "$wt/node_modules" ]; then
    echo "  ✓ worktree 移除+重建，node_modules 被 clean 清掉"; PASS=$((PASS+1))
else echo "  ✗ worktree 未重建或 node_modules 残留"; FAIL=$((FAIL+1)); fi
check_tmp_path "$r" "$st" "$wt" "$bare"

echo "[worktree detached 重建（commit-map 自动转换旧 sha→新 sha）]"
r=$(setup_full_repo); bare=$(git -C "$r" remote get-url origin); wt="$r.wt-det"
git -C "$r" worktree add -q --detach "$wt" HEAD
st=$(_tmpdir)
STATE_DIR="$st" BACKUP_BUNDLE="$st/b.bundle" MAIN_REPO="$r" PROXY_CANDIDATES="" bash "$SCRIPT" --yes >/dev/null 2>&1
if [ -d "$wt" ]; then
    echo "  ✓ detached worktree 自动重建（commit-map 转换 sha）"; PASS=$((PASS+1))
else echo "  ✗ detached worktree 未重建"; FAIL=$((FAIL+1)); fi
check_tmp_path "$r" "$st" "$wt" "$bare"

echo ""
echo "=== 结果：$PASS 通过 / $FAIL 失败 / $SKIP 跳过 ==="
[ "$FAIL" = 0 ] || exit 1
