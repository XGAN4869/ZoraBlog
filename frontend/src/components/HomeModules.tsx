import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Code2, NotebookPen, Terminal } from "lucide-react";
import { articles } from "@/data/articles";
import { Button } from "@/components/ui/button";

function CommandWindow() {
  return (
    <section className="home-module cmd-window" aria-label="Zora 终端">
      <div className="cmd-titlebar">
        <Terminal size={14} aria-hidden="true" />
        <span>zora@home: ~</span>
        <span className="cmd-window-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
      <div className="cmd-body">
        <p className="cmd-command"><span>❯</span> whoami</p>
        <h1>Hi, Zora<span>.</span></h1>
        <p className="cmd-description">前端开发者</p>
        <p className="cmd-command cmd-next"><span>❯</span> explore ./notes<span className="cmd-cursor" aria-hidden="true" /></p>
        <Button asChild variant="outline" className="cmd-explore">
          <Link to="/articles">探索文章 <ArrowRight /></Link>
        </Button>
      </div>
      <div className="cmd-status"><span>React / Vue / TypeScript</span><span>UTF-8</span></div>
    </section>
  );
}

function RecentNotes() {
  const recent = [...articles].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  return (
    <section className="home-module home-recent" aria-labelledby="home-recent-title">
      <div className="home-module-heading">
        <h2 id="home-recent-title">最近文章</h2>
        <Link to="/articles" aria-label="查看全部文章"><ArrowUpRight size={16} /></Link>
      </div>
      <div className="home-note-list">
        {recent.map((article) => (
          <Link key={article.slug} to={`/articles/${article.slug}`}>
            <span>{article.title}</span>
            <time dateTime={article.date.replaceAll(".", "-")}>{article.date.slice(5).replace(".", "/")}</time>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HomeModules() {
  return (
    <div className="home-module-grid">
      <CommandWindow />
      <RecentNotes />
      <div className="home-shortcuts">
        <Link className="home-module home-shortcut" to="/#projects">
          <Code2 aria-hidden="true" />
          <span>项目</span>
          <ArrowUpRight className="shortcut-arrow" aria-hidden="true" />
        </Link>
        <Link className="home-module home-shortcut" to="/#notes">
          <NotebookPen aria-hidden="true" />
          <span>手记</span>
          <ArrowUpRight className="shortcut-arrow" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
