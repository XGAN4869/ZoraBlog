# Docker 入门与构建记录

> 本文档分两部分：
> **第一部分**讲概念，零基础可读，看不懂 Docker 是什么的先从这里开始；
> **第二部分**是 2026-09-15 这次构建的完整操作记录，含排障过程和原始命令输出。

## 目录

**第一部分 · 零基础入门**

1. [Docker 是解决什么问题的](#1-docker-是解决什么问题的)
2. [三个最核心的词](#2-三个最核心的词)
3. [你的前端 Dockerfile 干了什么](#3-你的前端-dockerfile-干了什么)
4. [nginx 是干嘛的，为什么要它](#4-nginx-是干嘛的为什么要它)
5. [compose 又是什么](#5-compose-又是什么)
6. [我们这次遇到的问题](#6-我们这次遇到的问题)
7. [那个 (healthy) 是什么意思](#7-那个-healthy-是什么意思)
8. [你实际需要记住的](#8-你实际需要记住的)
9. [你现在的状态](#9-你现在的状态)

**第二部分 · 构建记录**

1. [摘要](#1-摘要)
2. [初始状态](#2-初始状态)
3. [第一次构建失败](#3-第一次构建失败)
4. [配置镜像加速](#4-配置镜像加速)
5. [重新构建](#5-重新构建)
6. [启动容器](#6-启动容器)
7. [验证结果](#7-验证结果)
8. [当前状态与后续操作](#8-当前状态与后续操作)
9. [本次改动清单](#9-本次改动清单)

---

# 第一部分 · 零基础入门

## 1. Docker 是解决什么问题的

你写了个博客，在自己电脑上跑得好好的。发给朋友，朋友跑不起来——因为你电脑上有 Node 24，他没有；你装过的某个包，他没装；系统还不一样，你是 Windows，他是 Mac。

Docker 的思路是：**别让对方装环境了，你把"环境 + 你的代码"整个打包成一个盒子，直接给他。** 盒子在哪台机器上打开，里面都是一模一样的环境。

每个盒子里装的是一个迷你 Linux 系统，跟你的 Windows 完全隔离。所以也不用担心搞乱你的电脑。

## 2. 三个最核心的词

| 词 | 是什么 | 类比 |
|---|---|---|
| **镜像 (image)** | 一个打包好的、只读的"快照" | 一张光盘 |
| **容器 (container)** | 用镜像启动起来、正在跑的实例 | 光盘放进机器跑起来 |
| **Dockerfile** | 描述"怎么造出这个镜像"的说明书 | 菜谱 |

一张光盘可以放进很多台机器跑，所以**一个镜像能起无数个容器**。镜像不会变，容器随便折腾——删了重起就恢复原样。

`Dockerfile` 就是那个菜谱。你项目里有俩：一个在前端目录，一个在后端目录。

## 3. 你的前端 Dockerfile 干了什么

打开 `fronted/GanBlog/Dockerfile`，就两段：

```dockerfile
FROM node:24-alpine AS build          # 第一段：准备一个装了 Node 24 的环境
COPY package.json package-lock.json ./
RUN npm ci                            # 装依赖
COPY . .                              # 把你的源码拷进去
RUN npm run build                     # 编译打包

FROM nginx:1.29-alpine AS runtime      # 第二段：准备一个装了 nginx 的环境
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html   # 只把编译产物拷过来
```

这里有个新手最容易懵的点：**为什么有两个 `FROM`？**

这叫**多阶段构建**。因为"编译时需要的"和"运行时需要的"，完全是两回事：

- **编译需要**：Node、npm、几千个依赖包、TypeScript 编译器 → 大概 500MB 以上
- **运行只需要**：一个能把文件发给浏览器的服务器 + 那几个打包好的文件 → 大概 50MB

如果不分两段，最后你得到的镜像会有 500MB，里面塞满运行时根本用不到的东西。

**关键一句：第一段用完就被扔掉了，最终镜像里只有第二段。** 那一行 `COPY --from=build` 是把第一段的产物"传"过来，不是把整个第一段搬过来。

所以最终镜像很小，干净，也没有那些编译工具的漏洞风险。

## 4. nginx 是干嘛的，为什么要它

浏览器**不能直接跑 React 源码**。`npm run build` 干的事，就是把你写的 React/TypeScript 编译成普普通通的 `.html`、`.css`、`.js` 文件——产物在 `dist/` 目录。

这些就是"静态文件"，需要一个程序把它们发给浏览器。nginx 就是干这个的，而且是这个领域最快最常用的。

**那 `nginx.conf` 里的 `/api` 转发又是什么？**

你前端代码里写的请求地址是 `/api/posts` 这样的。这个请求发出去，第一步先到 nginx。nginx 看到是 `/api/` 开头，就替你转给后端容器。

好处是：**浏览器从头到尾只知道一个地址**（`localhost:5173`）。它不需要知道后端在哪台机器、哪个端口，自然也就没有跨域问题。

## 5. compose 又是什么

一个完整项目往往不止一个盒子——前端一个、后端一个，将来可能还有数据库。

一个个手动启动太麻烦。`compose.yaml` 就是把它们写在一个文件里，一条命令全起来。

你项目里的 `compose.yaml` 有个细节：

```yaml
backend:
  profiles:
    - full        # ← 这一行
```

这叫"分组"。意思是**默认不启动后端**，只有加 `--profile full` 才启动。因为你的 `backend/` 目录里现在还没有 Go 代码，根本构建不了。

## 6. 我们这次遇到的问题

Docker 造镜像时，不是从零开始，而是先下载一个"基础镜像"（比如 `node:24-alpine`），再往上加东西。

这些基础镜像存在一个公共仓库里，叫 **Docker Hub**，相当于"存镜像的 GitHub"。

**问题：Docker Hub 在国内访问不了。** 报错里那个 `auth.docker.io` 超时，就是这个原因。

解决办法叫**镜像源**：国内有些服务器，会帮你把 Docker Hub 的内容转发过来。你直接去它那儿拿，速度还快。

类比：国外的图书馆被封锁了，但国内有几家中转站，你从图书馆要什么书，它去帮你取回来。

我做的就是在你的 Docker 全局配置里，填了三个中转站的地址：

```json
"registry-mirrors": [
  "https://docker.m.daocloud.io",
  "https://docker.1panel.live",
  "https://dockerproxy.net"
]
```

写三个是因为一个可能挂掉，Docker 会自动按顺序往下试。这个配置改的是**你电脑的 Docker 设置**，跟你项目代码没关系——所以操作记录里说"仓库文件一行没动"。

配置改完必须**重启 Docker 才生效**，就像改完系统设置要重启一样。

## 7. 那个 `(healthy)` 是什么意思

你的前端 Dockerfile 里有这么一行：

```dockerfile
HEALTHCHECK CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
```

意思是：**每隔 30 秒，Docker 自己进容器里访问一下首页**。能打开就说明服务活着，标记成 `healthy`；打不开就标记 `unhealthy`。

所以之前那个 `Up 35 minutes (healthy)`，已经证明了 nginx 确实在正常发文件。

## 8. 你实际需要记住的

**只有这四条：**

```bash
docker compose up -d      # 启动（-d 表示丢后台跑，不占着你的终端）
docker compose ps         # 看状态
docker compose logs -f    # 看日志（Ctrl+C 退出，不会停服务）
docker compose down       # 停止并清理
```

**最重要的一条忠告：**

> 你改了 `src/` 里的代码，**刷新浏览器不会有任何变化**。

因为容器里跑的是**构建那一刻**打包好的文件，是个死快照。想看到改动，必须重新构建：

```bash
docker compose up -d --build
```

那个 `--build` 就是"重新造一遍镜像"。这是新手 100% 会踩的坑——改了半天代码，以为没生效，其实是没重新构建。

**顺带说一句**：平时开发其实不用 Docker。直接 `npm run dev` 有热更新，改完代码浏览器立刻变。Docker 更适合"打包发给别人"或者"部署到服务器上"这种场景。

## 9. 你现在的状态

- 容器还开着（用 `docker compose ps` 看当前状态，应为 `Up ... (healthy)`）
- 浏览器打开 <http://localhost:5173> 就能看到页面
- 要关掉：`docker compose down`

前端本身已经完整验证过了：能打开、刷新子页面不 404、静态资源缓存一年、后端没起时只有
`/api` 报 502 而页面本身照常。详细结果见 [第二部分第 7 节](#7-验证结果)。

---

# 第二部分 · 构建记录

日期：2026-09-15

## 1. 摘要

本次任务不是"从零创建 Dockerfile"，而是：

1. **核对** —— 仓库里已经有完整的 Docker 配置（`fronted/GanBlog/Dockerfile`、`backend/Dockerfile`、`compose.yaml` 等），逐一检查后**未做任何修改**。
2. **排障** —— `docker compose build` 失败，根因是 Docker Hub 被墙，**不是 Dockerfile 的问题**。
3. **修复网络** —— 配置国内镜像加速，改的是用户级 `~/.docker/daemon.json`，仓库文件一行未动。
4. **验证** —— 前端镜像构建成功，容器启动并通过健康检查，四项 HTTP 行为逐条验证通过。

> HTTP 验证的完整命令与原始输出见 [第 7 节「验证结果」](#7-验证结果)。

## 2. 初始状态

### 已有文件（均为未提交的新文件）

| 文件 | 说明 |
|---|---|
| `fronted/GanBlog/Dockerfile` | 前端双阶段构建 |
| `fronted/GanBlog/nginx.conf` | Nginx 站点配置 |
| `fronted/GanBlog/.dockerignore` | 前端构建上下文忽略 |
| `backend/Dockerfile` | Go 后端占位构建文件 |
| `backend/.dockerignore` | 后端构建上下文忽略 |
| `compose.yaml` | 编排文件 |

`backend/` 目录下**没有任何 `.go` 文件，也没有 `go.mod`**，所以后端镜像当前无法构建，
这是预期内的——它在 compose 里挂在 `full` profile 下，默认不启动。

### 核对结论

现有配置无需改动，检查过的关键点：

- **前端双阶段**：`node:24-alpine` 构建 → `nginx:1.29-alpine` 运行。
- **缓存友好**：先 `COPY package.json package-lock.json` 再 `npm ci`，改源码不会击穿依赖层缓存。
- **SPA 回退**：nginx 用 `try_files $uri $uri/ /index.html`，刷新子路由不会 404。
- **反代解耦**：`/api/` 转发到 `backend:8080`，浏览器只认前端端口，不存在跨域。
- **后端未启动也不崩**：nginx 用 `resolver 127.0.0.11 valid=10s` + 变量式 `proxy_pass`，
  配合 Docker 内置 DNS，后端不在时前端容器照常启动，访问 `/api` 才返回 502。
- **Go 构建规范**：`CGO_ENABLED=0`、`-trimpath`、`-ldflags="-s -w"`，产物静态链接、可剥离调试信息。
- **非 root 运行**：后端容器用 `adduser -D -u 10001 appuser` 后 `USER appuser`。
- **入口可切换**：后端用 `ARG GO_BUILD_TARGET=.`，将来入口移到 `cmd/server` 不用改 Dockerfile。

## 3. 第一次构建失败

```bash
docker compose build frontend
```

报错：

```
#3 ERROR: failed to authorize: failed to fetch oauth token:
  Post "https://auth.docker.io/token": dial tcp 108.160.163.102:443:
  connectex: A connection attempt failed because the connected party
  did not properly respond after a period of time,
  or established connection failed because connected host has failed to respond.
failed to solve: failed to fetch oauth token
```

这是**连接超时**，不是鉴权被拒。Docker Hub 的认证服务在当前网络下不通。

### 定位

确认本地镜像情况：

```bash
docker images
```

```
IMAGE                ID             DISK USAGE   CONTENT SIZE
hello-world:latest   5e2309035332       25.9kB         9.49kB
nginx:alpine         72ba65eb42c1        103MB         29.7MB   U
```

只有 `nginx:alpine` 和 `hello-world`，**没有 node 镜像**，也没配镜像加速。

然后逐个测试各镜像源连通性：

```bash
for h in registry-1.docker.io auth.docker.io \
         docker.m.daocloud.io docker.1panel.live \
         dockerproxy.net registry.cn-hangzhou.aliyuncs.com; do
  printf "%-40s" "$h"
  timeout 8 curl -s -o /dev/null -w "%{http_code}" "https://$h/v2/"
  echo
done
```

结果：

```
registry-1.docker.io                      ← 超时，无输出
auth.docker.io                            ← 超时，无输出
docker.m.daocloud.io                    401   ← 可达
docker.1panel.live                      200   ← 可达
dockerproxy.net                         200   ← 可达
registry.cn-hangzhou.aliyuncs.com       401   ← 可达（但非 Hub 镜像代理）
```

**结论：Docker Hub 官方源全部超时，第三方镜像源可用。**

> 说明：`/v2/` 返回 `401` 是**正常**的，表示镜像源要求鉴权、服务本身是通的；
> 返回 `200` 也是通的。真正的问题是返回空（超时）。

## 4. 配置镜像加速

经与用户确认，采用**修改全局 Docker 配置**的方案（而非在 Dockerfile 里硬编码镜像源前缀），
好处是仓库文件保持干净、可移植，换机器或 CI 上不用改回来。

### 4.1 备份原配置

```bash
cp ~/.docker/daemon.json ~/.docker/daemon.json.bak
```

### 4.2 修改 `~/.docker/daemon.json`

**修改前：**

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false
}
```

**修改后：**（新增 `registry-mirrors`）

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1panel.live",
    "https://dockerproxy.net"
  ]
}
```

配置了三个源，Docker 会按顺序尝试，前一个失败自动降级到下一个。

### 4.3 校验 JSON 合法性

改完先验证，避免 Docker 起不来：

```bash
node -e "JSON.parse(require('fs').readFileSync(process.env.USERPROFILE+'/.docker/daemon.json'));console.log('JSON 合法')"
```

```
JSON 合法
```

### 4.4 确认无运行中容器

```bash
docker ps --format '{{.Names}}\t{{.Image}}'
```

输出为空，说明重启 Docker 不会打断任何服务。

### 4.5 重启 Docker Desktop

```bash
docker desktop restart
```

```
✓ Starting Docker Desktop
```

### 4.6 验证配置已生效

```bash
docker info | grep -A5 "Registry Mirrors"
```

```
Registry Mirrors:
 https://docker.m.daocloud.io/
 https://docker.1panel.live/
 https://dockerproxy.net/
```

三个源都已加载。

## 5. 重新构建

```bash
docker compose build frontend
```

构建成功，关键输出：

```
#14 0.306 > tsc -b && vite build
#14 1.492 vite v8.3.0 building client environment for production...
#14 1.549 ✓ 20 modules transformed.
#14 1.602 dist/index.html                   0.45 kB │ gzip:  0.29 kB
#14 1.602 dist/assets/index-D64VDMd1.css    4.10 kB │ gzip:  1.47 kB
#14 1.602 dist/assets/index-jOB7hSkO.js   222.53 kB │ gzip: 69.28 kB
#14 1.602 ✓ built in 109ms

#15 [runtime 3/3] COPY --from=build /app/dist /usr/share/nginx/html
#16 naming to docker.io/library/ganblog-frontend:local done
 Image ganblog-frontend:local Built
```

TypeScript 编译（`tsc -b`）和 Vite 打包都通过，无报错。

## 6. 启动容器

```bash
docker compose up -d
```

```
Network go_react_blog_default Created
Container go_react_blog-frontend-1 Started
```

检查状态：

```bash
docker compose ps --format '{{.Name}}\t{{.Status}}\t{{.Ports}}'
```

```
go_react_blog-frontend-1    Up 6 seconds (healthy)    0.0.0.0:5173->80/tcp, [::]:5173->80/tcp
```

状态 **`(healthy)`**，说明 Dockerfile 里定义的 `HEALTHCHECK` 已通过：

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
```

即容器内 Nginx 确实在监听 80 端口并成功返回首页。

## 7. 验证结果

对运行中的容器逐条验证 Nginx 配置是否真正生效，**四项全部通过**。

### 7.1 首页可访问

```bash
curl -s -o /dev/null -w "status=%{http_code}  size=%{size_download}\n" http://localhost:5173/
```

```
status=200  size=457
```

前端产物正常返回。此前容器健康检查已间接证明这一点，这里是直接确认。

### 7.2 SPA 深链回退

React 单页应用只有 `index.html` 一个真实页面，路由是前端用 JS 实现的。
所以在浏览器地址栏直接输入 `/posts/123` 并回车时，服务器上**并不存在这个文件**。
如果没有特殊配置就会返回 404。

配置里这一行就是解决它的：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

含义：先找有没有这个文件，没有再找同名目录，**都没有就返回 `index.html`**。
页面拿到 `index.html` 后，前端路由自己解析地址栏，渲染出对应内容。

验证：

```bash
curl -s -o /dev/null -w "status=%{http_code}\n" http://localhost:5173/some/deep/route
curl -s -o /dev/null -w "status=%{http_code}\n" http://localhost:5173/posts/123
```

```
status=200
status=200
```

两个都不存在的路径都返回 200，回退生效。随手刷新任意子页面不会再 404。

### 7.3 静态资源缓存头

```bash
ASSET=$(curl -s http://localhost:5173/ | grep -oE '/assets/[^"]+\.js' | head -1)
curl -s -D- -o /dev/null "http://localhost:5173$ASSET" | grep -iE "^(HTTP|cache-control|expires)"
```

```
资源: /assets/index-jOB7hSkO.js
HTTP/1.1 200 OK
Expires: Wed, 15 Sep 2027 09:19:53 GMT
Cache-Control: max-age=31536000
Cache-Control: public, immutable
```

`max-age=31536000` 是一年，`immutable` 告诉浏览器"这文件永不改变，别再来问了"。
配合 Vite 在文件名里嵌入的内容哈希（`index-jOB7hSkO.js` 那一串），
内容一变文件名就变，所以可以放心让浏览器缓存一整年，老访客再打开是秒开。

### 7.4 后端未启动时的 `/api`

后端此时并未启动，按配置应当返回 **502**（网关错误），而不是让前端容器崩掉或卡住：

```bash
curl -s -o /dev/null -w "status=%{http_code}\n" http://localhost:5173/api/posts
```

```
status=502
```

两个设计点得到验证：

- **前端容器照常运行**。如果没做 `resolver 127.0.0.11` + 变量式 `proxy_pass` 的处理，
  Nginx 会在启动时解析不了 `backend` 这个主机名，**直接启动失败**。
  现在的写法让它把解析推迟到真正有请求时，后端不在也不影响前端。
- **错误被隔离在 `/api` 路径下**。前端页面本身正常，只有调到接口时才报错，
  排查时能立刻定位到"是后端没起"，而不是"网站挂了"。

后端代码补齐并启动后，这个请求会正常转发到 `backend:8080`，返回 200。

## 8. 当前状态与后续操作

**容器仍在运行中**，占用 `localhost:5173`。

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f frontend

# 停止并移除容器
docker compose down
```

### 后端

后端目前**无法构建**，因为 `backend/` 下没有 `go.mod` 和 `.go` 文件。
补齐代码后（入口在 `backend` 根目录）：

```bash
docker compose --profile full up --build -d
```

若入口在 `backend/cmd/server`：

```bash
docker compose build --build-arg GO_BUILD_TARGET=./cmd/server backend
```

### 如需回滚镜像源配置

```bash
cp ~/.docker/daemon.json.bak ~/.docker/daemon.json
docker desktop restart
```

## 9. 本次改动清单

| 范围 | 文件 | 改动 |
|---|---|---|
| 仓库 | —— | **无任何改动**（本文件除外） |
| 系统 | `~/.docker/daemon.json` | 新增 `registry-mirrors` 三项 |
| 系统 | `~/.docker/daemon.json.bak` | 新建（备份） |
| Docker | `ganblog-frontend:local` | 新建镜像 |
| Docker | `go_react_blog-frontend-1` | 运行中容器 |
