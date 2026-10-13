`notes.jiangxu.net` 更准确地说是一套开源的个人技术知识库，而不是传统按时间发布文章的博客。

## 技术栈总览

| 层级    | 使用技术                      | 作用                  |
| ----- | ------------------------- | ------------------- |
| 前端框架  | Next.js 16 + React 19     | 页面路由、服务端渲染、API      |
| 开发语言  | TypeScript                | 页面、组件、配置和内容索引       |
| 文档框架  | Fumadocs                  | 文档布局、侧边栏、TOC、搜索、MDX |
| 内容格式  | Markdown / MDX            | 编写技术教程、八股、面经        |
| 样式    | Tailwind CSS 4            | 页面样式和响应式布局          |
| AI 功能 | Vercel AI SDK             | 顶部“AI 解答”功能         |
| 图标    | Lucide React、Simple Icons | 普通 UI 图标和技术品牌图标     |
| 视觉效果  | particles.js              | 粒子背景等装饰效果           |
| 数据统计  | Vercel Analytics          | 访问量和页面统计            |
| 测试    | Vitest                    | 单元测试                |
| 工程规范  | Husky + Commitlint        | Git 提交前检查、提交信息校验    |
| 部署    | Vercel                    | 构建、发布、绑定自定义域名       |

当前版本信息可以在项目的 [package.json](https://github.com/Jaxon1216/notes/blob/main/package.json) 中查看。

## 核心架构

项目大致可以理解为：

```
Markdown / MDX 笔记
        ↓
Fumadocs MDX 读取并生成页面数据
        ↓
Next.js 动态文档路由
        ↓
Fumadocs UI 渲染
        ↓
侧边栏 + 文章正文 + TOC + 搜索
        ↓
Vercel 部署
```

文档页面使用 Next.js App Router 的可选动态路由：

```
app/docs/[[...slug]]/page.tsx
```

因此以下 URL 都由同一个页面入口处理：

```
/docs
/docs/frontend
/docs/frontend/tutorial/React
/docs/agent/bagu/llm
```

具体展示什么内容，由 URL 中的 `slug` 决定。[项目 README](https://github.com/Jaxon1216/notes)

## 内容管理方式

所有知识内容集中在：

```
content/docs/
├─ frontend/
│  ├─ tutorial/
│  ├─ bagu/
│  └─ interview/
├─ backend/
├─ agent/
├─ algorithm/
├─ resources/
└─ dev/
```

内容采用 Markdown 或 MDX 编写：

```
---
title: React 核心概念
description: React 入门笔记
---

# React 核心概念

## JSX 与 TSX

正文内容……
```

每个目录中的 `meta.json` 用来管理：

- 侧边栏标题
- 文档排列顺序
- 默认展开状态
- 页面分组关系

`site.config.ts` 则集中维护整个网站的信息架构和一级导航。

这种做法的优点是：新增文章通常只需要增加一个 `.md` 或 `.mdx` 文件，不需要手动创建 React 页面。

## 页面 UI

主体 UI 来自 `fumadocs-ui`，包括：

- 左侧文档树
- 顶部导航栏
- 深色/浅色主题
- 搜索面板
- 面包屑
- 上一篇/下一篇
- 文章标题和正文排版
- 右侧文章目录
- 当前章节滚动高亮

之前截图里的曲线目录，就是 Fumadocs 的 Clerk 风格 TOC：

```
<DocsPage
  toc={page.data.toc}
  tableOfContent={{
    style: "clerk",
  }}
>
  ...
</DocsPage>
```

[Fumadocs TOC 官方文档](https://www.fumadocs.dev/docs/ui/layouts/page)

项目根目录虽然有 `components.json`，但它的核心 UI 明确是 Fumadocs，不能简单归类为一个普通的 shadcn/ui 项目。

## AI 解答功能

项目依赖了：

```
{
  "ai": "^7.0.83",
  "@ai-sdk/react": "^4.0.86",
  "@ai-sdk/openai-compatible": "^3.0.39"
}
```

这说明它使用 Vercel AI SDK 实现前端对话和流式回答，并使用 OpenAI-compatible 适配层连接兼容接口。

大致调用关系应当是：

```
用户在 AI 面板输入问题
        ↓
React useChat / 对话状态
        ↓
Next.js API Route
        ↓
Vercel AI SDK
        ↓
OpenAI-compatible 模型服务
        ↓
流式返回回答
```

但仅凭公开依赖无法确定它连接的是 OpenAI、DeepSeek、硅基流动还是其他兼容服务，所以不应该直接断言具体模型。

## 工程化

项目不是只追求页面好看，也做了比较完整的质量检查：

```
npm run check:content
npm run check:images
npm run check:vue:tags
npm run test:unit
npm run typecheck
npm run build
npm run validate
```

其中包括：

- 文档格式检查
- 图片引用检查
- HTML/Vue 标签闭合检查
- Vitest 单元测试
- TypeScript 类型检查
- Next.js 生产构建
- Husky Git hooks
- Commitlint 提交信息检查

README 说明 `validate` 同时作为 CI 和 Vercel 构建门禁。[源码与维护说明](https://github.com/Jaxon1216/notes#检查命令)

## 一句话总结

它的核心方案就是：

> **Next.js 负责应用和路由，Fumadocs 负责文档系统，MDX 负责内容，Tailwind 负责样式，Vercel AI SDK 负责 AI 问答，最后部署到 Vercel。**

如果你也想做类似的网站，最关键的组合其实只有：

```
Next.js + TypeScript + Fumadocs + MDX + Tailwind CSS
```

AI、粒子效果、访问统计都属于后续增强项。项目源码采用 [MIT License](https://github.com/Jaxon1216/notes/blob/main/LICENSE)，可以作为个人知识库的学习参考。