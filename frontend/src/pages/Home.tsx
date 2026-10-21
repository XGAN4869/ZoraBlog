import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowUpRight, Code2, FileCode2 } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { ShapeGrid } from "@/components/ShapeGrid";
import { HomeModules } from "@/components/HomeModules";
import { ArticleCard } from "@/components/ArticleCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categories, filterArticles } from "@/data/articles";
import "@/components/HomeModules.css";
import "@/components/HomeSections.css";

const skills = [
  { name: "Vue", level: "熟练", rank: "03", strength: 80 },
  { name: "React", level: "入门", rank: "01", strength: 25 },
  { name: "Go", level: "入门", rank: "01", strength: 25 },
  { name: "TypeScript", level: "一般", rank: "02", strength: 50 },
  { name: "Node.js", level: "入门", rank: "01", strength: 25 },
] as const;

export function Home() {
  const [category, setCategory] = useState("全部");
  const reducedMotion = useReducedMotion();
  const skillsRef = useRef<HTMLElement>(null);
  const skillsInView = useInView(skillsRef, { once: true, amount: 0.3 });
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
          <section className="about-section shell section" id="about" ref={skillsRef}>
            <div className="section-heading skill-section-heading">
              <div><div className="section-kicker"><span>04</span> / TECH STACK</div><h2>技术栈强度<span className="blue-period">.</span></h2></div>
              <span className="skill-count">05 项技术</span>
            </div>
            <div className="skill-chart" aria-label="技术栈熟练度">
              <p className="skill-caption">持续学习，持续构建。</p>
              <div className="skill-chart-head" aria-hidden="true">
                <span>TECH / 技术</span><span>PROFICIENCY / 强度</span><span>LVL / 等级</span>
              </div>
              <ul className="skill-list">
                {skills.map((skill, index) => (
                  <li className="skill-row" key={skill.name}>
                    <span className="skill-name">{skill.name}</span>
                    <span className="skill-track" role="meter" aria-label={`${skill.name}：${skill.level}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={skill.strength}>
                      <motion.span
                        className="skill-fill"
                        style={{ width: `${skill.strength}%`, transformOrigin: "left center" }}
                        initial={{ scaleX: reducedMotion ? 1 : 0 }}
                        animate={{ scaleX: reducedMotion || skillsInView ? 1 : 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.65, delay: reducedMotion ? 0 : index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </span>
                    <span className="skill-rating"><strong>{skill.rank}</strong><span>{skill.level}</span></span>
                  </li>
                ))}
              </ul>
              <div className="skill-card-foot">01 入门 / 02 一般 / 03 熟练</div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
