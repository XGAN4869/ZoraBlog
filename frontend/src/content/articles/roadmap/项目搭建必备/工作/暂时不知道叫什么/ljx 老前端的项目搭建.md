# SPACE-BASED-VUE 项目搭建步骤

> 本文参考《01vitePress、Vue + ts 项目搭建.md》的“安装依赖 -> 配置工具 -> 建立目录 -> 验证结果”写法，并根据当前 `SPACE-BASED-VUE` 仓库的真实代码重新整理。
>
> 当前项目是 **Vue 3 + JavaScript**，不是 TypeScript 项目。文末会单独说明 TypeScript、Husky、ESLint、Prettier 和 i18n 的可选接入方式，不把它们写成已有配置。

## 一、搭建目标

完成本文后，项目应具备以下能力：

- 使用 Vite 启动、构建和预览 Vue 3 项目。
- 使用 TDesign 和 Tailwind CSS 编写后台页面。
- 使用 Vue Router 实现登录页、后台 Layout 和业务页面懒加载。
- 使用 Pinia 保存登录状态和主题，并进行浏览器存储持久化。
- 使用 Axios 统一处理多个微服务的请求和响应。
- 在 Mock 数据与真实后端代理之间切换。
- 使用 `src/api` 转换后端字段，让页面只消费稳定的数据模型。
- 生产构建后由 Nginx、Ingress 或网关转发服务前缀。

## 二、创建 Vue 3 项目

### 1. 使用 Vite 创建项目

```bash
npm create vite@latest space-based-vue -- --template vue
cd space-based-vue
npm install
```

当前仓库的包名是 `tianji`。如果从零复刻，可在 `package.json` 中按团队命名规则选择 `space-based-vue` 或业务包名。

### 2. 安装运行依赖

```bash
npm install vue vue-router pinia pinia-plugin-persistedstate
npm install axios crypto-js nprogress
npm install tdesign-vue-next tdesign-icons-vue-next
npm install mockjs xterm xterm-addon-fit
```

各依赖职责：

| 依赖 | 用途 |
| --- | --- |
| `vue` | 组件、响应式状态、模板渲染和生命周期 |
| `vue-router` | 登录页、Layout 嵌套路由、业务页面懒加载和路由守卫 |
| `pinia` | 登录状态和主题状态 |
| `pinia-plugin-persistedstate` | 将 Store 指定字段保存到浏览器存储 |
| `axios` | HTTP 请求和拦截器 |
| `crypto-js` | 当前前端登录门面使用 MD5 比较 |
| `tdesign-vue-next` | 表格、表单、弹窗、菜单、布局和消息提示 |
| `tdesign-icons-vue-next` | TDesign 图标 |
| `mockjs` | 本地模拟业务数据 |
| `xterm`、`xterm-addon-fit` | Web SSH 终端及尺寸适配 |

### 3. 安装构建依赖

```bash
npm install -D vite @vitejs/plugin-vue
npm install -D tailwindcss @tailwindcss/vite
npm install -D vite-plugin-mock
npm install vite-plugin-svgr
```

`vite-plugin-svgr` 在当前仓库中位于 `dependencies`。它属于构建插件，新项目也可以按团队规范放入 `devDependencies`，但不要在未验证构建结果前随意移动现有项目依赖。

## 三、配置 package.json 命令

在 `package.json` 中配置不同运行模式：

