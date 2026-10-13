import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticleCard } from "@/components/ArticleCard";
import { categories, filterArticles } from "@/data/articles";

export function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("category") ?? "全部";
  const category = categories.includes(requested) ? requested : "全部";
  const setCategory = (value: string) => setSearchParams(value === "全部" ? {} : { category: value });
  const visible = filterArticles("", category);
  return (
    <main className="blog-page">
      <Link className="blog-back shell" to="/#room"><ArrowLeft size={14} /> 回到 Zora's Room</Link>
      <section className="articles-section shell section" id="articles">
        <div className="section-heading">
          <div>
            <h2>
              最近写下的<span className="blue-period">.</span>
            </h2>
          </div>
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
              {visible.length} 篇文章
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
    </main>
  );
}
