// Adapted from Magic UI Terminal (MIT): https://magicui.design/docs/components/terminal
// Keep automatic sequencing; use semantic content and respect reduced motion.
/*
MIT License

Copyright (c) Magic UI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import {
  Children, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ComponentType, type ReactNode, type RefAttributes,
} from "react";
import { motion, useInView, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

interface SequenceContextValue {
  activeIndex: number;
  started: boolean;
  completeItem: (index: number) => void;
}

const SequenceContext = createContext<SequenceContextValue | null>(null);
const ItemIndexContext = createContext<number | null>(null);

export function AnimatedSpan({
  children, className, delay = 0, startOnView = false, onAnimationComplete, ...props
}: HTMLMotionProps<"div"> & { delay?: number; startOnView?: boolean }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(elementRef, { amount: 0.3, once: true });
  const reducedMotion = useReducedMotion();
  const sequence = useContext(SequenceContext);
  const index = useContext(ItemIndexContext);
  const visible = !!reducedMotion || (sequence && index !== null
    ? sequence.started && sequence.activeIndex >= index
    : !startOnView || isInView);

  return (
    <motion.div
      {...props}
      ref={elementRef}
      className={cn("grid text-sm font-normal tracking-tight", className)}
      initial={reducedMotion ? false : { opacity: 0, y: -5 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: -5 }}
      transition={{ duration: reducedMotion ? 0 : 0.3, delay: reducedMotion || sequence ? 0 : delay / 1000 }}
      onAnimationComplete={(definition) => {
        if (visible && sequence && index !== null) sequence.completeItem(index);
        onAnimationComplete?.(definition);
      }}
    >
      {children}
    </motion.div>
  );
}

const motionElements = { span: motion.span, p: motion.p, h1: motion.h1, h2: motion.h2 };
type TypingComponent = ComponentType<Omit<HTMLMotionProps<"span">, "ref"> & RefAttributes<HTMLElement>>;

export function TypingAnimation({
  children, className, duration = 60, delay = 0, as = "span", startOnView = true, ...props
}: Omit<HTMLMotionProps<"span">, "children" | "ref"> & {
  children: string;
  duration?: number;
  delay?: number;
  as?: keyof typeof motionElements;
  startOnView?: boolean;
}) {
  const elementRef = useRef<HTMLElement>(null);
  const isInView = useInView(elementRef, { amount: 0.3, once: true });
  const reducedMotion = useReducedMotion();
  const sequence = useContext(SequenceContext);
  const index = useContext(ItemIndexContext);
  const [characters, setCharacters] = useState(0);
  const hasSequence = sequence !== null;
  const shouldStart = sequence && index !== null
    ? sequence.started && sequence.activeIndex >= index
    : !startOnView || isInView;
  const completeItem = sequence?.completeItem;

  useEffect(() => {
    if (!shouldStart || reducedMotion) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let count = 0;
    const startTimer = setTimeout(() => {
      timer = setInterval(() => {
        count += 1;
        setCharacters(count);
        if (count >= children.length) {
          clearInterval(timer);
          if (index !== null) completeItem?.(index);
        }
      }, Math.max(1, duration));
    }, hasSequence ? 0 : delay);
    return () => {
      clearTimeout(startTimer);
      clearInterval(timer);
    };
  }, [children, duration, delay, shouldStart, reducedMotion, completeItem, index, hasSequence]);

  const Component = motionElements[as] as TypingComponent;
  const text = reducedMotion ? children : children.slice(0, characters);
  return (
    <Component
      {...props}
      ref={elementRef}
      className={cn("text-sm font-normal tracking-tight", className)}
      aria-label={props["aria-label"] ?? children}
      data-typing-complete={text === children}
    >
      <span aria-hidden="true">{text}</span>
      <span className="terminal-cursor" aria-hidden="true" />
    </Component>
  );
}

export function Terminal({
  children, className, sequence = true, startOnView = true,
}: { children: ReactNode; className?: string; sequence?: boolean; startOnView?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { amount: 0.3, once: true });
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const completeItem = useCallback((index: number) => {
    setActiveIndex((current) => index === current ? current + 1 : current);
  }, []);
  const sequenced = sequence && !reducedMotion;
  const started = !startOnView || isInView;
  const context = useMemo<SequenceContextValue | null>(() => sequenced
    ? { activeIndex, started, completeItem }
    : null, [sequenced, activeIndex, started, completeItem]);

  return (
    <SequenceContext.Provider value={context}>
      <div ref={containerRef} data-slot="terminal" className={cn("rounded-xl border border-border bg-background", className)}>
        <div data-slot="terminal-header" className="border-b border-border p-4" aria-hidden="true">
          <div className="flex gap-2">
            <div className="size-2 rounded-full bg-red-500" />
            <div className="size-2 rounded-full bg-yellow-500" />
            <div className="size-2 rounded-full bg-green-500" />
          </div>
        </div>
        <div data-slot="terminal-content" className="grid gap-2 p-4">
          {sequenced ? Children.toArray(children).map((child, index) => (
            <ItemIndexContext.Provider key={index} value={index}>{child}</ItemIndexContext.Provider>
          )) : children}
        </div>
      </div>
    </SequenceContext.Provider>
  );
}
