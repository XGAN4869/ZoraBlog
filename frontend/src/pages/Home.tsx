import { Link, Navigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "@/lib/theme";
import { InteractiveHoverButton } from "@/registry/magicui/interactive-hover-button";
import { AnimatedSpan, Terminal, TypingAnimation } from "@/registry/magicui/terminal";
import { ShapeGrid } from "@/components/ShapeGrid";
import "./Home.css";

export function Home() {
  const reducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const location = useLocation();

  if (location.hash === "#articles" || location.hash === "#notes") {
    return <Navigate replace to={location.hash === "#notes" ? "/blog?category=手记" : "/blog"} />;
  }
  if (["#room", "#projects", "#about"].includes(location.hash)) {
    return <Navigate replace to="/" />;
  }

  return (
    <main className="home-page" aria-label="Zora 的个人空间" tabIndex={-1}>
      <section className="hero home-screen" id="hello" aria-label="Hi Zora">
        <ShapeGrid light={resolvedTheme === "light"} />
        <div className="grid-shade" />
        <motion.div
          className="hero-content"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.75 }}
        >
          <Terminal className="hero-terminal">
            <TypingAnimation as="p" duration={55} className="hero-terminal-command">
              {"> link start"}
            </TypingAnimation>
            <AnimatedSpan className="hero-terminal-status">
              ✔ Loading your space.
            </AnimatedSpan>
            <AnimatedSpan className="hero-terminal-status">
              ✔ Preparing your stories.
            </AnimatedSpan>
            <TypingAnimation as="h1" duration={55} className="hero-terminal-greeting">
              Hi, Zora.
            </TypingAnimation>
            <TypingAnimation as="p" duration={35} className="hero-terminal-output">
              Here to explore your world, one moment at a time.
            </TypingAnimation>
          </Terminal>
          <div className="hero-buttons">
            <InteractiveHoverButton asChild className="w-[136px] md:w-40">
              <Link to="/blog">探索文章</Link>
            </InteractiveHoverButton>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
