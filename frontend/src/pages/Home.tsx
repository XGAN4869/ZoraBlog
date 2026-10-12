import { useCallback, useEffect, useRef } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { ShapeGrid } from "@/components/ShapeGrid";
import { ZoraRoom } from "@/components/ZoraRoom";
import "./Home.css";

export function Home() {
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const scrollRef = useRef<HTMLElement>(null);
  const draggingRef = useRef(false);
  const onDragChange = useCallback((dragging: boolean) => {
    draggingRef.current = dragging;
    if (scrollRef.current) scrollRef.current.dataset.dragging = String(dragging);
  }, []);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const preventScrollDuringDrag = (event: WheelEvent) => {
      if (draggingRef.current) event.preventDefault();
    };
    scroll.addEventListener("wheel", preventScrollDuringDrag, { passive: false });
    return () => scroll.removeEventListener("wheel", preventScrollDuringDrag);
  }, []);

  if (location.hash === "#articles" || location.hash === "#notes") {
    return <Navigate replace to={location.hash === "#notes" ? "/blog?category=手记" : "/blog"} />;
  }

  return (
    <main className="home-page" ref={scrollRef} aria-label="Zora 的个人空间" tabIndex={-1}>
      <section className="hero home-screen" id="hello" aria-label="Hi Zora">
        <ShapeGrid light={resolvedTheme === "light"} />
        <div className="grid-shade" />
        <div className="hero-margin left">
          <span>PERSONAL JOURNAL / 2026</span>
        </div>
        <div className="hero-margin right">
          <span>BUILD. LEARN. SHARE.</span>
        </div>
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
        >
          <div className="hero-eyebrow">
            <span className="status-dot" />A FRONTEND DEVELOPER'S JOURNAL
            <span className="eyebrow-end">/ 01</span>
          </div>
          <h1>
            Hi, I'm <span>Zora</span>
            <span className="title-period">.</span>
          </h1>
          <h2>
            写代码，也写下思考<span className="text-cursor">_</span>
          </h2>
          <p>
            记录前端世界里的探索与实践。
            <br />
            把知识沉淀为文字，把想法变成作品。
          </p>
          <div className="hero-buttons">
            <Button asChild size="lg">
              <Link to="/blog">
                探索文章
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/#about">
                认识一下
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <div className="hero-stack">
            <span>WORKING WITH</span>
            <span>React</span>
            <span>Vue</span>
            <span>TypeScript</span>
            <span className="stack-plus">+</span>
          </div>
        </motion.div>
        <div className="hero-bottom shell">
          <span>
            <span className="tiny-cross">+</span> ALWAYS CURIOUS. ALWAYS
            BUILDING.
          </span>
          <Link to="/#room" className="scroll-link">
            ENTER MY SPACE
            <ArrowDown />
          </Link>
          <span className="hero-coordinate">A PERSONAL SPACE ON THE WEB</span>
        </div>
      </section>
      <ZoraRoom onDragChange={onDragChange} />
    </main>
  );
}
