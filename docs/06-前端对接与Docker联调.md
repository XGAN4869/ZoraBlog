# 06 · 前端对接与 Docker 联调

后端接口好了，这一节讲两件事：**React 那边怎么调**，**Docker 里怎么串起来**。

## 第一部分 · 前端对接

### 1. 为什么不需要处理跨域（CORS）

网上 Go + Gin 教程几乎都会让你装 `gin-contrib/cors`。**在你这个项目里不需要**，原因看这张图：

```
开发环境：
  浏览器 → localhost:5173/api/users/login
         → Vite 开发服务器（把 /api 转发到 localhost:8080）
         → Gin

生产环境：
  浏览器 → localhost:5173/api/users/login
         → Nginx 容器（把 /api/ 转发到 backend:8080）
         → Gin
```

**浏览器看到的始终是 5173 这一个源**，转发是服务器做的。跨域只在「浏览器直接请求另一个源」时才发生，
所以这两种情况都不触发。配置已经在仓库里写好了（`vite.config.ts` 和 `nginx.conf`），不用动。

> 什么时候才需要 CORS？比如你以后把前端部署到 `blog.com`、API 放在 `api.blog.com`，
> 且不用 Nginx 转发。那时候再装。**现在装了反而多一层不必要的配置。**

### 2. 三条约定

后端已经定好了格式，前端照着写就行：

| 约定 | 内容 |
|------|------|
| 路径前缀 | 一律 `/api`，**不要**写 `http://localhost:8080` |
| 成功响应 | `{"data": ...}` |
| 失败响应 | `{"error": "人话描述"}`，可直接显示给用户 |
| 登录态 | 请求头 `Authorization: Bearer <token>` |

**为什么路径不写完整地址**：写死了 `http://localhost:8080`，部署到服务器就必须改代码。
写 `/api` 的话，开发和生产都自动走代理，**一份代码两处通用**。

### 3. 建 API 层

不要在组件里直接写 `fetch`。集中到两个文件，以后改起来只改一处。

新建 `fronted/GanBlog/src/api/client.ts`：

```ts
// 所有请求都走 /api 前缀，由 Vite（开发）或 Nginx（生产）转发到后端。
// 所以浏览器看到的是同源地址，不需要处理跨域。
const API_BASE = '/api'

const TOKEN_KEY = 'ganblog_token'

// ---------- token 存取 ----------

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// ---------- 错误类型 ----------

/** 带 HTTP 状态码的错误，方便调用方单独处理 401 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ---------- 底层请求 ----------

/**
 * 发一个 JSON 请求，成功返回 data 字段的内容，失败抛 ApiError。
 * 业务代码只关心「拿到数据」或「失败了，错误信息是什么」。
 */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // 有 token 就自动带上，业务代码不用每次手动拼
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  // 后端失败时返回 {"error": "..."}。用 catch 兜底：
  // 万一后端挂掉返回的是 HTML 错误页而不是 JSON，res.json() 会抛异常。
  const body = (await res.json().catch(() => ({}))) as { data?: T; error?: string }

  if (!res.ok) {
    throw new ApiError(body.error ?? `请求失败（HTTP ${res.status}）`, res.status)
  }

  return body.data as T
}
```

新建 `fronted/GanBlog/src/api/user.ts`：

```ts
import { request } from './client'

// 和后端 model.User 的 JSON 字段一一对应。
// 后端给 Password 打了 json:"-"，所以这里根本没有 password 字段——这是对的。
export interface User {
  id: number
  username: string
  nickname: string
  createdAt: string
  updatedAt: string
}

export interface LoginResult {
  token: string
  user: User
}

export function register(username: string, password: string, nickname = ''): Promise<User> {
  return request<User>('/users/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, nickname }),
  })
}

export function login(username: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/users/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function getMe(): Promise<User> {
  return request<User>('/users/me')
}
```

> 注意 `request<User>` 里的 `<User>`：这是 TypeScript 泛型，告诉编辑器「这个请求返回的 `data` 是 User」。
> 之后写 `user.nickname` 才有自动补全，拼错了也会当场标红。

### 4. 组件里怎么用

`App.tsx` 现在是 Vite 的默认模板，可以先把内容清掉，换成这个最小登录表单：

```tsx
import { useState } from 'react'
import { ApiError, setToken } from './api/client'
import { login } from './api/user'
import './App.css'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault() // 阻止表单默认的整页刷新
    setMessage('')

    try {
      const { token, user } = await login(username, password)
      setToken(token)
      setMessage(`登录成功，欢迎 ${user.nickname || user.username}`)
    } catch (err) {
      // 后端返回的 error 字段本来就是给用户看的中文，直接显示
      setMessage(err instanceof ApiError ? err.message : '网络异常，请稍后重试')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="用户名"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="密码"
      />
      <button type="submit">登录</button>
      {message && <p>{message}</p>}
    </form>
  )
}

export default App
```

**这个表单能跑通，说明前后端联调完成。** 故意输错密码应该看到「用户名或密码错误」——
那句话是后端返回的，不是前端写死的，正好验证了整条链路。

### 5. token 存哪里（一个要权衡的地方）

上面用的是 `localStorage`。**简单，但有代价**：

- ✅ 简单直接，刷新页面不掉登录
- ❌ **能被 JavaScript 读到**。如果站点有 XSS 漏洞（比如文章内容渲染了用户提交的 HTML
  又没做转义），攻击者一行 `localStorage.getItem('ganblog_token')` 就能偷走 token

更安全的做法是后端把 token 写进 `HttpOnly` Cookie——JS 读不到，XSS 偷不走。
代价是要处理 CSRF 防护，复杂度明显上升。

**现阶段用 `localStorage` 完全合理**，学习项目先跑通。但要记住两件事：

