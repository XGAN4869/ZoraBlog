### TypeScript 部分

#### 项目搭建
推荐安装：

```bash
npm install -D typescript vue-tsc
```

然后可以在 [package.json](vscode-webview://00d3c7fm62jpi4gpbi837hrood019djvkg13p2ett6atibl46pik/package.json) 的 `scripts` 中增加：

```json
"type-check": "vue-tsc --noEmit"
```

以后运行：

```bash
npm run type-check
```

##### tsconfig
compilerOptions.paths 别名配置需要在 构建工具以及这个 tsconfig 中同时配置

#### types 结构
##### 注意
types 中只能放类型，不能放 const xxx
##### types 结构
```plaintText
src/types/
├─ index.ts
├─ common/        # 全项目通用的基础类型
│  ├─ index.ts
│  ├─ base.ts
│  ├─ pagination.ts
│  └─ response.ts
├─ api/           # 后端接口的请求参数和响应数据
│  ├─ index.ts
│  ├─ auth.ts
│  ├─ user.ts
│  ├─ department.ts
│  ├─ model.ts
│  ├─ api-key.ts
│  ├─ finance.ts
│  └─ system-log.ts
├─ router/         # 路由记录、路由 meta、菜单相关路由类型  
│  └─ index.ts
├─ store/          # Pinia 状态类型
│  ├─ index.ts
│  ├─ account.ts
│  └─ tab.ts
└─ config/         # 用配置、环境配置、表格配置等
   └─ index.ts
```
此外可能还有 `component`、`directive`、`import` ，但是类型比较多，当前项目还没有达到需要它们的阶段。

##### api 分类区分
##### 大型项目：直接 declare namespace 挂 Api 上
```ts
// api.d.ts 全局 .d.ts，整个项目到处不用import直接用
declare namespace Api {
  namespace Auth {
    interface LoginParams {
      username: string
      password: string
    }
    interface LoginResult {
      token: string
    }
  }
  namespace SystemManage {
    interface UserList {
      list: any[]
      total: number
    }
  }
  // …后面几十上百个业务域全部堆在这一个文件
}
```

##### 中小型：按业务分类
### Husky + pre‑commit 代码提交校验配置

> husky：管理 Git hooks，在提交代码前自动执行校验脚本，拦截不合规代码提交。配合 lint‑staged 只校验本次提交变更的文件。

####  1. 安装 husky（开发依赖）

```
npm install husky --save-dev
```

#### 2. 初始化 husky

```
npx husky install
```

- 会在项目根生成 `.husky` 文件夹，存放 git hook 脚本
- 在 `package.json` 添加 `prepare` 脚本，保证其他人 install 依赖后自动启用 husky

```
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

> `prepare` 脚本：pnpm/npm install 完成后自动执行，团队其他成员拉取项目不需要手动跑 `husky install`。

#### 3. 创建 pre‑commit 钩子

pre‑commit：**git commit 执行之前触发**，校验不通过直接阻断提交。

#### 推荐搭配 lint‑staged（只校验本次提交改动文件）

先安装 lint‑staged

```
npm install lint-staged --save-dev
```
装 eslint prettier，然后 ts 的版本得是 6 才能使用

```
# 1. 安装依赖
npm install -D typescript@~6.0.3 eslint prettier @eslint/js typescript-eslint eslint-plugin-vue globals eslint-config-prettier

npm i husky lint-staged -D

-- git init

# 2. 生成 Husky 内部文件
npm run prepare

# 3. 创建 .husky/pre-commit
# 内容写：

npm run lint:lint-staged

//不要写 npm run lint 项目大了跑起来很慢，lint-staged 只检测本次 git add . 过的 commit
// 👆适合跑 CI 流水线

# 4. 配置 eslint.config.mjs 和 Prettier 配置文件

# 5. 暂存并提交
git add .
git commit -m "configure lint tools"

```

在 `package.json` 增加脚本与 lint‑staged 配置：

```
{
  "scripts": {
    "type-check": "vue-tsc --noEmit",
    "lint": "run-s \"lint:*\"", //总脚本，这个开头都会执行
    "lint:lint-eslint": "eslint . --cache",
    "lint:fix": "eslint . --fix",
    "prepare": "husky install",
    "lint:lint-prettier": "prettier --check .",
    "lint:lint-staged": "lint-staged"
  },
  "lint-staged": {
    "*.{ts,tsx,vue,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  },
}
```

如果你要用 commitlint 来规范提交的前置内容，也要 npm i 
```js
npm install -D @commitlint/cli @commitlint/config-conventional
```
新建 commitlint.config.mjs 目录
```js
// commit-lint config
export default {
  extends: [ '@commitlint/config-conventional' ],
  rules: {
    'type-enum': [
      2,
      'always',
      [ 'build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test', 'types' ],
    ],
  }
};
```
在 .husky/ 下创建 commit-msg
```js
npx --no -- commitlint --edit "$1"
```
#### 补充：执行 npm run prepare做了什么？
让 husky 执行 package.json 中的 prepare: husky，然后 husky 会自动做两件事
1. 写入 git 配置：core.hooksPath=.husky/_
2. 在 `.husky/_` 里生成一批内部脚本：
	.husky/_/pre-commit
	.husky/_/pre-push
	.husky/_/commit-msg
	.husky/_/post-commit
	...
![[Pasted image 20260902171132.png]]
#### 团队协作说明

- 项目提交 husky 配置：提交 `.husky` 目录、`package.json`，其他同事拉取代码执行 `pnpm install` 自动启用钩子。
- 紧急跳过校验（仅应急，不建议滥用）：

```
git commit --no-verify
```

需要我顺带把你项目现有的 `type‑check` 也接入 pre‑commit，提交时顺带做 TS 类型检查吗？

#### .editorConfig .eslintignore  Prettier Eslint

editorConfig：只管文件底层（换行、缩进、编码），和代码语法无关
```js
# 前端工程化标准配置（Vue3+TS项目实测）
root = true

[*.{js,jsx,ts,tsx,vue}]
charset = utf-8
insert_final_newline = true
trim_trailing_whitespace = true
end_of_line = lf
max_line_length = 100
indent_size = 2
indent_style = space

[*.md]
trim_trailing_whitespace = false
max_line_length = 80
```

**Prettier**：只做**格式化**（引号、换行、括号、分号），不管代码内容

**ESLint**：主要做**代码质量检查**（未定义变量、废弃 API、逻辑错误），附带少量格式化规则。

.eslintignore
```js
node_modules
dist
*.d.ts
.vscode
public
.md
```

P.S. npm uninstall eslint-plugin-prettier 这个是 集成模式，项目跑起来很慢，可以删掉，我们用的分离模式， eslint 和 prettier 分开跑，缺点是 CI 需要执行两条命令


小总结
```plaintext
.editorconfig  → 编辑器基础行为：编码/换行符/缩进（保存时生效）
.prettierrc    → 代码格式：引号/分号/printWidth（format 命令 / 保存时插件）
ESLint         → 代码质量：坏味道/潜在 bug（lint 命令）
husky+lint-staged → 提交前强制执行上面几个（你昨天问的 husky 就是干这个的）
CI             → 最后防线：prettier --check + eslint，不通过就拦
```


### 语言包 i18n
```bash
# npm 下载地址
npm npm install vue-i18n --save

# 结构搭建
src/
├── locales/          # 语言包目录（存放各语言的翻译文件）
│   ├── en.ts         # 英文语言包
│   └── zh.ts         # 中文语言包
├── plugins/          # 插件配置目录（集中管理第三方插件）
│   └── i18n.ts       # Vue I18n 实例配置
├── utils/            # 工具函数目录
│   └── i18nUtils.ts  # 国际化工具函数（切换语言、非组件翻译）
└── main.ts           # 项目入口文件（挂载 I18n）

```