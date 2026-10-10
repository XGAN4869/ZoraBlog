import { useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

export const DIRECTORY_EASE: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
];

export function useDirectoryMotion(open: boolean, isMobile: boolean) {
  const ref = useRef<HTMLElement>(null);
  const initialized = useRef(false);
  const reducedMotion = !!useReducedMotion();

  useLayoutEffect(() => {
    const layout = document.getElementById("top");
    const panel = ref.current?.closest<HTMLElement>(
      '[data-slot="sidebar-container"]',
    );
    if (!layout) return;
    if (isMobile) {
      layout.style.removeProperty("--reading-sidebar-width");
      initialized.current = false;
      return;
    }
    if (!panel) return;
    const width = open ? 256 : 48;

    // Keep the shadcn panel and document layout on the same animation timeline.
    if (!initialized.current || reducedMotion) {
      panel.style.width = `${width}px`;
      layout.style.setProperty("--reading-sidebar-width", `${width}px`);
      initialized.current = true;
      return;
    }
    const animation = animate(panel.getBoundingClientRect().width, width, {
      duration: 0.32,
      ease: DIRECTORY_EASE,
      onUpdate: (value) => {
        panel.style.width = `${value}px`;
        layout.style.setProperty("--reading-sidebar-width", `${value}px`);
      },
    });
    return () => {
      animation.stop();
    };
  }, [open, isMobile, reducedMotion]);

  useLayoutEffect(() => {
    const layout = document.getElementById("top");
    return () => {
      layout?.style.removeProperty("--reading-sidebar-width");
    };
  }, []);

  return { ref, reducedMotion };
}
