# Markdown 文章

当前博客直接读取仓库内的 Markdown，无需依赖文章 API。原来的示例文章及地址继续保留。

## 已导入内容

- `backend/notes` 的 9 篇笔记 → `src/content/articles/backend`，分类为 Go。
- `ObsidianNote` 的 1 篇笔记 → `src/content/articles/obsidian`，分类为工程实践。
- 外部 Obsidian「路线」目录的 75 篇非空笔记 → `src/content/articles/roadmap`，按主题放入 TypeScript、JavaScript、Vue、CSS、浏览器、Node.js 与工程实践；另外 2 个空文件只保留源文件，不作为文章发布。
- 16 个附件 → `public/note-assets/roadmap`，包括 12 张笔记引用的图片和原目录中的 SVG、Vue、JS 文件；附件链接提供下载，不执行代码附件。

正文按字节复制，保留原来的 Markdown、代码、表格、链接和 Draw.io 图源；原笔记未删除。`src/data/notes.ts` 提供标题、摘要、分类、稳定的英文 slug。日期 `2026.10.13` 表示博客导入发布日，原笔记创建日期未知。阅读时间由文字量估算，不计算 Draw.io XML 的长度。

## 继续编辑与添加

直接编辑 `src/content/articles` 下的 `.md` 文件即可更新博客正文。添加新文章时，将文件放在这个目录下，并在 `src/data/notes.ts` 的 `definitions` 中添加文件路径、slug、标题、摘要、分类及可选的 `date` 发布日期。之后运行 `npm run build` 和 `npm test` 验证。

外部路线笔记的索引位于 `src/content/roadmap.json`，标题优先取原文一级标题，摘要取首段正文，路径保留原来的目录层级，slug 根据相对路径生成稳定标识。需要再次导入时运行 `node scripts/import-roadmap.mjs "路线目录的绝对路径" "Obsidian 库的绝对路径"`；脚本只复制路线目录及其引用图片，不修改原笔记，也不读取库中其他笔记的正文。重新导入会更新博客副本及索引，日期记录本次导入发布日。

博客副本与原笔记独立维护，不会自动双向同步。每篇 Markdown 文章都有下载按钮，导出其原始 `.md` 正文。Vite 在构建时处理正文和下载资源，部署时不需要暴露项目的原始笔记目录。

## 渲染行为

使用 `react-markdown` 和 `remark-gfm` 支持标题、粗体、链接、列表、任务列表、引用、表格、删除线、代码块及自动链接。禁用原始 HTML 执行；代码复制保留换行和缩进。Draw.io XML 保留为可折叠图源，不额外引入图形引擎。

代码使用 Shiki 按需加载语法与 GitHub 深浅主题，通过 React 文本节点渲染 token，不插入原始 HTML。切换主题只切换颜色变量，不重新解析代码。支持 JS、TS、TSX、Vue、Go、CSS、HTML、JSON、Bash、dotenv、Markdown、Mermaid 与 XML；Draw.io 图源按 XML 着色。请在代码围栏后标注语言，如 `ts`、`go`、`vue`。纯文本、没有语言标注和不支持的语言保持普通文本；高亮资源加载失败时仍可阅读与复制原代码。

小屏文章目录以抽屉形式贴齐视口顶部，高度使用 `100dvh`；桌面固定目录保留导航栏下方的位置。

大纲和页面标题 ID 来自同一 Markdown AST，保留多级标题层次与重复标题。文章顶部已经显示标题时，正文中与之相同的首个一级标题仅在渲染时省略，源文件不变。其他正文一级标题降为二级，避免与页面标题冲突。没有标题的纯代码笔记不显示空大纲。

相对 `.md` 链接和 Obsidian `[[笔记#标题|别名]]` 双链会解析为已导入笔记的博客地址；`![[图片]]` 引用本地附件。同名笔记存在多个匹配时不猜测目标，没有导入的双链目标保留原文。链接中的标题锚点映射到文章的大纲 ID。转换只作用于 Markdown 文本节点，不改写代码块、行内代码或 JavaScript 的二维数组。外部链接沿用 Markdown 渲染器的 URL 校验。

`/blog` 直接进入目录中的第一篇文章（目前为 Go 语法笔记），不再展示卡片列表。旧分类链接 `/blog?category=...` 进入该分类第一篇，未知分类回退到第一篇。重定向替换浏览器历史项，返回时不会经过中间列表。

底部 Previous / Next 与左侧目录使用同一个 `readingArticles` 顺序：模块按已导入内容首次出现的位置排列，模块内分类同样按首次出现排序，同分类内保留文章顺序。第一页仅显示 Next，最后一页仅显示 Previous；翻页回到文章顶部。文章也可以通过站点导航、侧边目录和全站搜索访问，搜索匹配 Markdown 正文。