```json
{
  "scripts": {
    "localhost": "vite --mode localhost",
    "test": "vite --mode test",
    "dev": "vite --mode development",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

命令含义：

| 命令 | 读取的主要环境文件 | 用途 |
| --- | --- | --- |
| `npm run localhost` | `.env` + `.env.localhost` | 本机或指定环境联调 |
| `npm run test` | `.env` + `.env.test` | 测试环境启动 |
| `npm run dev` | `.env` + `.env.development` | 日常开发 |
| `npm run build` | `.env` + `.env.production` | 生产构建到 `dist/` |
| `npm run preview` | 已生成的 `dist/` | 本地预览生产产物 |

> [!important]
> Vite 的 `VITE_*` 变量在构建时被写入浏览器产物，不是服务器运行时秘密。账号、密码哈希、Token 和私有密钥不能依赖这种方式获得真正安全性。

## 四、建立项目目录

建议先搭好边界，再开始写业务页面：

```text
space-based-vue/
├─ mock/                         # Vite 开发 Mock
├─ public/                       # 不经过模块转换的静态资源
├─ src/
│  ├─ api/                       # 请求函数、响应转换、分页与状态归一
│  ├─ assets/                    # 图片和 SVG 图标
│  ├─ components/                # 全局通用组件
│  ├─ constant/                  # 状态枚举、标签 Key、表单常量
│  ├─ layout/
│  │  ├─ components/             # Header、Aside、Content
│  │  ├─ config/                 # 菜单配置
│  │  └─ layout.vue              # 登录后的后台骨架
│  ├─ router/                    # 路由和登录守卫
│  ├─ store/
│  │  └─ modules/                # user、theme 等 Store
│  ├─ styles/                    # 补充全局样式
│  ├─ utils/
│  │  └─ request/                # Axios 实例和服务地址配置
│  ├─ view/                      # 页面组件，按业务域分类
│  ├─ App.vue
│  ├─ main.js
│  └─ style.css
├─ .env
├─ .env.development
├─ .env.localhost
├─ .env.production
├─ .env.test
├─ index.html
├─ package.json
└─ vite.config.js
```

目录职责要保持单向：

```text
view -> api -> request
view -> components
router -> layout -> view
store -> browser storage
mock -> 开发阶段响应同一套 API URL
```

页面不要直接拼微服务 URL，也不要在多个页面重复解析后端嵌套字段。

## 五、配置 Vite

### 1. 配置插件、别名和开发服务器

`vite.config.js` 的核心结构如下。端口使用占位符，创建项目时应替换为实际后端端口，不要把私有地址写进公开笔记。

```js
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import { viteMockServe } from 'vite-plugin-mock'
import path from 'path'

const PORTS = {
  sy: '<SY_PORT>',
  rs: '<RS_PORT>',
  ta: '<TA_PORT>',
  ap: '<IM_PORT>',
  fs: '<FS_PORT>',
}

