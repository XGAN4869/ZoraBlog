import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import type { Article } from "@/data/articles";
import { markdownArticleHref, markdownAssetHref } from "@/data/notes";
import { remarkArticleHeadings } from "@/lib/markdown";
import { remarkObsidian } from "@/lib/obsidian";
import { CodeBlock } from "@/components/CodeBlock";
import "./MarkdownArticle.css";

export function MarkdownArticle({ article }: { article: Article }) {
  return (
    <div className="article-prose markdown-prose">
      <Markdown skipHtml remarkPlugins={[remarkGfm, [remarkArticleHeadings, { title: article.title }],
        [remarkObsidian, { resolve: (target: string, image: boolean) => image
          ? markdownAssetHref(target, article.source)
          : markdownArticleHref(target, article.source, true) ?? markdownAssetHref(target, article.source) }]]}
        components={{
          pre({ node, children }) {
            const code = node?.children.find((child) => child.type === "element" && child.tagName === "code");
            if (!code || code.type !== "element") return <pre>{children}</pre>;
            const content = code.children.map((child) => child.type === "text" ? child.value : "").join("").replace(/\n$/, "");
            const classes = Array.isArray(code.properties.className) ? code.properties.className : [];
            const language = classes.find((name) => typeof name === "string" && name.startsWith("language-"))?.toString().slice(9);
            return <CodeBlock code={content} language={language} />;
          },
          a({ href, children, title }) {
            const target = href?.startsWith("/articles/") ? href : markdownArticleHref(href ?? "", article.source);
            const asset = markdownAssetHref(href ?? "", article.source);
            return target ? <Link to={target} title={title}>{children}</Link> : <a href={asset ?? href} title={title} download={asset ? "" : undefined}>{children}</a>;
          },
          img({ src, alt, width }) {
            return <img src={markdownAssetHref(src ?? "", article.source) ?? src} alt={alt ?? ""} width={width} loading="lazy" decoding="async" />;
          },
        }}
      >{article.markdown ?? ""}</Markdown>
    </div>
  );
}
