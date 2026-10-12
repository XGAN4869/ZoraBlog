import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowUpRight, Layers3, Terminal } from "lucide-react";
import { useBorderGlow } from "@/hooks/use-border-glow";
import { articles, type Article } from "@/data/articles";
import reactLogo from "@/assets/react.svg";

export function Cover({ article }: { article: Article }) {
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

export function ArticleCard({ article, index }: { article: Article; index: number }) {
  const glow = useBorderGlow();
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
    >
      <Link
        className="article-card border-glow-card"
        to={`/articles/${article.slug}`}
        {...glow}
      >
        <span className="border-glow-edge" aria-hidden="true" />
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
