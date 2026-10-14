import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Download, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/base/sidebar";
import { ArticleDirectory } from "@/components/ArticleDirectory";
import { ArticleOutline } from "@/components/ArticleOutline";
import { Cover } from "@/components/ArticleCard";
import { CodeBlock } from "@/components/CodeBlock";
import { MarkdownArticle } from "@/components/MarkdownArticle";
import { NotFound } from "@/pages/NotFound";
import { articles } from "@/data/articles";
import { readingArticles } from "@/data/navigation";

export function ArticlePage() {
  const { slug } = useParams();
  const [outlineOpen, setOutlineOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const article = articles.find((item) => item.slug === slug);
  if (!article) return <NotFound />;
  const index = readingArticles.findIndex((item) => item.slug === slug);
  const previous = readingArticles[index - 1];
  const next = readingArticles[index + 1];
  return (
    <main className="article-page shell">
      <SidebarProvider className="article-reading-shell">
        <ArticleDirectory slug={article.slug} />
        <div className="reading-toolbar">
          <Link to="/" className="back-link">
            <ArrowLeft />
            返回首页
          </Link>
          <div className="reading-tools">
            {article.markdownUrl && <Button asChild variant="ghost" size="sm"><a href={article.markdownUrl} download={`${article.slug}.md`} aria-label="下载 Markdown"><Download />Markdown</a></Button>}
            <SidebarTrigger
              className="mobile-directory-trigger"
              aria-label="打开文章目录"
            />
            {article.sections.length > 0 && <Button
              variant="ghost"
              size="icon"
              className="mobile-outline-trigger"
              aria-label="打开文章大纲"
              onClick={() => setOutlineOpen(true)}
            >
              <List />
            </Button>}
          </div>
        </div>
        <motion.div
          key={article.slug}
          className={`reading-layout${article.sections.length ? "" : " no-outline"}`}
          initial={{
            opacity: reducedMotion ? 1 : 0,
            y: reducedMotion ? 0 : 16,
          }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.28,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <article className="reading-content">
            <div className="article-meta">
              <span className="category-label">{article.category}</span>
              <span>
                {article.date} · {article.readTime} 分钟阅读
              </span>
            </div>
            <h1>{article.title}</h1>
            {article.summary && <p className="article-lead">{article.summary}</p>}
            <div className="author-line">
              <span className="mini-avatar">Z.</span>
              <span>Zora</span>
              {!article.markdown && <span className="sample-label">示例文章</span>}
            </div>
            <Cover article={article} />
            {article.markdown ? <MarkdownArticle article={article} /> : <div className="article-prose">
              {article.sections.map((section, index) => (
                <section key={section.heading} id={`section-${index}`}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.code && <CodeBlock code={section.code} language={{ React: "tsx", TypeScript: "ts", Vue: "ts", CSS: "css", Go: "go" }[article.category]} />}
                </section>
              ))}
            </div>}
            <nav className="article-pagination" aria-label="文章翻页">
              {previous && <Link className="page-link previous-page" to={`/articles/${previous.slug}`} rel="prev" aria-label={`Previous: ${previous.title}`}>
                <span>Previous</span><strong>{previous.title}</strong>
              </Link>}
              {next && <Link className="page-link next-page" to={`/articles/${next.slug}`} rel="next" aria-label={`Next: ${next.title}`}>
                <span>Next</span><strong>{next.title}</strong>
              </Link>}
            </nav>
          </article>
          <ArticleOutline key={article.slug} article={article} />
        </motion.div>
        <Dialog open={outlineOpen} onOpenChange={setOutlineOpen}>
          <DialogContent className="outline-dialog">
            <DialogHeader>
              <DialogTitle>本页大纲</DialogTitle>
              <DialogDescription>{article.title}</DialogDescription>
            </DialogHeader>
            <ArticleOutline
              article={article}
              onNavigate={() => setOutlineOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </main>
  );
}
