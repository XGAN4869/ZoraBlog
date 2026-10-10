import { useEffect, useState } from "react";
import type { Article } from "@/data/articles";

export function ArticleOutline({
  article,
  onNavigate,
}: {
  article: Article;
  onNavigate?: () => void;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    // Recompute from scroll position so headings stay accurate in either direction.
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const offset =
          document.querySelector(".site-header")!.getBoundingClientRect()
            .bottom + 26;
        let current = 0;
        article.sections.forEach((_, index) => {
          const heading = document.getElementById(`section-${index}`);
          if (heading && heading.getBoundingClientRect().top <= offset)
            current = index;
        });
        setActive(current);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [article]);

  return (
    <nav className="table-of-contents" aria-label="文章大纲">
      <span className="outline-heading">本页大纲</span>
      {article.sections.map((section, index) => (
        <a
          key={section.heading}
          href={`#section-${index}`}
          aria-current={active === index ? "location" : undefined}
          onClick={() => {
            setActive(index);
            onNavigate?.();
          }}
        >
          {section.heading}
        </a>
      ))}
    </nav>
  );
}
