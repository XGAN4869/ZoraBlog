# 后端从零到用户模块 · 学习文档

给现在这个仓库（React 前端 + 空 `backend/` 目录）配一个 Go 后端。
目标：**先跑通一个最小例子，再在它上面长成个人博客。**

## 这个文档假设你什么都不知道

包括：

- 不知道 Go 是什么、怎么装
- 不知道 `go.mod` 是干嘛的
- 不知道「驱动」是什么、装在哪
- 没写过一行 Go

如果上面有一条说中了你，说明你来对地方了。文档里的每条命令都可以直接复制粘贴。

## 阅读顺序

| # | 文件 | 讲什么 | 读完你能 |
|---|------|--------|---------|
| 1 | [01-环境准备.md](01-环境准备.md) | 装 Go、配国内代理、理解「驱动/依赖」 | `go version` 有输出，依赖能下载 |
| 2 | [02-最小Gin服务.md](02-最小Gin服务.md) | 十行代码跑起一个 Web 服务 | 浏览器打开 `localhost:8080/api/health` 看到 JSON |
| 3 | [03-用户模块-内存版.md](03-用户模块-内存版.md) | 注册 / 登录 / JWT 鉴权，先存内存 | 前端能注册登录拿到 token |
| 4 | [04-接入MySQL.md](04-接入MySQL.md) | 装数据库驱动、连 MySQL、建表 | 重启服务数据不丢 |
| 5 | [05-代码分层.md](05-代码分层.md) | 把一坨 `main.go` 拆成能长大的结构 | 有地方放「文章」「评论」模块 |
| 6 | [06-前端对接与Docker联调.md](06-前端对接与Docker联调.md) | React 那边怎么调、Docker 怎么串起来 | 前后端在一个 compose 里跑通 |
| 7 | [07-下一步-博客路线.md](07-下一步-博客路线.md) | 文章模块怎么做、还差什么 | 知道下一步该动哪个文件 |

**按顺序读**。第 3 节是最小可运行的用户模块，第 4、5 节是在它的基础上改造，跳着看会接不上。

## 这份文档和你现有仓库的关系

仓库里已经有一些约定，后面的代码全部按这个来，别改：

```
Go_React_Blog/
├── compose.yaml              # 已有：frontend + backend(full profile)
├── backend/                  # 已有：只有 Dockerfile 和 .dockerignore
│   └── Dockerfile            #   要求 backend 根目录有 package main
└── fronted/
    ├── vite.config.ts        # 已有：/api → http://localhost:8080
    └── nginx.conf            # 已有：/api/ → http://backend:8080
```

由此推出三条硬约束，文档里的代码必须满足：

1. **Go 入口放在 `backend/` 根目录**（`backend/main.go`，`package main`）。
   `backend/Dockerfile` 里 `ARG GO_BUILD_TARGET=.`，默认就构建根目录。
2. **监听 8080 端口**。
3. **所有接口走 `/api/` 前缀**。Vite 和 Nginx 都只转发这个前缀，写别的路径前端调不到。

另外，因为前端和后端要么走 Vite 代理、要么走 Nginx 代理，**浏览器看到的永远是同源**，
所以全程**不需要 CORS 中间件**。网上教程一上来就让你装 `gin-contrib/cors`，在你这套结构里是多余的。

## 版本说明（2026-09 写作时）

文档里所有安装命令都用 `@latest`，让 Go 自己解析当前最新版，`go.mod` 会记录实际装到的版本号——
这样即使版本变了，命令也不会失效。作为参考，写作时的最新版是：

| 依赖 | 版本 | 说明 |
|------|------|------|
| Go | 1.25+ | Gin v1.12 要求 Go ≥ 1.25 |
| `github.com/gin-gonic/gin` | v1.12.0 | Web 框架 |
| `gorm.io/gorm` | v1.31.x | ORM（用 Go 代码操作数据库） |
| `gorm.io/driver/mysql` | 最新 | MySQL 驱动 |
| `github.com/golang-jwt/jwt/v5` | v5.3.1 | 签发/校验登录 token |
| `golang.org/x/crypto` | 最新 | 里面是 bcrypt，用来加密密码 |

## 各章节用到的依赖（装一次就够）

```bash
cd backend

go get github.com/gin-gonic/gin@latest                                          # 第 2 节
go get github.com/golang-jwt/jwt/v5@latest golang.org/x/crypto@latest           # 第 3 节
go get gorm.io/gorm@latest gorm.io/driver/mysql@latest                          # 第 4 节

go mod tidy   # 清理没用的、补齐缺的
```
