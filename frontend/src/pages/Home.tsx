import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Code2, FileCode2 } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { ShapeGrid } from "@/components/ShapeGrid";
import { HomeModules } from "@/components/HomeModules";
import { ArticleCard } from "@/components/ArticleCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categories, filterArticles } from "@/data/articles";
import "@/components/HomeModules.css";
import "@/components/HomeSections.css";

export function Home() {
  const [category, setCategory] = useState("全部");
  const { resolvedTheme } = useTheme();
  const visible = filterArticles("", category);
  return (
    <main className="home-page" aria-label="Zora 的个人空间">
      <ShapeGrid light={resolvedTheme === "light"} viewport />
      <div className="home-background-shade" aria-hidden="true" />
      <section className="hero home-modules"><HomeModules /></section>
      <div className="home-sections-layout">
        <div className="home-sections">
          <section className="articles-section shell section" id="articles">
            <div className="section-heading">
              <div><div className="section-kicker"><span>01</span> / THE JOURNAL</div><h2>最近写下的<span className="blue-period">.</span></h2></div>
              <Link className="home-directory-link" to="/articles">文章目录 <ArrowUpRight size={14} /></Link>
            </div>
            <Tabs value={category} onValueChange={setCategory}>
              <div className="article-filter">
                <TabsList aria-label="文章分类">{categories.map((item) => <TabsTrigger key={item} value={item}>{item}</TabsTrigger>)}</TabsList>
                <span className="result-count">{String(visible.length).padStart(2, "0")} 篇文章</span>
              </div>
              <TabsContent value={category}>
                <div className="article-grid">{visible.slice(0, 6).map((article, index) => <ArticleCard key={article.slug} article={article} index={index} />)}</div>
                {visible.length > 6 && <Link className="home-directory-link home-explore-more" to={`/blog?category=${encodeURIComponent(category)}`}>探索更多 <ArrowUpRight size={14} /></Link>}
              </TabsContent>
            </Tabs>
          </section>
          <section id="notes" className="notes-section shell section">
            <div className="section-heading"><div><div className="section-kicker"><span>02</span> / SMALL THOUGHTS</div><h2>思考的片刻<span className="blue-period">.</span></h2></div></div>
            <Link className="note-row" to="/articles/learning-by-writing">
              <span className="note-date">2026 / 09 / 20</span>
              <div><span className="category-label">学习手记</span><h3>把学到的东西，变成自己的表达</h3><p>写下来，是为了下次做得更好。</p></div><ArrowUpRight />
            </Link>
          </section>
          <section id="projects" className="projects-section shell section">
            <div className="section-heading"><div><div className="section-kicker"><span>03</span> / SELECTED WORK</div><h2>想法的落点<span className="blue-period">.</span></h2></div></div>
            <div className="project-list">
              <Link to="/articles/vue-composable-state" className="project-row">
                <div className="project-number">01</div><div className="project-icon"><FileCode2 /></div>
                <div className="project-info"><h3>Vite Ku Zora</h3><p>把日常开发中的组件与组合式函数，整理成自己的工具箱。</p></div>
                <div className="project-tags"><span>Vue</span><span>VitePress</span></div><ArrowUpRight />
              </Link>
              <Link to="/articles/frontend-project-structure" className="project-row">
                <div className="project-number">02</div><div className="project-icon"><Code2 /></div>
                <div className="project-info"><h3>Hi Zora Blog</h3><p>一个关于技术、表达与持续成长的个人空间。</p></div>
                <div className="project-tags"><span>React</span><span>TypeScript</span></div><ArrowUpRight />
              </Link>
            </div>
          </section>
          <section className="about-section shell section" id="about">
            <div className="about-label"><span className="about-monogram">Z<span>.</span></span></div>
            <div className="about-copy"><span className="category-label">关于我</span><h2>保持好奇，<br />认真创造。</h2>
              <p>我是 Zora，一名前端开发工程师。<br />喜欢清晰的代码，也喜欢有温度的设计。这里是我的知识记录，<br className="desktop-break" />也是持续学习、分享和创造的地方。</p>
              <div className="about-interests"><span>前端开发</span><span>工程实践</span><span>交互设计</span><span>持续学习</span></div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
