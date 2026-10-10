export type Article = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  readTime: number;
  cover: "react" | "typescript" | "architecture" | "vue" | "css" | "notes";
  sections: { heading: string; paragraphs: string[]; code?: string }[];
};

// Local editorial fixtures keep the preview independent of the future Go API.
export const articles: Article[] = [
  {
    slug: "react-component-boundaries",
    title: "好的 React 组件，从划清边界开始",
    summary: "组件拆分不是把文件变短，而是让状态、职责和数据流各就其位。",
    category: "React",
    date: "2026.10.08",
    readTime: 6,
    cover: "react",
    sections: [
      {
        heading: "先看职责，再看行数",
        paragraphs: [
          "一个页面往往同时处理请求、筛选、列表和弹窗。拆分前先把这些职责写下来，确认每块内容可以独立描述，再决定组件边界。",
          "页面组件负责协调数据与业务操作；业务组件负责一段完整交互；展示组件只通过 props 接收数据，并通过回调表达用户意图。",
        ],
      },
      {
        heading: "状态放在需要它的共同父级",
        paragraphs: [
          "筛选条件会影响列表，所以它应该由页面或共同容器持有。输入框的聚焦状态只影响自己，可以留在输入框内部。",
          "当两个兄弟组件需要共享状态时，先提升到最近的共同父级。只有跨页面的状态才值得考虑全局存储。",
        ],
        code: 'function ArticlePage() {\n  const [category, setCategory] = useState("全部")\n  const visible = articles.filter(article =>\n    category === "全部" || article.category === category\n  )\n\n  return (\n    <>\n      <CategoryFilter value={category} onChange={setCategory} />\n      <ArticleList articles={visible} />\n    </>\n  )\n}',
      },
      {
        heading: "让组件接口表达意图",
        paragraphs: [
          "使用 onSelect、onSubmit 这样的接口表达发生了什么，避免把父组件的内部实现暴露给子组件。",
          "如果一个组件需要很多无关的 props，通常意味着它承担了多个职责。重新检查边界，比继续增加配置更有效。",
        ],
      },
    ],
  },
  {
    slug: "typescript-discriminated-unions",
    title: "用 TypeScript，把“不可能”写进类型",
    summary: "从一个请求状态出发，理解联合类型如何消除不合理的状态组合。",
    category: "TypeScript",
    date: "2026.10.05",
    readTime: 5,
    cover: "typescript",
    sections: [
      {
        heading: "多个布尔值的问题",
        paragraphs: [
          "loading、error 和 data 如果分别维护，可能出现正在加载却同时显示错误内容的组合。代码需要额外约定来排除这些状态。",
        ],
      },
      {
        heading: "用状态标签关联数据",
        paragraphs: [
          "使用具有共同标签的联合类型，可以让每种状态只携带自己需要的数据。判断 status 后，TypeScript 会缩窄对应类型。",
        ],
        code: 'type RequestState<T> =\n  | { status: "idle" }\n  | { status: "loading" }\n  | { status: "success"; data: T }\n  | { status: "error"; message: string }\n\nfunction getMessage(state: RequestState<string>) {\n  if (state.status === "success") return state.data\n  if (state.status === "error") return state.message\n  return "等待数据"\n}',
      },
      {
        heading: "把约束放在边界",
        paragraphs: [
          "类型检查只发生在编译时。接口返回值、浏览器存储和表单输入仍需要运行时校验，然后才能进入具有明确类型的业务逻辑。",
        ],
      },
    ],
  },
  {
    slug: "frontend-project-structure",
    title: "从页面到工程：我的前端组织方式",
    summary: "一个能持续演进的目录结构，应该跟着业务走，也给变化留出空间。",
    category: "工程实践",
    date: "2026.10.02",
    readTime: 7,
    cover: "architecture",
    sections: [
      {
        heading: "从最少的结构开始",
        paragraphs: [
          "小型项目先保留 pages、components 和 lib。不要在还没有业务的时候预先设计大量目录，等重复的职责出现，再把它们提取出来。",
        ],
      },
      {
        heading: "数据和展示各自有边界",
        paragraphs: [
          "页面负责组织数据与交互。与服务器的通信集中在服务模块，展示组件不直接发请求。这样更换后端或预览数据时，不需要改动每一个组件。",
        ],
        code: "src/\n  pages/         // 页面和用户流程\n  components/    // 业务组件与 UI 基础组件\n  data/          // 前端预览数据\n  lib/           // 小型通用工具\n  services/      // 接口接入时再引入",
      },
      {
        heading: "让结构服务于修改",
        paragraphs: [
          "好的结构能帮助你判断一项修改会影响哪些文件。每次抽取都应该减少理解成本，而不是增加跳转次数。",
        ],
      },
    ],
  },
  {
    slug: "vue-composable-state",
    title: "Vue 组合式函数：复用逻辑，也保留边界",
    summary: "关于 computed、watch 和副作用的一次重新整理。",
    category: "Vue",
    date: "2026.09.28",
    readTime: 5,
    cover: "vue",
    sections: [
      {
        heading: "派生状态交给 computed",
        paragraphs: [
          "如果一个值完全由其他响应式值决定，优先使用 computed。这样不需要手动同步，也减少了重复状态。",
        ],
        code: 'const keyword = ref("")\nconst visibleItems = computed(() =>\n  items.value.filter(item => item.title.includes(keyword.value))\n)',
      },
      {
        heading: "有副作用时再使用 watch",
        paragraphs: [
          "请求接口、写入存储和调用浏览器 API 属于副作用。watch 可以响应特定数据变化，但需要处理清理、竞态和失败状态。",
          "组合式函数应该声明输入和输出，避免隐式读取过多外部状态。组件卸载后，需要清理监听器和定时器。",
        ],
      },
    ],
  },
  {
    slug: "css-design-tokens",
    title: "设计变量，是暗色主题的起点",
    summary: "用语义化颜色组织明暗主题，让视觉层次比颜色数量更重要。",
    category: "CSS",
    date: "2026.09.24",
    readTime: 4,
    cover: "css",
    sections: [
      {
        heading: "命名表达用途",
        paragraphs: [
          "background、foreground、muted 和 border 描述的是用途。组件使用这些变量后，切换主题只需要改变变量值。",
        ],
        code: ":root {\n  --background: #f7f8fa;\n  --foreground: #17191e;\n  --primary: #2456db;\n}\n\n.dark {\n  --background: #0a0b0d;\n  --foreground: #f0f1f3;\n  --primary: #5687ff;\n}",
      },
      {
        heading: "检查层次与对比",
        paragraphs: [
          "暗色主题并不是把白色替换成黑色。正文、辅助文字、边框和交互状态都需要单独确认对比度，尤其要检查按钮、输入框和焦点指示。",
        ],
      },
    ],
  },
  {
    slug: "learning-by-writing",
    title: "把学到的东西，变成自己的表达",
    summary: "一篇笔记的价值，不在于收藏了多少，而在于下一次能不能用上。",
    category: "手记",
    date: "2026.09.20",
    readTime: 3,
    cover: "notes",
    sections: [
      {
        heading: "从一次真实问题开始",
        paragraphs: [
          "先写下遇到的问题、当时的约束和尝试过的方法，再记录最终的选择。让笔记保留上下文，下一次遇到相似问题时才能重新判断。",
        ],
      },
      {
        heading: "给自己一个可复现的例子",
        paragraphs: [
          "用最小例子解释核心逻辑，写出输入、预期输出和容易出错的情况。一个能自己重新写出来的例子，比大段复制的资料更有价值。",
        ],
      },
      {
        heading: "持续修正",
        paragraphs: [
          "知识会随着项目经验变得更具体。保留修改的理由，让博客成为持续思考的记录。",
        ],
      },
    ],
  },
];

export const categories = [
  "全部",
  "React",
  "TypeScript",
  "Vue",
  "CSS",
  "工程实践",
  "手记",
];

export function filterArticles(query: string, category = "全部") {
  const keyword = query.trim().toLocaleLowerCase();
  return articles.filter(
    (article) =>
      (category === "全部" || article.category === category) &&
      `${article.title} ${article.summary} ${article.category}`
        .toLocaleLowerCase()
        .includes(keyword),
  );
}
