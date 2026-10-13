# 注册与登录

支持访客注册、用户名或邮箱登录、会话恢复和退出登录。账户与可撤销会话存入 MySQL，密码使用 bcrypt 哈希。浏览器通过 HttpOnly、SameSite=Lax Cookie 持有登录凭证，不把密码或 JWT 存入 localStorage。

## 本地启动

在 backend 目录配置 `.env`（已被 Git 忽略）：

```dotenv
APP_ENV=development
PORT=8080
DATABASE_DSN=blog:你的数据库密码@tcp(127.0.0.1:3307)/blog?parseTime=true
JWT_SECRET=至少32字节的随机密钥
COOKIE_SECURE=false
```

`go run .` 自动读取当前目录 `.env`，连接数据库并创建 `auth_users`、`auth_sessions` 两张表；需要建表权限。前端在 frontend 目录运行 `npm run dev`，Vite 将 `/api` 代理到 8080。

本次开发已启动独立 MySQL 容器 `zora-blog-mysql`，监听本机 3307。数据库密码和 JWT 密钥随机生成并保存在本地 `.env`，账户数据持久化在 `zora-blog-mysql-data` 卷。后续可用 `docker start zora-blog-mysql` 启动它，也可修改 DATABASE_DSN 接入自己的 MySQL。

## 接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| POST | /api/register | `{ username, email, password, remember }`，注册并登录 |
| POST | /api/login | `{ username, password, remember }`，username 可填邮箱 |
| GET | /api/session | 恢复浏览器登录状态；未登录返回 user=null |
| GET | /api/me | 获取当前用户；未登录、过期或撤销会话返回 401 |
| POST | /api/logout | 撤销数据库会话并清除 Cookie |

用户名限 3–20 位字母、数字或下划线；密码至少 8 个字符，UTF-8 编码不超过 bcrypt 的 72 字节上限。未选择保持登录时为浏览器会话 Cookie，有效期 24 小时；选择后 Cookie 与会话有效期为 30 天。登录/注册接口具有速率限制及跨站请求校验。

## 生产环境

设置 `APP_ENV=production`、`COOKIE_SECURE=true`、`PUBLIC_ORIGIN=https://你的博客域名`、强随机 JWT_SECRET 和真实 DATABASE_DSN；通过 HTTPS 访问。反向代理需保留浏览器 Host（Nginx 使用 `$http_host`）。如需识别代理后的访客 IP，在 `TRUSTED_PROXIES` 配置可信代理 IP/CIDR，逗号分隔，默认不信任转发头。

已有 `/api/users` 系列仍为演示处理函数，本次仅完成账户认证，未将这些示例变成用户管理或管理员授权功能。邮箱仅用于账户标识，尚未加入邮箱验证、找回密码功能。

## 验证

`go test ./...` 检查编译；设置 TEST_DATABASE_DSN 后会执行真实 MySQL 认证集成测试，覆盖密码哈希、重复注册、邮件登录、Cookie 时效、退出撤销、跨站请求、过期 JWT 和速率限制，测试仅清理自己创建的随机账户。
