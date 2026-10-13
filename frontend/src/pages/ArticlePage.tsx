import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Copy, List } from "lucide-react";
import { toast } from "sonner";
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
import { ArticleCard, Cover } from "@/components/ArticleCard";
import { IconAction } from "@/components/IconAction";
import { NotFound } from "@/pages/NotFound";
import { articles } from "@/data/articles";

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="code-block">
      <div>
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

export function ArticlePage() {
  const { slug } = useParams();
  const [outlineOpen, setOutlineOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const article = articles.find((item) => item.slug === slug);
  if (!article) return <NotFound />;
  const related = articles.filter((item) => item.slug !== slug).slice(0, 3);
  return (
    <main className="article-page shell">
      <SidebarProvider className="article-reading-shell">
        <ArticleDirectory slug={article.slug} />
        <div className="reading-toolbar">
          <Link to="/#articles" className="back-link">
            <ArrowLeft />
            全部文章
          </Link>
          <div className="reading-tools">
            <SidebarTrigger
              className="mobile-directory-trigger"
              aria-label="打开文章目录"
            />
            <Button
              variant="ghost"
              size="icon"
              className="mobile-outline-trigger"
              aria-label="打开文章大纲"
              onClick={() => setOutlineOpen(true)}
            >
              <List />
            </Button>
          </div>
        </div>
        <motion.div
          key={article.slug}
          className="reading-layout"
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
            <p className="article-lead">{article.summary}</p>
            <div className="author-line">
              <span className="mini-avatar">Z.</span>
              <span>Zora</span>
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
