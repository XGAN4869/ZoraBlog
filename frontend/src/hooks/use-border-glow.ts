import { useCallback, type PointerEvent } from "react";
import "@/components/BorderGlow.css";

// Edge proximity and directional glow inspired by React Bits Border Glow.
export function useBorderGlow() {
  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLAnchorElement>) => {
      if (event.pointerType === "touch") return;
      const card = event.currentTarget;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        card.style.setProperty("--glow-strength", "0.6");
        card.style.setProperty("--glow-angle", "45deg");
        return;
      }
      const bounds = card.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      const edge = Math.max(
        Math.abs(x) / (bounds.width / 2),
        Math.abs(y) / (bounds.height / 2),
      );
      const strength =
        0.25 + 0.75 * Math.min(1, Math.max(0, (edge - 0.45) / 0.55));
      const angle = ((Math.atan2(y, x) * 180) / Math.PI + 450) % 360;
      card.style.setProperty("--glow-strength", strength.toFixed(3));
      card.style.setProperty("--glow-angle", `${angle.toFixed(2)}deg`);
    },
    [],
  );

  const onPointerLeave = useCallback(
    (event: PointerEvent<HTMLAnchorElement>) => {
      event.currentTarget.style.setProperty("--glow-strength", "0");
    },
    [],
  );

  return { onPointerMove, onPointerLeave };
}
