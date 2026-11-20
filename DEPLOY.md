# 部署主页到 https://flagopen.github.io/HumanCOIN/

**状态：已上线。** 站点由 [FlagOpen/HumanCOIN](https://github.com/FlagOpen/HumanCOIN) 的 `gh-pages` 分支发布。

本站是 Vite + Vue 3 单页站点，源码在本仓库（HumanCOIN-dev），构建产物在 `dist/`。
目标仓库的 `main` 是数据集/工具链代码，**不要覆盖**。

## 分支模型

| 目标仓库分支 | 内容 | 如何更新 |
| --- | --- | --- |
| `main` | 数据集/工具链代码（原有，不动） | 数据集团队 |
| `homepage` | 本主页的源码（本仓库 `main` 的镜像） | `git push flagopen main:homepage` |
| `gh-pages` | `dist/` 的内容，放仓库根目录，每次部署一个独立提交 | `npm run deploy:flagopen` |

Pages 的发布源已设为 `gh-pages` / `/ (root)`（`build_type: legacy`，无需 Actions）。
地址是 `https://flagopen.github.io/HumanCOIN/`，`http://` 会 301 跳到 `https://`。

## 日常发布

```bash
npm run deploy:flagopen     # = npm run build + scripts/deploy_pages.sh
```

改完页面后通常是：

```bash
git push origin main                      # 同步到 HumanCOIN-dev
npm run deploy:flagopen                   # 发布站点
git push flagopen main:homepage           # 同步源码分支
```

## 为什么不用 `gh-pages` 这个 npm 包

`FlagOpen/HumanCOIN` 根目录的 `.gitignore` 里有：

```gitignore
# Datasets — generated data is large and machine-specific
data/
```

`gh-pages` 包会把仓库 clone 到缓存目录并复用工作区，`git add -A` **会遵守这份 `.gitignore`**，
于是 `dist/data/` 被静默跳过：首页正常，但 viewer 要的 `data/objects.json`、`data/reels/*.json` 全部 404。
更麻烦的是它还会把这份 `.gitignore` 一起提交进 `gh-pages`，之后每次部署都会继续漏。

所以 [scripts/deploy_pages.sh](scripts/deploy_pages.sh) 改成：复制 `dist/` 到临时空目录 → `git init` → `git add -A -f` → 单次提交 → 强制推送。
不继承任何 `.gitignore`，结果可预期。`npm run deploy`（旧的、推到 HumanCOIN-dev 的那条）仍然用 `gh-pages` 包，没动。

## 校验

```bash
curl -sI https://flagopen.github.io/HumanCOIN/ | head -1
curl -s  https://flagopen.github.io/HumanCOIN/data/objects.json | head -c 80
```

- 站点要有 `.nojekyll`（`public/.nojekyll` 会带进 `dist`），避免 Jekyll 处理产物。
- 推送后 Pages 要重新构建，约 20–40 秒；期间可能是旧内容。
- 页面 200 但某个子目录 404：先怀疑 `.gitignore` 把目录吃掉了（`git -C <tmp> ls-files | grep data/` 看不到就是这个问题）。
- 改了页面没生效：Pages 有 CDN 缓存，确认 `gh-pages` 最新提交后强刷或等一两分钟。

## 关于 `base`

`vite.config.ts` 里是 `base: './'`，产物全是相对路径（`./assets/index-xxx.js`），
所以放在 `/HumanCOIN/` 这个子路径下可以直接用，不需要改成 `/HumanCOIN/`。

例外：以后如果引入 `vue-router` 的 history 模式，就要改成 `base: '/HumanCOIN/'`，并给 router 传 `base: '/HumanCOIN/'`，否则深链接 404。

## 权限备忘

- 推分支需要目标仓库的 `Write`。
- 改 Pages 的发布源需要 **Admin**，一般由组织管理员点一次；之后每次推送自动发布。
- 只给 fork（如 `koorye.github.io/HumanCOIN`）开 Pages 不能替代 org 仓库的设置。
