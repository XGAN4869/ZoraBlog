import { useCallback, useEffect, useRef } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { InteractiveHoverButton } from "@/registry/magicui/interactive-hover-button";
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
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
        >
          <h1>
            Hi, I'm <span>Zora</span>
            <span className="title-period">.</span>
          </h1>
          <h2>
            写代码，也写下思考<span className="text-cursor">_</span>
          </h2>
          <div className="hero-buttons">
            <InteractiveHoverButton asChild className="w-[136px] md:w-40">
              <Link to="/blog">探索文章</Link>
            </InteractiveHoverButton>
            <Button asChild variant="outline" size="lg">
              <Link to="/#about">
                认识一下
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </motion.div>
        <div className="hero-bottom shell">
          <Link to="/#room" className="scroll-link">
            进入房间
            <ArrowDown />
          </Link>
        </div>
      </section>
      <ZoraRoom onDragChange={onDragChange} />
    </main>
  );
}
