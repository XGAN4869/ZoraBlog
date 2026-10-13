# TS1：TypeScript 安装、编译与运行

## 开篇速记卡：TS 负责检查，JS 负责运行

> **`.ts` 是开发时写的，`.js` 是编译后真正运行的。`tsc` 就是中间的翻译器。**

```text
写 index.ts → tsc 检查并编译 → 得到 index.js → Node.js 执行
```

### 平时最常用的 5 条命令

```bash
### 1. 初始化项目
npm init -y  
npm i typescript -g
  
### 2. 创建 tsconfig.json
npx tsc --init

## 编译指定文件 -- 还是很重要的，这样才能出编译出 .js 文件， ts-node 只能直接运行
tsc src/指定文件.ts --ignoreConfig 【需要js文件】
# 实时监测文件的变化，
tsc -w  【让 ts 实时转化为 js】

### 3. 创建入口文件 创建 src/index.ts：

### 4. 直接运行 TypeScript  -- 但是不会编译出 .js
# 只有全局安装 ts-node 才能这样写  
npm i ts-node -g
npm i '@types/node' -D
ts-node src/index.ts

# 本地安装时  
npx ts-node src/index.ts  

```
如果报错估计是版本不对，一条命令解决
```bash
npm install -D typescript@5.9.3 ts-node@10.9.2 @types/node@24
```

### 一眼判断该用哪个命令

| 你要做什么         | 直接使用                   |
| ------------- | ---------------------- |
| 正式检查、编译项目     | `npx tsc`              |
| 边写边自动编译       | `npx tsc -w`           |
| 学习时直接运行 `.ts`（全局安装） | `ts-node index.ts` |
| 学习时直接运行 `.ts`（项目内安装） | `npx ts-node index.ts` |
| 执行编译结果        | `node index.js`        |

> [!TIP]
> 记忆口诀：**项目内工具用 npx（或 npm script），全局安装可直接运行；编译用 tsc，运行 JS 用 node。**

## 分类索引

- [[#一、TypeScript 的工作流程|工作流程]]
- [[#二、推荐的项目内安装方式|安装 TypeScript]]
- [[#三、编译并运行第一个 TS 文件|编译与运行]]
- [[#四、监听模式|监听模式]]
- [[#五、常用命令速查|命令速查]]

## 一、TypeScript 的工作流程

浏览器和 Node.js 通常执行 JavaScript，而不是直接执行 TypeScript。最基础的流程是：

```text
index.ts
  ↓ tsc 编译
index.js
  ↓ node 执行
运行结果
```

> [!NOTE]
> TypeScript 的类型检查主要发生在编译阶段。类型标注在编译成 JavaScript 后通常会被删除。

## 二、推荐的项目内安装方式

### 1. 初始化项目

```bash
npm init -y
```

该命令会创建 `package.json`，用于记录项目名称、版本、依赖和脚本命令。

### 2. 安装 TypeScript

```bash
npm install --save-dev typescript ts-node
```

推荐安装在当前项目中，避免不同项目因为全局版本不同而产生差异。`ts-node` 用于开发阶段直接执行 `.ts` 文件。

### 3. 查看版本

```bash
npx tsc --version
```

### 4. 创建配置文件

```bash
npx tsc --init
```

执行后会生成 `tsconfig.json`。它用于配置目标 JavaScript 版本、模块系统、严格检查和输出目录等内容。

> [!TIP]
> 教程中的 `npm install -g typescript ts-node` 安装后，可以直接使用 `tsc` 和 `ts-node`。但项目开发更推荐本地安装，再通过 `npx` 或 `npm run` 调用，以保证团队使用同一版本。

## 三、编译并运行第一个 TS 文件

创建 `index.ts`：

```ts
const message: string = 'Hello TypeScript'
console.log(message)
```

### 1. 编译 TypeScript

```bash
npx tsc index.ts
```

编译成功后会生成 `index.js`。

### 2. 执行 JavaScript

```bash
node index.js
```

### 3. 开发阶段直接运行 TypeScript

已经全局安装 `ts-node` 时：

```bash
ts-node index.ts
```

只在项目内安装时：

```bash
npx ts-node index.ts
```

## 四、监听模式

```bash
npx tsc --watch
```

也可以简写为：

```bash
npx tsc -w
```

监听模式会持续运行。每次保存 `.ts` 文件时，它都会重新编译，因此需要保持该终端开启；可以另开一个终端执行生成的 JavaScript。

## 五、常用命令速查

| 目的 | 命令 |
|---|---|
| 初始化 npm 项目 | `npm init -y` |
| 安装 TypeScript | `npm install -D typescript` |
| 安装 `ts-node` | `npm install -D ts-node` |
| 查看 TypeScript 版本 | `npx tsc -v` |
| 创建 `tsconfig.json` | `npx tsc --init` |
| 编译单个文件 | `npx tsc index.ts` |
| 按配置编译项目 | `npx tsc` |
| 监听文件变化 | `npx tsc -w` |
| 直接运行 TypeScript（全局安装） | `ts-node index.ts` |
| 直接运行 TypeScript（项目内安装） | `npx ts-node index.ts` |
| 执行编译后的文件 | `node index.js` |

## 参考资料

- [学习 TypeScript 1（基础类型）](https://xiaoman.blog.csdn.net/article/details/122167155)
