# 部署主页到 https://flagopen.github.io/HumanCOIN/

本站是 Vite + Vue 3 单页站点，源码在本仓库，构建产物在 `dist/`。
部署目标仓库是 [FlagOpen/HumanCOIN](https://github.com/FlagOpen/HumanCOIN)（该仓库的 `main` 是数据集工具链代码，不要覆盖）。

## 分支模型

| 目标仓库分支 | 内容 | 如何更新 |
| --- | --- | --- |
| `main` | 数据集/工具链代码（原有） | 由数据集团队维护 |
| `homepage` | 本主页的源码（本仓库 `main` 的镜像） | `git push flagopen main:homepage` |
| `gh-pages` | 构建产物 `dist/` 的内容，放在仓库根目录 | `npm run deploy:flagopen` |

Pages 从 `gh-pages` 分支的 `/ (root)` 发布，站点地址为
`https://flagopen.github.io/HumanCOIN/`（`http://` 会 301 到 `https://`）。

`gh-pages` 每次部署是一个独立提交（`--no-history`，强制推送），所以分支上只保留最新一次部署，不会堆积 400+ 次提交。

## 前置条件（需要 FlagOpen 组织管理员操作）

目前账号 `Koorye` 对 `FlagOpen/HumanCOIN` 只有读权限（`pull: true, push: false`），推不上去，会报：

```
remote: Permission to FlagOpen/HumanCOIN.git denied to Koorye.
fatal: ... error: 403
```

需要管理员做两件事：

1. **写权限**：仓库 Settings → Collaborators / 组织团队，把账号加成 `Write`。
   只推分支的话 `Write` 就够。
2. **打开 Pages**：仓库 Settings → Pages → Build and deployment
   - Source: **Deploy from a branch**
   - Branch: **`gh-pages`**，目录 **`/ (root)`**
   - 这一步需要仓库 **Admin** 权限，只有 `Write` 是改不了的，需要管理员点一次。

两件事都完成后，本地就能一条命令发布。

## 一次性配置

```bash
# 在 display/ 目录
git remote add flagopen https://github.com/FlagOpen/HumanCOIN.git

# 推源码分支（本仓库 main → 目标仓库 homepage）
git push flagopen main:homepage
```

`flagopen` 这个远程名只是本地约定，换成别的名字也可以，下面的命令要跟着改。

## 日常发布

```bash
npm run deploy:flagopen
```

这条命令等价于：

```bash
npm run build
npx gh-pages -d dist -b gh-pages \
  -r https://github.com/FlagOpen/HumanCOIN.git \
  --dotfiles --no-history \
  -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

- `--dotfiles`：把 `dist/.nojekyll` 一起带上，避免 GitHub 用 Jekyll 处理产物。
- `--no-history`：只推一个提交，不加历史。
- `-r`：直接写仓库 URL，不依赖本地 remote 名字（HTTPS + 本地 credential helper 认证）。

发布流程一般是：本仓库 `main` 上改页面 → `git push origin main` → `npm run deploy:flagopen` → 需要时再 `git push flagopen main:homepage` 同步源码分支。

## 不需要改 `base`

`vite.config.ts` 里是 `base: './'`，产物里全是相对路径（`./assets/index-xxx.js`），
放在 `https://flagopen.github.io/HumanCOIN/` 这个子路径下可以直接用，不需要改成 `/HumanCOIN/`。

例外：以后如果引入 `vue-router` 的 history 模式，就要改成 `base: '/HumanCOIN/'` 并给 router 传 `base: '/HumanCOIN/'`，否则深链接 404。

## 校验

```bash
curl -sI https://flagopen.github.io/HumanCOIN/ | head -1
curl -s  https://flagopen.github.io/HumanCOIN/ | grep -o 'src="[^"]*"'
```

- 第一次启用 Pages 后要等 1–2 分钟构建，期间 404 是正常的。
- 页面 200 但资源 404：多半是 `base` 配错。
- 改了代码但页面没变：Pages 有 CDN 缓存，确认 `gh-pages` 最新提交后强刷（Ctrl/Cmd+Shift+R），或等一两分钟。

## 手动部署（不依赖 gh-pages 包）

```bash
npm run build

tmp=$(mktemp -d)
cp -a dist/. "$tmp"/
git -C "$tmp" init -q -b gh-pages
git -C "$tmp" add -A
git -C "$tmp" -c user.name="$(git config user.name)" \
              -c user.email="$(git config user.email)" \
              commit -qm "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git -C "$tmp" push -f https://github.com/FlagOpen/HumanCOIN.git gh-pages
```

## 没有权限时的预览方案

在拿到写权限之前，可以先推到自己的 fork 看效果（地址会是 `https://koorye.github.io/HumanCOIN/`，
不是最终地址）：

```bash
git push git@github.com:Koorye/HumanCOIN.git main:homepage   # 需先 fork
gh-pages -d dist -b gh-pages -r https://github.com/Koorye/HumanCOIN.git --dotfiles --no-history
```

注意：fork 仓库的 Pages 是独立站点，**不能**代替 `FlagOpen/HumanCOIN` 的 Pages 设置。
