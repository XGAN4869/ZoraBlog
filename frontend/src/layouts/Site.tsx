import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight, BookOpen, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { authEnabled, useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { BlogNavigation } from "@/components/BlogNavigation";
import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler";
import { articleModules, categoryArticles } from "@/data/navigation";
import { articles, filterArticles } from "@/data/articles";
import "./Site.css";

const oauthErrors: Record<string, string> = {
  oauth_denied: "你取消了 GitHub 授权，可以重新尝试。",
  invalid_state: "这次登录已过期，请重新使用 GitHub 登录。",
  oauth_unavailable: "GitHub 登录暂未开放，请稍后再试。",
  oauth_failed: "暂时无法完成 GitHub 登录，请稍后重试。",
};

const navigation = [
  { label: "首页", to: "/" },
  { label: "文章", to: "/blog" },
  { label: "手记", to: "/blog?category=手记" },
];

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Hi Zora 首页">
      <img className="brand-mark" src="/zora-icon.svg" alt="" width="40" height="40" />
    </Link>
  );
}

function Header({ onSearch }: { onSearch: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const loginURL = authApi.githubLoginURL(location.pathname + location.search + location.hash);
  const [loggingOut, setLoggingOut] = useState(false);
  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logout(); toast.success("已退出登录"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "退出失败，请稍后重试"); }
    finally { setLoggingOut(false); }
  }
  return (
    <header className="site-header">
      <Brand />
      <BlogNavigation key={location.pathname + location.hash} />
      <div className="header-actions">
        <Button
          variant="ghost"
          className="search-trigger"
          onClick={onSearch}
          aria-label="搜索文章"
          aria-keyshortcuts="Control+K Meta+K"
          title="搜索文章（Ctrl+K）"
        >
          <Search />
          <span>搜索</span>
        </Button>
        <span className="action-divider" />
        <AnimatedThemeToggler />
        {authEnabled && (user ? <DropdownMenu>
          <DropdownMenuTrigger asChild><button type="button" className="header-account" aria-label={`账户：${user.username}`}><UserRound size={16} /><span>{user.username}</span></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="account-menu">
            <DropdownMenuLabel className="account-menu-label">{user.username}{user.email && <small>{user.email}</small>}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={loggingOut} onSelect={() => void handleLogout()}><LogOut />{loggingOut ? "正在退出" : "退出登录"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> : <Button asChild className="header-login">
          <a href={loginURL}>
            使用 GitHub 登录
            <ArrowUpRight />
          </a>
        </Button>)}
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
            {articleModules.map((module) => (
              <DropdownMenuSub key={module.id}>
                <DropdownMenuSubTrigger>{module.label}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {module.categories.map((category) => (
                    <div key={category}>
                      <DropdownMenuLabel>{category}</DropdownMenuLabel>
                      {categoryArticles(category).map((article) => (
                        <DropdownMenuItem
                          key={article.slug}
                          onSelect={() => navigate(`/articles/${article.slug}`)}
                        >
                          {article.title}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
            <DropdownMenuSeparator />
            {navigation.map((item) => (
              <DropdownMenuItem
                key={item.to}
                onSelect={() => navigate(item.to)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
            {authEnabled && (user ? <><DropdownMenuSeparator /><DropdownMenuLabel>{user.username}</DropdownMenuLabel><DropdownMenuItem disabled={loggingOut} onSelect={() => void handleLogout()}>退出登录</DropdownMenuItem></> : <DropdownMenuItem asChild><a href={loginURL}>使用 GitHub 登录</a></DropdownMenuItem>)}
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
          <DialogDescription id="search-description" className="sr-only">
            搜索博客文章
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Footer() {
  return (
    <footer className="site-footer shell">
      <Brand />
      <span>© {new Date().getFullYear()} Zora</span>
      <a href="#top" aria-label="回到顶部">
        回到顶部
        <ArrowUpRight />
      </a>
    </footer>
  );
}

export function Site({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get("auth_error");
    if (!error) return;
    toast.error(oauthErrors[error] ?? oauthErrors.oauth_failed, { id: "github-login-error" });
    params.delete("auth_error");
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash }, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);
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
      location.pathname === "/blog"
        ? "博客 · Hi Zora"
        : location.pathname.startsWith("/articles/")
          ? `${articles.find((article) => `/articles/${article.slug}` === location.pathname)?.title ?? "文章"} · Hi Zora`
          : "Hi Zora · 前端开发与创造";
    const frame = requestAnimationFrame(() => {
      if (location.hash && location.hash !== "#top")
        document.getElementById(location.hash.slice(1))?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
      else {
        window.scrollTo({ top: 0, behavior: "instant" });
        document.querySelector(".home-page")?.scrollTo({ top: 0, behavior: "instant" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
  return (
    <div
      id="top"
      className={
        articles.some(
          (article) => location.pathname === `/articles/${article.slug}`,
        )
          ? "article-layout"
          : location.pathname === "/" ? "home-layout" : undefined
      }
    >
      <a href="#main-content" className="skip-link">
        跳转到主要内容
      </a>
      <Header onSearch={() => setSearchOpen(true)} />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      {location.pathname !== "/" && <Footer />}
      <SearchDialog open={searchOpen} setOpen={setSearchOpen} />
      <Toaster position="bottom-right" />
    </div>
  );
}