function buildProxy(target, stripPrefix) {
  if (!target) return undefined

  const proxy = {}
  for (const [prefix, port] of Object.entries(PORTS)) {
    proxy[`/${prefix}`] = {
      target: `${target}:${port}`,
      changeOrigin: true,
      rewrite: stripPrefix
        ? (requestPath) => requestPath.replace(new RegExp(`^/${prefix}`), '')
        : undefined,
    }
  }
  return proxy
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd())
  const useMock = env.VITE_USE_MOCK === 'true'
  const proxyTarget = env.VITE_PROXY_TARGET

  if (command === 'serve' && !useMock && !proxyTarget) {
    console.warn('Mock 已关闭，但没有配置 VITE_PROXY_TARGET')
  }

  return {
    plugins: [
      vue(),
      tailwindcss(),
      svgr(),
      viteMockServe({
        mockPath: 'mock',
        enable: useMock,
        watchFiles: true,
        logger: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
    server: {
      open: true,
      host: '0.0.0.0',
      proxy: useMock
        ? undefined
        : buildProxy(proxyTarget, env.VITE_PROXY_STRIP_PREFIX !== 'false'),
    },
  }
})
```

### 2. 理解两种开发请求路径

```text
VITE_USE_MOCK=true
页面 -> /rs、/ta、/ap、/fs -> vite-plugin-mock -> mock/*.js

VITE_USE_MOCK=false
页面 -> /rs、/ta、/ap、/fs -> Vite proxy -> 真实微服务
```

页面和 `src/api` 不需要判断当前使用 Mock 还是真实后端。

## 六、配置环境变量

### 1. 公共 `.env`

```dotenv
VITE_TITLE=SPACE-BASED-VUE

VITE_BASE_URL_SY=/sy
VITE_BASE_URL_RS=/rs
VITE_BASE_URL_TA=/ta
VITE_BASE_URL_IM=/ap
VITE_BASE_URL_FS=/fs

VITE_USE_MOCK=true
VITE_USE_HTTPS=false
```

### 2. 开发环境 `.env.development`

```dotenv
VITE_USE_MOCK=true

# 只写示例变量名，真实值放在团队认可的安全配置中
VITE_LOGIN_USERNAME=<BUILD_TIME_USERNAME>
VITE_LOGIN_PASSWORD_HASH=<BUILD_TIME_PASSWORD_HASH>
```

### 3. 真实后端联调配置

可在不提交的 `.env.local` 或团队规定的 mode 文件中配置：

```dotenv
VITE_USE_MOCK=false
VITE_PROXY_TARGET=http://<BACKEND_HOST>
VITE_PROXY_STRIP_PREFIX=true
```

`VITE_PROXY_TARGET` 只写主机，具体端口由 `vite.config.js` 中不同服务的端口表决定。

### 4. 生产环境 `.env.production`

```dotenv
VITE_USE_MOCK=false
VITE_LOGIN_USERNAME=<CI_INJECTED_USERNAME>
VITE_LOGIN_PASSWORD_HASH=<CI_INJECTED_PASSWORD_HASH>
```

生产构建不会启用 Vite 开发代理。`/rs`、`/ta`、`/ap`、`/fs` 等前缀要由部署环境的反向代理转发。

## 七、接入 Tailwind CSS 与主题变量

### 1. 在全局样式中启用 Tailwind

`src/style.css`：

```css
@import "tailwindcss";
```

### 2. 使用根元素属性切换主题

```css
:root[theme-mode='light'] {
  --color-primary: #006aff;
  --app-page-bg: #f2f7ff;
  --app-header-bg: #ffffff;
  --app-panel-bg: #f0f2f5;
  --app-text-primary: #1e2226;
}

:root[theme-mode='dark'] {
  --color-primary: #006aff;
  --app-page-bg: #181818;
  --app-header-bg: #141c28;
  --app-panel-bg: #0f1b2a;
  --app-text-primary: #e7e7e7;
}
```

TDesign 主题变量、自定义变量和 Tailwind 工具类可以并存：

- CSS 变量负责全局主题语义。
- Tailwind 负责模板中的布局和尺寸。
- scoped CSS 负责组件特有样式。
- TDesign 变量负责覆盖组件库外观。

不要在每个页面重新写一套亮色和暗色值。

## 八、创建应用入口

`src/main.js`：

```js
import { createApp } from 'vue'
import App from './App.vue'
import pinia from './store'
import router from './router'
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'
import './style.css'
import './styles/common.css'

const app = createApp(App)

app.use(TDesign)
app.use(pinia)
app.use(router)

app.mount('#app')
```

`App.vue` 保持简单，只提供根容器和顶级路由出口：

```vue
<template>
  <div class="app-root">
    <router-view />
  </div>
</template>
```

## 九、配置 Pinia 与持久化

### 1. 创建 Pinia 实例

`src/store/index.js`：

```js
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(createPersistedState())

export default pinia
```

### 2. 用户状态

用户 Store 至少负责：

- `username`：当前显示的用户名。
- `isLoggedIn`：路由守卫使用的登录标记。
- `login()`：校验并写入状态。
- `logout()`：清除状态。
- `sessionStorage` 持久化：刷新页面保留，关闭会话后清除。

```js
persist: {
  key: 'space-based-user',
  storage: sessionStorage,
  paths: ['username', 'isLoggedIn'],
}
```

> [!warning]
> 这只能控制前端页面显示，用户可以修改浏览器存储绕过。真实权限必须由后端 Token、Session 或其他鉴权机制验证。

### 3. 主题状态

主题 Store 使用 `localStorage` 保存 `light` 或 `dark`，并把值同步到根元素：

```js
document.documentElement.setAttribute('theme-mode', theme.value)
```

主题属于跨页面状态，适合放 Pinia；表格数据、分页和弹窗状态属于页面局部状态，不需要全部塞进 Store。

## 十、配置路由、Layout 和菜单

### 1. 路由分层

```text
/login                 -> 登录页，公开路由
/                      -> 后台 Layout
  /overview            -> 概览
  /constellation/...   -> 星座、卫星、节点
  /application/...     -> 在轨任务、镜像
  /data/...            -> 数据任务、文件
  /terminal            -> SSH 终端
  *                    -> 404
```

### 2. 使用懒加载页面

```js
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../view/login/index.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('../layout/layout.vue'),
    redirect: { name: 'Overview' },
    children: [
      {
        path: 'overview',
        name: 'Overview',
        component: () => import('../view/overview/index.vue'),
        meta: {
          title: '全局概览',
          menuValue: 'overview',
        },
      },
    ],
  },
]
```

### 3. 添加登录守卫

```js
router.beforeEach((to) => {
  const userStore = useUserStore()

  if (!to.meta.public && !userStore.isLoggedIn) {
    return { name: 'Login' }
  }

  if (to.name === 'Login' && userStore.isLoggedIn) {
    return { name: 'Overview' }
  }

  return true
})
```

### 4. Layout 三层结构

```text
layout.vue
├─ Header.vue   # 品牌、主题、用户菜单、退出登录
├─ Aside.vue    # 菜单、路由跳转、选中和展开状态
└─ Content.vue  # 标题、面包屑、子路由 router-view
```

### 5. 菜单与路由对齐规则

| 菜单字段 | 路由字段 | 作用 |
| --- | --- | --- |
| `routeName` | `name` | 点击菜单后按名称跳转 |
| `value` | `meta.menuValue` | 当前菜单高亮 |
| 父菜单 `value` | `meta.parentMenu` | 展开父菜单和生成面包屑 |

每新增一个页面，都要同时检查路由和菜单是否一致。

## 十一、配置 Axios 请求层

### 1. 服务地址配置

`src/utils/request/utlConfig.js`：

```js
export const baseUrlSY = import.meta.env.VITE_BASE_URL_SY
export const baseUrlRS = import.meta.env.VITE_BASE_URL_RS
export const baseUrlTA = import.meta.env.VITE_BASE_URL_TA
export const baseUrlIM = import.meta.env.VITE_BASE_URL_IM
export const baseUrlFS = import.meta.env.VITE_BASE_URL_FS
```

当前项目不能给 Axios 设置单一 `baseURL`，因为多个服务可能拥有相同业务路径，只能依靠 `/rs`、`/ta` 等前缀区分。

### 2. 创建 Axios 实例

`src/utils/request/request.js`：

```js
import axios from 'axios'
import { MessagePlugin } from 'tdesign-vue-next'

const request = axios.create({
  timeout: 10000,
})

request.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  (response) => {
    const result = response.data

    if (response.config.raw) {
      return result
    }

    if (result.code === 0 || result.code === 200) {
      return result
    }

    MessagePlugin.error(result.msg || '请求失败')
    return Promise.reject(result)
  },
  (error) => {
    MessagePlugin.error(
      error?.response?.data?.msg || error.message || '网络异常',
    )
    return Promise.reject(error)
  },
)

export default request
```

`raw` 用于后端直接返回对象或数组、没有 `{ code, msg, data }` 信封的接口。

## 十二、建立 API 适配层

页面不直接调用 Axios，而是调用 `src/api` 中的业务函数。

```js
import request from '@/utils/request/request.js'
import { baseUrlRS } from '@/utils/request/utlConfig.js'

function convertDevice(item = {}) {
  const meta = item.meta || {}
  const spec = item.spec || {}

  return {
    id: meta.ID,
    name: meta.name || spec.name || '',
    status: item.status?.online ? 'online' : 'offline',
    _raw: item,
  }
}

export async function listDevice(params = {}) {
  const response = await request({
    url: `${baseUrlRS}/api/v1/datamanager/listDevice`,
    method: 'post',
    data: params,
  })

  return {
    list: (response.data || []).map(convertDevice),
    total: response.pageResult?.total || 0,
  }
}
```

这是一个“结构示例”，`listDevice` 不是当前项目已经存在的真实接口。实际业务应复用已有的 `asterism.js`、`satellite.js`、`node.js`、`task.js`、`mirror.js`、`file.js` 和 `dataTask.js`，接口名称必须以真实后端契约为准。

API 层统一负责：

- 选择微服务前缀和 URL。
- 选择 JSON、FormData 或 query 参数。
- 解析不同分页结构。
- 归一化后端状态。
- 把嵌套对象转换成页面字段。
- 保留 `_raw` 供详情或联调使用。

## 十三、配置 Mock

在 `mock/` 中按业务域建立文件，URL 必须和真实 API 完全一致：

```js
export default [
  {
    url: '/rs/api/v1/datamanager/listDevice',
    method: 'post',
    timeout: 200,
    response: () => ({
      code: 0,
      msg: 'ok',
      data: [],
      pageResult: {
        total: 0,
      },
    }),
  },
]
```

同样地，`listDevice` 只是搭建演示，不代表真实业务接口。

Mock 的目的不是让页面写另一套逻辑，而是让同一个 API 调用在没有后端时也能返回符合契约的数据。

## 十四、搭建通用表格页

当前项目用 `TablePage.vue` 统一后台列表页结构：

```vue
<TablePage>
  <template #toolbar>
    <!-- 搜索、筛选、创建、刷新 -->
  </template>

  <template #title>
    <!-- 页面标题和批量操作 -->
  </template>

  <t-table
    :data="tableData"
    :columns="columns"
    :pagination="pagination"
    :loading="loading"
    @page-change="handlePageChange"
  />
</TablePage>
```

标准列表页状态：

```js
data() {
  return {
    tableData: [],
    loading: false,
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
      showJumper: true,
      showTotal: true,
    },
  }
}
```

标准请求流程：

```js
async fetchList() {
  this.loading = true
  try {
    const { list, total } = await listDevice({
      commonListReq: {
        page: this.pagination.current,
        pageSize: this.pagination.pageSize,
      },
    })
    this.tableData = list
    this.pagination.total = total
  } catch (error) {
    this.tableData = []
  } finally {
    this.loading = false
  }
}
```

## 十五、启动与验证

### 1. Mock 模式启动

```bash
npm run dev
```

检查：

- Vite 能正常启动并自动打开浏览器。
- 登录页能够显示。
- 登录后路由守卫允许进入后台 Layout。
- 菜单点击能切换页面并保持高亮。
- `/rs`、`/ta`、`/ap`、`/fs` 请求被 Mock 命中。
- 列表页有 loading、数据和分页状态。

### 2. 真实后端联调

将当前 mode 的环境配置改为：

```dotenv
VITE_USE_MOCK=false
VITE_PROXY_TARGET=http://<BACKEND_HOST>
```

重新启动开发服务器后检查：

- 终端没有“关闭 Mock 但缺少代理目标”的警告。
- Network 面板中的服务前缀正确。
- 代理是否需要剥离 `/rs`、`/ta` 等前缀。
- 接口成功码、分页字段和请求体格式是否符合真实契约。
- 页面状态不是从 Mock 假设直接推断出来的。

### 3. 生产构建

```bash
npm run build
npm run preview
```

检查：

- `dist/` 能生成。
- 浏览器刷新子路由时，部署服务器会回退到 `index.html`。
- 网关能转发 `/rs`、`/ta`、`/ap`、`/fs`。
- 构建日志中没有错误。
- 当前项目的旧式 `:deep` 和大 chunk 警告需要记录，但不应被误报为构建失败。

## 十六、生产部署注意事项

### 1. History 路由回退

项目使用 `createWebHistory()`，服务器必须将未知前端路由回退到 `index.html`，否则刷新 `/application/tasks` 会得到 404。

### 2. 微服务反向代理

生产环境需要配置以下前缀：

```text
/sy -> 对应服务
/rs -> 资源服务
/ta -> 任务服务
/ap -> 镜像服务
/fs -> 文件服务
```

是否剥离前缀要和后端实际路由确认，不能直接照搬开发代理假设。

### 3. 登录配置

当前登录变量是构建期注入。修改构建完成后的容器环境变量不会改变已经生成的 JavaScript 文件，必须重新构建。

这套登录仍不是真实鉴权，正式环境应由后端验证身份和权限。

## 十七、参考笔记中的可选工程化增强

以下内容来自参考笔记的思路，但当前仓库尚未配置。接入时应单独开任务验证，不要一次性全部加入。

### 1. TypeScript

如果决定把项目迁移为 TypeScript：

```bash
npm install -D typescript vue-tsc
```

增加脚本：

```json
{
  "scripts": {
    "type-check": "vue-tsc --noEmit"
  }
}
```

注意：

- Vite 的 `@` 别名和 `tsconfig` 的 `compilerOptions.paths` 要同时配置。
- 先迁移公共类型、API 返回值和 Store，再逐页迁移。
- `types/` 只放类型声明，运行时常量继续放 `constant/`。
- 当前仓库仍是 `.js`，本文不把 TypeScript 当作必需步骤。

### 2. EditorConfig、Prettier 和 ESLint

职责分工：

```text
.editorconfig -> 编码、换行、缩进
Prettier      -> 代码格式
ESLint        -> 代码质量与潜在错误
```

当前项目没有这些配置。接入前要先确定团队的引号、分号、缩进和 Vue 规则，避免第一次格式化改动全仓库。

### 3. Husky 与 lint-staged

```bash
npm install -D husky lint-staged
```

推荐 pre-commit 只检查本次暂存文件，不要在大型项目每次提交时执行全仓库修复。

接入前提是项目已经存在稳定的 ESLint、Prettier 或 type-check 命令，否则 Git Hook 没有可靠的校验目标。

### 4. i18n

```bash
npm install vue-i18n
```

只有在产品明确需要多语言时再建立 `locales/` 和 i18n 插件。当前界面文案直接写在组件中，不应为了目录完整度提前加入无业务需求的语言层。

## 十八、搭建完成检查表

- [ ] `npm install` 能完成，依赖版本由锁文件固定。
- [ ] `npm run dev` 能在 Mock 模式启动。
- [ ] `@` 能正确指向 `src`。
- [ ] Tailwind 工具类和 TDesign 样式都能生效。
- [ ] Pinia 已安装持久化插件。
- [ ] 登录路由与后台 Layout 能正确切换。
- [ ] 菜单高亮、父菜单展开和面包屑一致。
- [ ] Axios 能兼容 `code === 0` 和 `code === 200`。
- [ ] 裸对象接口使用 `raw` 标记，不误判为失败。
- [ ] 各 API 使用正确的服务前缀。
- [ ] 页面消费转换后的字段，不直接读取复杂后端对象。
- [ ] Mock URL 与真实 API URL 一致。
- [ ] 真实联调时关闭 Mock 并配置代理目标。
- [ ] `npm run build` 能生成 `dist/`。
- [ ] 生产服务器已配置 History 回退和微服务转发。
- [ ] 没有把真实账号、哈希、Token 或私有地址写进学习笔记。

## 十九、今日复刻任务

从空目录搭建一个最小版本，只完成以下闭环：

1. 创建 Vue 3 + Vite 项目。
2. 安装 Router、Pinia、TDesign、Axios 和 Mock。
3. 配置 `@` 别名、Tailwind 和 `VITE_USE_MOCK`。
4. 创建登录页和包含 Header、Aside、Content 的 Layout。
5. 新建一个设备列表页。
6. 通过 `src/api/device.js` 转换 Mock 返回的嵌套对象。
7. 完成 loading、分页、刷新和错误清空。
8. 分别验证 Mock 模式、代理模式和生产构建。

完成标准：页面中不出现微服务 URL，不直接读取 `item.meta.xxx`，切换环境时不修改页面代码。

## 一句话总结

`SPACE-BASED-VUE` 的搭建重点不是把依赖装齐，而是先建立清晰边界：Vite 管构建和环境，Router 与 Layout 管页面入口，Pinia 管跨页面状态，页面管交互，API 层管微服务差异，Mock 与真实后端共用调用链，再用构建和部署检查把整个流程闭环。
