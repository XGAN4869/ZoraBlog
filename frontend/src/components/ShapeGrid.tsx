import { useEffect, useRef } from "react";

type ShapeGridProps = { light: boolean; squareSize?: number; speed?: number };

// Square-grid adaptation inspired by React Bits Shape Grid:
// https://reactbits.dev/backgrounds/shape-grid
// Uses DPR-aware rendering, elapsed time, and pauses outside the viewport.
export function ShapeGrid({
  light,
  squareSize = 68,
  speed = 5,
}: ShapeGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const host = canvas?.parentElement;
    if (!canvas || !context || !host) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = 0;
    let offset = 0;
    let visible = true;
    let pointer: { x: number; y: number } | null = null;
    const cells = new Map<string, { x: number; y: number; alpha: number }>();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const draw = (elapsed = 0) => {
      context.clearRect(0, 0, width, height);
      if (!reducedMotion.matches)
        offset = (offset + elapsed * speed) % squareSize;
      const drift = offset;
      context.lineWidth = 0.65;
      context.strokeStyle = light
        ? "rgba(41, 66, 117, 0.13)"
        : "rgba(138, 163, 203, 0.14)";
      context.beginPath();
      for (let x = drift; x < width; x += squareSize) {
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let y = drift; y < height; y += squareSize) {
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.stroke();

      if (pointer) {
        const x = Math.floor((pointer.x - drift) / squareSize);
        const y = Math.floor((pointer.y - drift) / squareSize);
        cells.set(`${x},${y}`, { x, y, alpha: 0.32 });
      }
      for (const [key, cell] of cells) {
        cell.alpha *= Math.exp(-elapsed * 3);
        if (cell.alpha < 0.008) {
          cells.delete(key);
          continue;
        }
        context.fillStyle = `rgba(${light ? "75, 120, 230" : "61, 119, 242"}, ${cell.alpha})`;
        context.fillRect(
          cell.x * squareSize + drift,
          cell.y * squareSize + drift,
          squareSize,
          squareSize,
        );
      }

      // A few quiet illuminated cells add depth without competing with the copy.
      context.fillStyle = light
        ? "rgba(70, 112, 228, 0.06)"
        : "rgba(79, 125, 237, 0.07)";
      for (const [x, y] of [
        [0.17, 0.24],
        [0.78, 0.2],
        [0.87, 0.65],
        [0.25, 0.76],
      ]) {
        context.fillRect(
          Math.floor((width * x) / squareSize) * squareSize + drift,
          Math.floor((height * y) / squareSize) * squareSize + drift,
          squareSize,
          squareSize,
        );
      }
    };

    const animate = (time: number) => {
      const elapsed = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
      previous = time;
      draw(elapsed);
      frame = requestAnimationFrame(animate);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    };
    const syncAnimation = () => {
      stop();
      draw();
      if (visible && !document.hidden && !reducedMotion.matches)
        frame = requestAnimationFrame(animate);
    };
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const bounds = host.getBoundingClientRect();
      pointer = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      if (reducedMotion.matches) draw();
    };
    const leave = () => {
      pointer = null;
      if (reducedMotion.matches) {
        cells.clear();
        draw();
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncAnimation();
    });
    intersection.observe(host);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", syncAnimation);
    reducedMotion.addEventListener("change", syncAnimation);
    resize();
    syncAnimation();

    return () => {
      stop();
      observer.disconnect();
      intersection.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", syncAnimation);
      reducedMotion.removeEventListener("change", syncAnimation);
    };
  }, [light, squareSize, speed]);

  return <canvas className="shape-grid" ref={canvasRef} aria-hidden="true" />;
}
