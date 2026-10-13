先给结论：这些配置“技术上能运行”，但当前登录方案不能作为真正的生产鉴权，而且 `k8s-login-config.yaml` 里的 CI 示例存在覆盖 `.env.production` 的风险。

### 一、这些文件在做什么

Vite 会按 mode 合并环境文件：

```text
公共配置：.env
开发：    .env + .env.development
测试：    .env + .env.test
本机：    .env + .env.localhost
生产：    .env + .env.production
```

后加载的同名变量覆盖前面的值。

当前实际结果：

| 命令 | Mock | 后端地址 | 登录配置 |
| --- | --- | --- | --- |
| `npm run dev` | 开启 | `/sy` 等相对前缀 | 有 |
| `npm run test` | 开启 | `/sy` 等相对前缀 | 有 |
| `npm run localhost` | 开启 | 绝对地址 | 缺少 |
| `npm run build` | 关闭 | `/sy` 等相对前缀 | 有 |

[.env](/C:/Project/stella-system/SPACE-BASED-VUE/.env) 放公共配置；[.env.production](/C:/Project/stella-system/SPACE-BASED-VUE/.env.production) 只覆盖生产差异，所以它没重复写五个服务前缀。

### 二、构建和 CI 的执行流程

CI 是 Continuous Integration，中文叫持续集成。它通常是 Jenkins、GitLab CI、GitHub Actions 等自动化服务器。

标准流程：

```text
提交代码
-> CI 拉取代码
-> npm ci
-> 注入构建配置
-> npm run build
-> 生成 dist
-> 构建 Nginx Docker 镜像
-> 推送镜像仓库
-> 部署 Kubernetes
```

Vite 在 `npm run build` 时，将：

```js
import.meta.env.VITE_LOGIN_USERNAME
```

直接替换成字符串并写入浏览器 JS。

所以顺序必须是：

```text
先提供 VITE_* 变量
-> 再 npm run build
-> 再部署 dist
```

容器启动后再注入环境变量已经晚了。

### 三、细节问题检查

#### 【必须改】

1. 当前登录不是安全鉴权。

[user.js](/C:/Project/stella-system/SPACE-BASED-VUE/src/store/modules/user.js:14) 在浏览器里比较用户名和密码 MD5。用户可以查看打包后的 JS、修改 `sessionStorage`，或直接改运行状态绕过登录。

2. `VITE_*` 不是秘密。

即使改用 Kubernetes Secret，变量最终仍会被写入浏览器 JS。Secret 只能保护 Kubernetes 中的存储过程，无法阻止浏览器用户读取构建产物。

3. ConfigMap 不是密码存储。

[k8s-login-config.yaml](/C:/Project/stella-system/SPACE-BASED-VUE/k8s-login-config.yaml:16) 使用的是 ConfigMap，它本来就用于非敏感配置，不加密。

4. CI 示例会覆盖完整 `.env.production`。

这条命令使用了 `>`：

```bash
kubectl get cm ... > .env.production
```

它会把原来的 `VITE_USE_MOCK=false` 覆盖掉。之后构建会从 `.env` 继承 `VITE_USE_MOCK=true`，生产配置可能重新开启 Mock。

#### 【建议改】

- `.env.test` 当前继承 `VITE_USE_MOCK=true`。如果测试环境要连接真后端，应显式关闭。
- `.env.localhost` 同时使用绝对地址和 `VITE_USE_MOCK=true`，两种请求策略互相冲突。
- `.env.localhost` 没有登录配置，当前登录代码会提示配置缺失。
- 仓库中没有真正的 CI、Dockerfile、Nginx 或 Ingress 文件；现有 YAML 只是配置示例，不会自动执行。
- 生产账号和密码哈希不应提交在仓库里，即使只是 MD5。

#### 【可以不改】

五个服务前缀放在公共 `.env` 是合理的：

```dotenv
VITE_BASE_URL_SY=/sy
VITE_BASE_URL_RS=/rs
VITE_BASE_URL_TA=/ta
VITE_BASE_URL_IM=/ap
VITE_BASE_URL_FS=/fs
```

生产环境由 Nginx/Ingress 按前缀分流即可。

### 四、推荐修改思路

正式生产应该使用后端登录：

```text
输入用户名密码
-> POST /auth/login
-> 后端校验数据库
-> 返回 Token 或设置 HttpOnly Cookie
-> 后续接口由后端鉴权
```

前端环境文件只保存公开配置：

- API 相对前缀
- 是否启用 Mock
- 页面标题
- 功能开关

不保存账号、密码、密码哈希、Token 和私钥。

### 五、推荐配置

**请你手动复制下面代码到对应位置。**

推荐 `.env.production`：

```dotenv
VITE_USE_MOCK=false

VITE_BASE_URL_SY=/sy
VITE_BASE_URL_RS=/rs
VITE_BASE_URL_TA=/ta
VITE_BASE_URL_IM=/ap
VITE_BASE_URL_FS=/fs
```

推荐 `.env.test`：

```dotenv
VITE_USE_MOCK=false

VITE_BASE_URL_SY=/sy
VITE_BASE_URL_RS=/rs
VITE_BASE_URL_TA=/ta
VITE_BASE_URL_IM=/ap
VITE_BASE_URL_FS=/fs
```

如果暂时必须保留前端演示登录，CI 不要覆盖 `.env.production`，可以临时生成 `.env.production.local`：

```bash
kubectl get cm frontend-login-config -n <namespace> \
  -o go-template='{{range $k,$v := .data}}{{$k}}={{$v}}{{"\n"}}{{end}}' \
  > .env.production.local

npm run build
```

`.env.production.local` 优先级更高，又不会破坏 `.env.production`。但这仍然只是临时展示门面，不是安全登录。

### 六、改动点对照表

| 当前方案 | 推荐方案 | 原因 |
| --- | --- | --- |
| 前端保存用户名和密码哈希 | 后端登录接口 | 浏览器代码无法保密 |
| ConfigMap 保存登录凭据 | CI Secret 或后端数据库 | ConfigMap 非秘密存储 |
| 覆盖 `.env.production` | 写 `.env.production.local` | 保留生产 Mock 配置 |
| test 继承 Mock | test 显式关闭 Mock | 真正验证后端联调 |
| 运行容器注入 VITE 变量 | 构建前注入 | Vite 是构建期替换 |
| 五个后端写绝对地址 | 使用 `/sy` 等前缀 | 由网关统一分流 |

### 七、测试清单

- `npm run dev` 应使用 Mock。
- `npm run test` 应连接测试后端。
- `npm run build` 后检查产物没有 Mock 数据。
- 搜索 `dist`，确认没有不该暴露的账号、地址和凭据。
- Nginx/Ingress 能正确转发五个服务前缀。
- 修改容器运行时变量后，确认它不会神奇地改变已构建 JS。
- 后端接口在绕过前端页面时仍必须验证权限。

最终判断：**五个相对服务前缀和生产关闭 Mock 的思路是正确的；把前端用户名、MD5 哈希和 ConfigMap 当成正式登录方案则不适合真实生产。**