1. 以后做「文章正文渲染」时，**必须对用户提交的内容做转义**（用 `react-markdown` 这类库默认就是安全的，
   别用 `dangerouslySetInnerHTML` 直接塞）
2. 上线前回来重新评估这个选择

---

## 第二部分 · Docker 联调

### 6. 为什么 `backend/Dockerfile` 不用改

看一眼它现在的关键两行：

```dockerfile
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server "${GO_BUILD_TARGET}"
```

```dockerfile
ARG GO_BUILD_TARGET=.
```

- `GO_BUILD_TARGET=.` 会构建**根目录的 `package main`**——我们的 `main.go` 就在那里，**对上了**
- `CGO_ENABLED=0` 表示编译出**不依赖 C 库的静态二进制**，这样运行镜像才能用极小的 `alpine`
- 关键问题：**MySQL 驱动兼容这个设置吗？** —— **兼容**。`go-sql-driver/mysql` 是纯 Go 写的，
  不需要 CGO。（对比之下，SQLite 最常用的那个驱动 `mattn/go-sqlite3` 需要 CGO，
  就得把这里改成 `CGO_ENABLED=1` 并换基础镜像——这也是第 0 节选 MySQL 的一个隐性好处。）

所以 **Dockerfile 一个字都不用动**。

### 7. 改 compose.yaml

现在 `backend` 服务缺三样东西：数据库地址、密钥、以及「等 MySQL 起来再启动」的依赖关系。

把 `backend` 服务改成（`environment` 和 `depends_on` 是新增的）：

```yaml
  backend:
    profiles:
      - full
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: ganblog-backend:local
    environment:
      # 注意主机名是 mysql（Compose 的服务名），不是 127.0.0.1。
      # 容器之间用服务名互相访问，这是 Compose 内置的 DNS。
      # 整个值用引号包住，否则 YAML 会把 & 当成特殊符号。
      DB_DSN: "ganblog:ganblogpass@tcp(mysql:3306)/ganblog?charset=utf8mb4&parseTime=True&loc=Local"
      # 上线前必须换成随机长字符串，否则别人能自己签发 token 冒充任意用户
      JWT_SECRET: "change-me-in-production"
    depends_on:
      mysql:
        # 等 MySQL 健康检查通过再启动，否则后端一起来就连不上数据库然后退出
        condition: service_healthy
    expose:
      - "8080"
    restart: unless-stopped
```

**关键点：容器里连数据库要用服务名 `mysql`，不是 `127.0.0.1`。**

因为每个容器有自己的网络命名空间，容器里的 `127.0.0.1` 指的是**它自己**，
不是宿主机。而本地直接 `go run .` 时用的 `127.0.0.1` 是对的——
因为那时 Go 进程跑在宿主机上，MySQL 通过 `ports: 3306:3306` 映射到了宿主机的 3306。

**这就是为什么 DSN 要做成环境变量**：同一个二进制，两套地址，靠环境变量切换，代码不用改。

### 8. 跑起来

```powershell
cd C:\Project\每日练习\aiAssistCoding\Go_React_Blog

docker compose --profile full up --build -d
```

查看状态：

```powershell
docker compose ps
```

三个服务都应该是 `Up`，`mysql` 还应该显示 `(healthy)`。

看后端日志确认连上了：

```powershell
docker compose logs backend
```

应该能看到 `数据库连接成功，表结构已同步` 和 `服务已启动：http://localhost:8080`。

然后浏览器打开 <http://localhost:5173>，用之前注册的账号登录。

**注意端口**：对外只有 `5173`（Nginx）。后端 `8080` 用的是 `expose` 而不是 `ports`，
意思是**只在 Compose 内部网络可见，宿主机访问不到**。这是有意的——对外只需要开一个口子，
后端的攻击面越小越好。所以 <http://localhost:8080> 打不开是**正常的**，不是坏了。

### 9. 数据在容器重启后还在吗

**在。** 数据存在 `mysql-data` 这个命名卷里，由 Docker 管理，容器删了卷还在。

```powershell
docker compose down          # 停并删容器，数据保留 ✅
docker compose down -v       # 连数据卷一起删，数据清空 ⚠️
```

`-v` 那条要谨慎，**这是唯一会清空开发数据的操作**。

### 10. 排查表

| 现象 | 原因 | 怎么办 |
|------|------|--------|
| 前端页面能开，登录报 502 | 后端容器没起来或崩了 | `docker compose logs backend` |
| `database connection refused` | MySQL 没 healthy 就启动了后端 | 确认 `depends_on` 写了 `service_healthy` |
| 改了后端代码但没生效 | 镜像没重新构建 | 加 `--build`：`docker compose --profile full up --build -d` |
| `pull access denied` / 拉取超时 | Docker Hub 被墙 | 回 `DOCKER_SETUP.md` 检查镜像加速配置 |
| 中文存进去变问号 | DSN 漏了 `charset=utf8mb4` | 检查 compose 里的 `DB_DSN` |
| 本地能跑，容器里报 `Unknown database` | 容器连的是新初始化的空库 | 正常，`AutoMigrate` 会自动建表 |
| `go mod download` 在构建时超时 | 容器内没有国内代理 | 在 `backend/Dockerfile` 的 `go mod download` 前加 `RUN go env -w GOPROXY=https://goproxy.cn,direct` |

最后一条值得展开：**Docker 构建是在容器里执行的，容器里没有你宿主机的 `GOPROXY` 设置。**
如果构建时卡在下载依赖，就在 Dockerfile 里显式设一次：

```dockerfile
COPY go.mod go.sum* ./
RUN go env -w GOPROXY=https://goproxy.cn,direct && go mod download
```

---

**下一节** → [07-下一步-博客路线.md](07-下一步-博客路线.md)
