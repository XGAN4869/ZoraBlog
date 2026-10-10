import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { useTheme } from "@/lib/theme";
import { MotionConfig, motion } from "motion/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Code2,
  Copy,
  Eye,
  EyeOff,
  FileCode2,
  Layers3,
  Loader2,
  Menu,
  Moon,
  Search,
  Sun,
  Terminal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { ShapeGrid } from "@/components/ShapeGrid";
import {
  articles,
  categories,
  filterArticles,
  type Article,
} from "@/data/articles";
import reactLogo from "@/assets/react.svg";
import "./App.css";

const navigation = [
  { label: "首页", to: "/" },
  { label: "文章", to: "/#articles" },
  { label: "手记", to: "/#notes" },
  { label: "项目", to: "/#projects" },
  { label: "关于", to: "/#about" },
];

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Hi Zora 首页">
      <span className="brand-mark">
        z<span>.</span>
      </span>
      <span>
        Hi Zora<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}

function Header({ onSearch }: { onSearch: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const light = resolvedTheme === "light";
  const active =
    location.pathname === "/"
      ? `/${location.hash}`
      : location.pathname.startsWith("/articles")
        ? "/#articles"
        : "";
  return (
    <header className="site-header shell">
      <Brand />
      <nav className="desktop-nav" aria-label="主导航">
        {navigation.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={active === item.to ? "active" : ""}
            aria-current={active === item.to ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Button
          variant="ghost"
          className="search-trigger"
          onClick={onSearch}
          aria-label="搜索文章"
        >
          <Search />
          <span>搜索</span>
          <kbd>Ctrl K</kbd>
        </Button>
        <span className="action-divider" />
        <IconAction
          label={`切换到${light ? "暗" : "亮"}色主题`}
          onClick={() => setTheme(light ? "dark" : "light")}
        >
          {light ? <Moon /> : <Sun />}
        </IconAction>
        <Button asChild className="header-login">
          <Link to="/login">
            登录
            <ArrowUpRight />
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="打开导航菜单"
            >
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {navigation.map((item) => (
              <DropdownMenuItem
                key={item.to}
                onSelect={() => navigate(item.to)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={() => navigate("/login")}>
              登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function SearchDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const results = filterArticles(query);
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="search-dialog"
        aria-describedby="search-description"
      >
        <DialogHeader>
          <DialogTitle>搜索文章</DialogTitle>
          <DialogDescription id="search-description">
            从前端实践到日常思考。
          </DialogDescription>
        </DialogHeader>
        <div className="search-field">
          <Search />
          <Input
            aria-label="搜索文章"
            placeholder="搜索文章、技术或关键词…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                setOpen(false);
                navigate(`/articles/${results[0].slug}`);
              }
            }}
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="清空搜索"
              onClick={() => setQuery("")}
            >
              <X />
            </Button>
          )}
        </div>
        <div className="search-results">
          {results.length ? (
            results.map((article) => (
              <Link
                key={article.slug}
                to={`/articles/${article.slug}`}
                onClick={() => setOpen(false)}
              >
                <BookOpen />
                <div>
                  <span>{article.title}</span>
                  <small>
                    {article.category} · {article.readTime} 分钟
                  </small>
                </div>
                <ArrowUpRight />
              </Link>
            ))
          ) : (
            <div className="empty-search">
              <Search />
              <p>还没有找到相关文章</p>
              <small>试试 React、Vue 或工程实践</small>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Cover({ article }: { article: Article }) {
  return (
    <div className={`article-cover cover-${article.cover}`} aria-hidden="true">
      <span className="cover-index">
        {String(articles.indexOf(article) + 1).padStart(2, "0")} / FIELD NOTES
      </span>
      {article.cover === "react" ? (
        <img src={reactLogo} alt="" />
      ) : article.cover === "typescript" ? (
        <span className="ts-symbol">TS</span>
      ) : article.cover === "architecture" ? (
        <Layers3 className="cover-symbol" />
      ) : article.cover === "vue" ? (
        <span className="vue-symbol">V</span>
      ) : article.cover === "css" ? (
        <span className="css-symbol">{"{ }"}</span>
      ) : (
        <Terminal className="cover-symbol" />
      )}
      <span className="cover-caption">
        {article.category.toUpperCase()}
        <ArrowUpRight />
      </span>
    </div>
  );
}

function ArticleCard({ article, index }: { article: Article; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
    >
      <Link className="article-card" to={`/articles/${article.slug}`}>
        <Cover article={article} />
        <div className="article-card-body">
          <div className="article-meta">
            <span className="category-label">{article.category}</span>
            <time>{article.date}</time>
          </div>
          <h3>{article.title}</h3>
          <p>{article.summary}</p>
          <div className="article-bottom">
            <span>{article.readTime} 分钟阅读</span>
            <span className="read-arrow">
              <ArrowUpRight />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function Home() {
  const [category, setCategory] = useState("全部");
  const { resolvedTheme } = useTheme();
  const visible = filterArticles("", category);
  return (
    <main>
      <section className="hero">
        <ShapeGrid light={resolvedTheme === "light"} />
        <div className="grid-shade" />
        <div className="hero-margin left">
          <span>PERSONAL JOURNAL / 2026</span>
        </div>
        <div className="hero-margin right">
          <span>BUILD. LEARN. SHARE.</span>
        </div>
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
        >
          <div className="hero-eyebrow">
            <span className="status-dot" />A FRONTEND DEVELOPER'S JOURNAL
            <span className="eyebrow-end">/ 01</span>
          </div>
          <h1>
            Hi, I'm <span>Zora</span>
            <span className="title-period">.</span>
          </h1>
          <h2>
            写代码，也写下思考<span className="text-cursor">_</span>
          </h2>
          <p>
            记录前端世界里的探索与实践。
            <br />
            把知识沉淀为文字，把想法变成作品。
          </p>
          <div className="hero-buttons">
            <Button asChild size="lg">
              <Link to="/#articles">
                探索文章
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/#about">
                认识一下
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <div className="hero-stack">
            <span>WORKING WITH</span>
            <span>React</span>
            <span>Vue</span>
            <span>TypeScript</span>
            <span className="stack-plus">+</span>
          </div>
        </motion.div>
        <div className="hero-bottom shell">
          <span>
            <span className="tiny-cross">+</span> ALWAYS CURIOUS. ALWAYS
            BUILDING.
          </span>
          <Link to="/#articles" className="scroll-link">
            SCROLL TO EXPLORE
            <ArrowDown />
          </Link>
          <span className="hero-coordinate">A PERSONAL SPACE ON THE WEB</span>
        </div>
      </section>
      <section className="articles-section shell section" id="articles">
        <div className="section-heading">
          <div>
            <div className="section-kicker">
              <span>01</span> / THE JOURNAL
            </div>
            <h2>
              最近写下的<span className="blue-period">.</span>
            </h2>
          </div>
          <p>一些经验，一些想法，一点点进步。</p>
        </div>
        <Tabs value={category} onValueChange={setCategory}>
          <div className="article-filter">
            <TabsList aria-label="文章分类">
              {categories.map((item) => (
                <TabsTrigger key={item} value={item}>
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
            <span className="result-count">
              {String(visible.length).padStart(2, "0")} 篇文章
            </span>
          </div>
          <TabsContent value={category}>
            <div className="article-grid">
              {visible.map((article, index) => (
                <ArticleCard
                  key={article.slug}
                  article={article}
                  index={index}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>
      <section id="notes" className="notes-section shell section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">
              <span>02</span> / SMALL THOUGHTS
            </div>
            <h2>
              思考的片刻<span className="blue-period">.</span>
            </h2>
          </div>
          <span className="section-note">在学习与创造之间</span>
        </div>
        <Link className="note-row" to="/articles/learning-by-writing">
          <span className="note-date">2026 / 09 / 20</span>
          <div>
            <span className="category-label">学习手记</span>
            <h3>把学到的东西，变成自己的表达</h3>
            <p>写下来，是为了下次做得更好。</p>
          </div>
          <ArrowUpRight />
        </Link>
      </section>
      <section id="projects" className="projects-section shell section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">
              <span>03</span> / SELECTED WORK
            </div>
            <h2>
              想法的落点<span className="blue-period">.</span>
            </h2>
          </div>
          <span className="section-note">从一个念头，到一段可运行的代码</span>
        </div>
        <div className="project-list">
          <Link to="/articles/vue-composable-state" className="project-row">
            <div className="project-number">01</div>
            <div className="project-icon">
              <FileCode2 />
            </div>
            <div className="project-info">
              <h3>Vite Ku Zora</h3>
              <p>把日常开发中的组件与组合式函数，整理成自己的工具箱。</p>
            </div>
            <div className="project-tags">
              <span>Vue</span>
              <span>VitePress</span>
            </div>
            <ArrowUpRight />
          </Link>
          <Link
            to="/articles/frontend-project-structure"
            className="project-row"
          >
            <div className="project-number">02</div>
            <div className="project-icon">
              <Code2 />
            </div>
            <div className="project-info">
              <h3>Hi Zora Blog</h3>
              <p>一个关于技术、表达与持续成长的个人空间。</p>
            </div>
            <div className="project-tags">
              <span>React</span>
              <span>TypeScript</span>
            </div>
            <ArrowUpRight />
          </Link>
        </div>
      </section>
      <section className="about-section shell section" id="about">
        <div className="about-label">
          <div className="section-kicker">
            <span>04</span> / BEHIND THE CODE
          </div>
          <span className="about-monogram">
            Z<span>.</span>
          </span>
        </div>
        <div className="about-copy">
          <span className="category-label">关于我</span>
          <h2>
            保持好奇，
            <br />
            认真创造。
          </h2>
          <p>
            我是 Zora，一名前端开发工程师。
            <br />
            喜欢清晰的代码，也喜欢有温度的设计。这里是我的知识记录，
            <br className="desktop-break" />
            也是持续学习、分享和创造的地方。
          </p>
          <div className="about-interests">
            <span>前端开发</span>
            <span>工程实践</span>
            <span>交互设计</span>
            <span>持续学习</span>
          </div>
        </div>
        <span className="about-end">
          MORE TO COME
          <ArrowUpRight />
        </span>
      </section>
    </main>
  );
}

function Login() {
  const { resolvedTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? undefined
        : "请输入有效的邮箱地址",
      password: password.length >= 8 ? undefined : "密码至少需要 8 个字符",
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 550));
    // UI preview only: no authentication or credential storage occurs.
    setBusy(false);
    setPassword("");
    setSuccess(true);
  }
  return (
    <main className="login-page">
      <ShapeGrid light={resolvedTheme === "light"} />
      <div className="grid-shade" />
      <div className="login-layout shell">
        <div className="login-intro">
          <div className="section-kicker">A SPACE FOR CURIOUS MINDS</div>
          <h1>
            每一次记录，
            <br />
            都是新的<span>开始。</span>
          </h1>
          <p>
            让思考有迹可循。
            <br />
            在这里，继续你的探索。
          </p>
          <div className="login-signature">
            <span className="brand-mark">
              z<span>.</span>
            </span>
            <span>
              Hi Zora Journal
              <br />
              <small>BUILD. LEARN. SHARE.</small>
            </span>
          </div>
        </div>
        <motion.div
          className="login-form-area"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Link to="/" className="back-link">
            <ArrowLeft />
            返回首页
          </Link>
          <div className="login-heading">
            <span className="section-kicker">WELCOME BACK /</span>
            <h2>
              欢迎回来<span className="blue-period">.</span>
            </h2>
            <p>登录你的个人空间，继续记录与分享。</p>
          </div>
          {success ? (
            <div className="login-success" role="status">
              <div className="success-check">
                <Check />
              </div>
              <h3>前端预览成功</h3>
              <p>
                表单交互已完成。真实登录会在 Go
                接口接入后启用，本次未创建账户或登录会话。
              </p>
              <Button asChild>
                <Link to="/">
                  回到首页
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => setSuccess(false)}>
                返回表单
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="form-field">
                <Label htmlFor="email">邮箱地址</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  disabled={busy}
                />
                {errors.email && (
                  <p className="field-error" id="email-error">
                    {errors.email}
                  </p>
                )}
              </div>
              <div className="form-field">
                <Label htmlFor="password">密码</Label>
                <div className="password-field">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="至少 8 个字符"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    disabled={busy}
                  />
                  <IconAction
                    label={showPassword ? "隐藏密码" : "显示密码"}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </IconAction>
                </div>
                {errors.password && (
                  <p className="field-error" id="password-error">
                    {errors.password}
                  </p>
                )}
              </div>
              <div className="remember-row">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(value) => setRemember(value === true)}
                  disabled={busy}
                />
                <Label htmlFor="remember">保持登录</Label>
                <span>接口接入后生效</span>
              </div>
              <Button type="submit" className="submit-login" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" />
                    正在校验
                  </>
                ) : (
                  <>
                    预览登录
                    <ArrowRight />
                  </>
                )}
              </Button>
              <div className="login-preview-note">
                <span className="status-dot" />
                <p>当前为前端预览。真实账户验证将在 Go 接口接入后启用。</p>
              </div>
            </form>
          )}
        </motion.div>
      </div>
      <div className="login-bottom shell">
        <span>YOUR IDEAS DESERVE A PLACE.</span>
        <span>HI ZORA / JOURNAL</span>
      </div>
    </main>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="code-block">
      <div>
        <span>CODE</span>
        <IconAction
          label="复制代码"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              toast.success("代码已复制");
            } catch {
              toast.error("复制失败，请手动选择代码");
            }
          }}
        >
          <Copy />
        </IconAction>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ArticlePage() {
  const { slug } = useParams();
  const article = articles.find((item) => item.slug === slug);
  if (!article) return <NotFound />;
  const related = articles.filter((item) => item.slug !== slug).slice(0, 3);
  return (
    <main className="article-page shell">
      <Link to="/#articles" className="back-link">
        <ArrowLeft />
        全部文章
      </Link>
      <div className="reading-layout">
        <article className="reading-content">
          <div className="article-meta">
            <span className="category-label">{article.category}</span>
            <span>
              {article.date} · {article.readTime} 分钟阅读
            </span>
          </div>
          <h1>{article.title}</h1>
          <p className="article-lead">{article.summary}</p>
          <div className="author-line">
            <span className="mini-avatar">Z.</span>
            <span>Zora</span>
            <span>前端开发工程师</span>
            <span className="sample-label">示例文章</span>
          </div>
          <Cover article={article} />
          <div className="article-prose">
            {article.sections.map((section, index) => (
              <section key={section.heading} id={`section-${index}`}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.code && <CodeBlock code={section.code} />}
              </section>
            ))}
          </div>
          <div className="article-end">
            <span>感谢阅读，下次见。</span>
            <span className="brand-mark">
              z<span>.</span>
            </span>
          </div>
        </article>
        <aside className="table-of-contents">
          <span className="section-kicker">IN THIS ARTICLE</span>
          {article.sections.map((section, index) => (
            <a key={section.heading} href={`#section-${index}`}>
              <span>0{index + 1}</span>
              {section.heading}
            </a>
          ))}
          <div className="toc-note">
            <BookOpen />
            <p>
              写下来，
              <br />
              让思考走得更远。
            </p>
          </div>
        </aside>
      </div>
      <div className="related-articles">
        <div className="section-heading">
          <h2>
            继续探索<span className="blue-period">.</span>
          </h2>
        </div>
        <div className="article-grid">
          {related.map((item, index) => (
            <ArticleCard article={item} index={index} key={item.slug} />
          ))}
        </div>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <main className="not-found shell">
      <span className="section-kicker">404 / PAGE NOT FOUND</span>
      <h1>这页还没写下。</h1>
      <p>回到首页，继续探索已经记录的内容。</p>
      <Button asChild>
        <Link to="/">
          返回首页
          <ArrowRight />
        </Link>
      </Button>
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer shell">
      <Brand />
      <span>© {new Date().getFullYear()} Zora. 用代码创造，用文字记录。</span>
      <a href="#top" aria-label="回到顶部">
        BACK TO TOP
        <ArrowUpRight />
      </a>
    </footer>
  );
}

function Site() {
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  useEffect(() => {
    document.title =
      location.pathname === "/login"
        ? "登录 · Hi Zora"
        : location.pathname.startsWith("/articles/")
          ? `${articles.find((article) => `/articles/${article.slug}` === location.pathname)?.title ?? "文章"} · Hi Zora`
          : "Hi Zora · 前端开发与创造";
    const frame = requestAnimationFrame(() => {
      if (location.hash && location.hash !== "#top")
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
          });
      else window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
  return (
    <div id="top">
      <a href="#main-content" className="skip-link">
        跳转到主要内容
      </a>
      <Header onSearch={() => setSearchOpen(true)} />
      <div id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/articles/:slug" element={<ArticlePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
      <SearchDialog open={searchOpen} setOpen={setSearchOpen} />
      <Toaster position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={250}>
          <BrowserRouter>
            <Site />
          </BrowserRouter>
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
