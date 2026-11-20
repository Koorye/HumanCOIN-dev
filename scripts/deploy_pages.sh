#!/usr/bin/env bash
# 把 dist/ 作为单次提交强制推送到目标仓库的 gh-pages 分支。
#
# 为什么不用 gh-pages 包：目标仓库（FlagOpen/HumanCOIN）根目录的 .gitignore 里有 `data/`，
# gh-pages 会复用克隆下来的工作区，`git add -A` 会静默跳过被忽略的 data/，
# 站点里的 /HumanCOIN/data/objects.json 就会 404。这里从空目录重新建仓推送，
# 不带任何继承的 .gitignore，结果可预期。
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/FlagOpen/HumanCOIN.git}"
BRANCH="${BRANCH:-gh-pages}"
DIST="${DIST:-dist}"

cd "$(dirname "$0")/.."

if [ ! -f "$DIST/index.html" ]; then
  echo "error: $DIST/index.html 不存在，先跑 npm run build" >&2
  exit 1
fi

tmp="$(mktemp -d "$PWD/node_modules/.cache/ghp-deploy.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT

cp -a "$DIST"/. "$tmp"/
rm -f "$tmp/.gitignore"

git -C "$tmp" init -q -b "$BRANCH"
git -C "$tmp" -c user.name="$(git config user.name)" \
              -c user.email="$(git config user.email)" \
              add -A -f
git -C "$tmp" -c user.name="$(git config user.name)" \
              -c user.email="$(git config user.email)" \
              commit -q -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "deploying $(git -C "$tmp" ls-files | wc -l) files, $(du -sh "$tmp" | cut -f1) -> $REPO_URL $BRANCH"
git -C "$tmp" push -f "$REPO_URL" "refs/heads/$BRANCH:refs/heads/$BRANCH"
