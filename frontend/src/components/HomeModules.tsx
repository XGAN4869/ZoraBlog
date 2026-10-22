import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, Code2, NotebookPen, Terminal } from "lucide-react";
import { articles } from "@/data/articles";
import { Button } from "@/components/ui/button";

const greeting = "Hi, Zora.";
const reflections = [
  { zh: "想走得更远，也想学会安心停留。", en: "I want to go further, and learn to feel at ease when I pause." },
  { zh: "保持好奇，给自己慢慢生长的时间。", en: "Stay curious, and give myself time to grow." },
  { zh: "认真写代码，也认真感受风吹过的傍晚。", en: "Write code with care, and feel the evening breeze." },
  { zh: "想和在意的人，分享普通又珍贵的一天。", en: "Share an ordinary, precious day with the people I care about." },
  { zh: "世界很大，想按自己的步调去看看。", en: "The world is wide. I want to explore it at my own pace." },
];

type IntroductionFrame = {
  phase: "greeting" | "writing" | "holding" | "erasing";
  characters: number;
  reflection: number;
};

function Introduction() {
  const reducedMotion = useReducedMotion();
  const [frame, setFrame] = useState<IntroductionFrame>({ phase: "greeting", characters: 0, reflection: 0 });
  const reflection = reflections[frame.reflection];

  useEffect(() => {
    if (reducedMotion) return;
    const delay = frame.phase === "holding" ? 6500
      : frame.characters === 0 ? 350
      : frame.phase === "greeting" ? 105
      : frame.phase === "erasing" ? 18
      : frame.characters >= reflection.zh.length ? 28 : 80;
    const timer = window.setTimeout(() => {
      setFrame((current) => {
        if (current.phase === "holding") return { ...current, phase: "erasing" };
        if (current.phase === "erasing") {
          return current.characters > 1
            ? { ...current, characters: current.characters - 1 }
            : { phase: "writing", characters: 0, reflection: (current.reflection + 1) % reflections.length };
        }
        const nextReflection = reflections[current.reflection];
        const length = current.phase === "greeting" ? greeting.length : nextReflection.zh.length + nextReflection.en.length;
        if (current.characters < length) return { ...current, characters: current.characters + 1 };
        return current.phase === "greeting"
          ? { ...current, phase: "writing", characters: 0 }
          : { ...current, phase: "holding" };
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [frame, reducedMotion, reflection]);

  const greetingComplete = !!reducedMotion || frame.phase !== "greeting" || frame.characters === greeting.length;
  const greetingText = reducedMotion || frame.phase !== "greeting" ? greeting : greeting.slice(0, frame.characters);
  const displayedReflection = reducedMotion ? reflections[0] : reflection;
  const reflectionCharacters = frame.phase === "greeting" ? 0 : frame.characters;
  const chineseText = reducedMotion ? displayedReflection.zh : reflection.zh.slice(0, reflectionCharacters);
  const englishText = reducedMotion ? displayedReflection.en : reflection.en.slice(0, Math.max(0, reflectionCharacters - reflection.zh.length));
  const cursorOnChinese = reflectionCharacters < reflection.zh.length;
  const showReflectionCursor = !reducedMotion && frame.phase !== "greeting";

  return (
    <>
      <h1 className="cmd-greeting" aria-label={greeting} data-typing-complete={greetingComplete}>
        <span aria-hidden="true">{greetingText.replace(/\.$/, "")}</span>
        <span className="cmd-greeting-dot" aria-hidden="true">{greetingText.endsWith(".") ? "." : ""}</span>
        {!greetingComplete && <span className="cmd-cursor cmd-greeting-cursor" aria-hidden="true" />}
      </h1>
      <p className="cmd-description" data-typing-phase={reducedMotion ? "static" : frame.phase}>
        <span className="sr-only" lang="zh-CN">{displayedReflection.zh}</span>
        <span className="sr-only" lang="en">{displayedReflection.en}</span>
        <span className="cmd-reflection-zh" lang="zh-CN" aria-hidden="true">
          {chineseText}
          {showReflectionCursor && cursorOnChinese && <span className="cmd-cursor cmd-reflection-cursor" />}
        </span>
        <span className="cmd-reflection-en" lang="en" aria-hidden="true">
          {englishText}
          {showReflectionCursor && !cursorOnChinese && <span className="cmd-cursor cmd-reflection-cursor" />}
        </span>
      </p>
    </>
  );
}

function CommandWindow() {
  return (
    <section className="home-module cmd-window" aria-label="Zora 终端">
      <div className="cmd-titlebar">
        <Terminal size={14} aria-hidden="true" />
        <span>zora@home: ~</span>
        <span className="cmd-window-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
      <div className="cmd-body">
        <p className="cmd-command"><span>❯</span> who am i</p>
        <Introduction />
        <p className="cmd-command"><span>❯</span> explore ./notes</p>
        <Button asChild variant="outline" className="cmd-explore">
          <Link to="/articles">探索文章 <ArrowRight /></Link>
        </Button>
      </div>
      <div className="cmd-status"><span>React / Vue / TypeScript</span><span>UTF-8</span></div>
    </section>
  );
}

function RecentNotes() {
  const recent = [...articles].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  return (
    <section className="home-module home-recent" aria-labelledby="home-recent-title">
      <div className="home-module-heading">
        <h2 id="home-recent-title">最近文章</h2>
        <Link to="/articles" aria-label="查看全部文章"><ArrowUpRight size={16} /></Link>
      </div>
      <div className="home-note-list">
        {recent.map((article) => (
          <Link key={article.slug} to={`/articles/${article.slug}`}>
            <span>{article.title}</span>
            <time dateTime={article.date.replaceAll(".", "-")}>{article.date.slice(5).replace(".", "/")}</time>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HomeModules() {
  return (
    <div className="home-module-grid">
      <CommandWindow />
      <RecentNotes />
      <div className="home-shortcuts">
        <Link className="home-module home-shortcut" to="/#projects">
          <Code2 aria-hidden="true" />
          <span>项目</span>
          <ArrowUpRight className="shortcut-arrow" aria-hidden="true" />
        </Link>
        <Link className="home-module home-shortcut" to="/#notes">
          <NotebookPen aria-hidden="true" />
          <span>手记</span>
          <ArrowUpRight className="shortcut-arrow" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
