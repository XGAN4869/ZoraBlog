import { useRef, type ComponentPropsWithoutRef } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AnimatedThemeTogglerProps = ComponentPropsWithoutRef<"button"> & {
  duration?: number;
};

// Adapted from https://magicui.design/r/animated-theme-toggler.json.
export function AnimatedThemeToggler({
  duration = 400,
  onClick,
  ...props
}: AnimatedThemeTogglerProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const transitioning = useRef(false);
  const isDark = resolvedTheme === "dark";
  const label = `切换到${isDark ? "亮" : "暗"}色主题`;

  async function toggleTheme() {
    const button = buttonRef.current;
    if (!button || transitioning.current) return;

    const root = document.documentElement;
    const nextTheme = isDark ? "light" : "dark";
    const applyTheme = () => {
      // Commit both the DOM and React state before the new snapshot is taken.
      flushSync(() => {
        root.classList.toggle("dark", nextTheme === "dark");
        setTheme(nextTheme);
      });
    };

    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      duration <= 0
    ) {
      applyTheme();
      return;
    }

    const { left, top, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const radius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y),
    );
    // Percentages also align the reveal on fractional Windows display scales.
    const center = `${(x / viewportWidth) * 100}% ${(y / viewportHeight) * 100}%`;
    const radiusPercent =
      (radius / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100;
    const clipPath = [
      `circle(0% at ${center})`,
      `circle(${radiusPercent}% at ${center})`,
    ];

    transitioning.current = true;
    root.dataset.themeTransition = "active";
    root.style.setProperty("--theme-transition-duration", `${duration}ms`);
    root.style.setProperty("--theme-transition-clip-from", clipPath[0]);
    let animation: Animation | undefined;
    let transition: ViewTransition | undefined;
    try {
      transition = document.startViewTransition(applyTheme);
      // Observe completion immediately, including when snapshots are skipped.
      const finished = transition.finished.catch(() => {});
      await transition.ready;
      animation = root.animate(
        { clipPath },
        {
          duration,
          easing: "ease-in-out",
          fill: "forwards",
          pseudoElement: "::view-transition-new(root)",
        },
      );
      await finished;
    } catch {
      transition?.skipTransition();
      // A skipped transition still runs its update; only a synchronous failure
      // to start one needs an immediate theme update.
      if (!transition) applyTheme();
      await transition?.finished.catch(() => {});
    } finally {
      animation?.cancel();
      delete root.dataset.themeTransition;
      root.style.removeProperty("--theme-transition-duration");
      root.style.removeProperty("--theme-transition-clip-from");
      transitioning.current = false;
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          {...props}
          ref={buttonRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={(event) => {
            onClick?.(event);
            if (!event.defaultPrevented) void toggleTheme();
          }}
        >
          {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
