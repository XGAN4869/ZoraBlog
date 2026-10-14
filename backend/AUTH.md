# GitHub OAuth 登录

本站通过 GitHub OAuth 的授权码流程获取用户身份，再建立自己的随机 Session。浏览器不保存 GitHub access token，本站不再签发 JWT，也不接收用户名和密码。

## 接入 GitHub

1. 在 [GitHub 创建 OAuth App](https://github.com/settings/applications/new)。
2. 本地开发填写 Homepage URL：`http://localhost:5173`。
3. Authorization callback URL 填写：`http://localhost:5173/api/auth/github/callback`。
4. 把生成的 Client ID、Client Secret 写入 `backend/.env`；不要写进前端代码或提交 Git。

```dotenv
APP_ENV=development
PORT=8080
DATABASE_DSN=blog:你的数据库密码@tcp(127.0.0.1:3307)/blog?parseTime=true
COOKIE_SECURE=false
PUBLIC_ORIGIN=http://localhost:5173
GITHUB_CLIENT_ID=你的ClientID
GITHUB_CLIENT_SECRET=你的ClientSecret
GITHUB_CALLBACK_URL=http://localhost:5173/api/auth/github/callback
```

后端运行 `go run .`，前端运行 `npm run dev`。Vite 将 `/api` 转发到 8080。

浏览器访问的域名、端口必须与上述来源和回调配置一致。若使用 5174，请同时修改 GitHub OAuth App、PUBLIC_ORIGIN 和 GITHUB_CALLBACK_URL；不要混用 localhost 和 127.0.0.1。生产与本地开发建议分别创建 OAuth App。

未配置两个 GitHub 凭据时，后端可以启动；点击“使用 GitHub 登录”会回到原页面并提示登录尚未开放。只有一个凭据被配置时，后端启动会报配置错误。JWT_SECRET 已不再使用。

## 路由与流程

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | /api/auth/github | 发起 GitHub 登录，接受 remember=true 和本站 redirect 路径 |
| GET | /api/auth/github/callback | GitHub 回调，校验 state 并交换授权码 |
| GET | /api/session | 恢复当前用户，未登录或会话无效时 user=null |
| POST | /api/logout | 撤销本站会话，清除 Cookie |

原 POST /api/login、POST /api/register 已删除。前端不再提供独立登录页；/login 和 /register 兼容旧地址并跳转到首页。页头和移动菜单中的“使用 GitHub 登录”直接发起授权，完成后返回原页面。

1. 发起登录时生成随机 state 和 PKCE verifier，将请求记录存入 MySQL；state 还放入 10 分钟有效的 HttpOnly Cookie，绑定发起登录的浏览器。
2. 跳转到 GitHub，使用 S256 PKCE 和 read:user 权限，不申请仓库或私有邮箱权限。授权 URL 带有 `prompt=select_account`，每次发起登录都显示 GitHub 账号选择，方便切换账号；已有 GitHub 登录状态仍可能免去密码输入。退出本站不会退出 GitHub，因此重新选择账号需退出本站后再次点击登录。
3. 回调首先校验浏览器 Cookie 与 state，然后用数据库行锁一次性消费登录请求，阻止过期和重复回调。
4. 后端交换授权码并调用 GitHub /user，以不可变的 GitHub 用户 ID 创建或更新本站账户。用户名和公开邮箱只作为显示信息；邮箱可能为空。不按邮箱或用户名自动关联旧账户。
5. 生成 256 位随机 Session ID，将 SHA-256 哈希存入 MySQL，原始凭证写入 HttpOnly、SameSite=Lax Cookie。
6. /api/session 通过凭证哈希查找未过期会话及用户；退出后删除会话，原始凭证立即失效。

界面默认使用 24 小时有效的数据库会话，Cookie 不设置持久化期限。后端接口仍支持 remember=true 的 30 天会话，但界面没有“保持登录”表单。浏览器可能恢复会话 Cookie，所以最终有效期以数据库为准。

取消授权会一次性消费登录请求并回到原页面；授权失败且能确认登录请求时也返回原页面。state 无效或来源无法确认时返回首页。错误通过 auth_error 参数交给前端显示 toast，前端随后删除该参数；不会自动再次发起授权。

GitHub access token 只用于这次后端身份查询，不写入数据库、Cookie 或浏览器存储。本站退出仅退出本站，不会退出 GitHub 或撤销用户对 OAuth App 的授权。

## 数据库兼容

数据库访问使用 GORM 和 MySQL 驱动。`repository/models.go` 显式映射 `oauth_users`、`oauth_sessions`、`oauth_login_requests`；程序通过 GORM Migrator 创建缺失的表，需要建表权限。已有表沿用原结构，不执行自动修改表结构的 AutoMigrate。

用户写入使用 GORM 的 OnConflict，按 GitHub ID 更新用户名和公开邮箱；会话读写使用模型查询。OAuth 请求在 GORM Transaction 中通过 FOR UPDATE 行锁一次性消费。模型不使用软删除，退出和消费请求会实际删除记录；SQL 日志关闭，避免输出会话哈希及 PKCE verifier。

原 `auth_users`、`auth_sessions` 保留，不删除旧账户数据；新登录不读取它们，旧 JWT 不再被接受。已有密码账户不会自动与 GitHub 账户合并。

你在原 JWT 文件中的学习注释保存在 `notes/examples/jwt.go.txt`，不参与 Go 编译。`auth-schema.sql` 保留原数据库导出结构，并附有当前 OAuth 表的建表语句。

## 部署

生产环境设置 APP_ENV=production、COOKIE_SECURE=true、HTTPS PUBLIC_ORIGIN 和同来源 GITHUB_CALLBACK_URL。反向代理保留浏览器 Host，按需配置 TRUSTED_PROXIES。

多个后端实例共享同一 MySQL 和 GitHub OAuth 配置。会话及 OAuth 登录请求都保存在数据库，不要求浏览器维持长连接，也不要求请求固定到同一实例。登录限流目前按实例计算。

回调访问日志只记录路径，不包含授权码和 state。修改类请求仍做来源校验。GitHub 凭据缺失、GitHub 网络故障或数据库故障时不会把请求当作已登录。

## 数据结构与职责

`dto` 包只定义接口传输结构，不是业务层：`Response` 定义统一返回格式，`SessionResponse` 和 `UserResponse` 定义本站会话接口数据，`GitHubTokenResponse` 和 `GitHubUserResponse` 定义从 GitHub 读取的响应。

`handlers` 将数据库用户转换为响应 DTO；`service` 将 GitHub 响应 DTO 转换为 repository 所需的用户资料。`repository.User` 和 `repository.GitHubUser` 不再承担 JSON 字段定义；`response` 包保留 HTTP 返回辅助函数，使用 `dto.Response` 输出 JSON。

当前登录参数来自 URL 查询串，没有用户名、密码 JSON 请求，因此没有定义 `LoginRequest` 或返回令牌的 `LoginResponse`。本站会话凭证仍通过 HttpOnly Cookie 设置。

## 验证

`go test ./...` 验证 state、PKCE、回调重复使用、凭证过期、Session 撤销、安全返回地址和失败处理。

运行真实 MySQL 集成测试：

```powershell
$env:RUN_MYSQL_TESTS="1"
go test ./...
```

集成测试优先使用 TEST_DATABASE_DSN，否则读取 backend/.env。使用真实 MySQL，模拟 GitHub HTTP 响应，覆盖完整路由、Cookie、账户更新、账户隔离、会话替换、数据库重连和退出；只清理自己创建的临时用户及登录请求。建表及正常会话写入仍会清理已过期记录。

前端：`npm run build`、`npx playwright test tests/auth.spec.ts tests/blog.spec.ts`。浏览器测试中的 GitHub 跳转为模拟，真实 GitHub 授权需配置自己的 OAuth App 后验证。

## 代码参考

实现基于本项目现有 Gin、数据库和前端代码编写，没有复制第三方登录项目。

- [李文周：Gin 框架路由拆分与注册](https://liwenzhou.com/posts/go/gin-routes-registry/)：路由组织方式。
- [GitHub：Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)：授权码流程、state、PKCE、回调和用户 API。
- [OWASP：Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)：随机凭证、服务端哈希保存、Cookie 属性和会话撤销。
