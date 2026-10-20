import { useEffect, useRef } from "react";

type ShapeGridProps = { light: boolean; squareSize?: number; speed?: number; viewport?: boolean };

// Square-grid adaptation inspired by React Bits Shape Grid:
// https://reactbits.dev/backgrounds/shape-grid
// Uses DPR-aware rendering, elapsed time, and pauses outside the viewport.
export function ShapeGrid({
  light,
  squareSize = 68,
  speed = 5,
  viewport = false,
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
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const draw = (elapsed = 0) => {
      context.clearRect(0, 0, width, height);
      if (!reducedMotion.matches)
        offset = (offset + elapsed * speed) % squareSize;
      const drift = offset;
      context.lineWidth = 0.65;
      context.strokeStyle = light
        ? "rgba(102, 108, 118, 0.10)"
        : "rgba(185, 156, 132, 0.11)";
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

      // A few quiet illuminated cells add depth without competing with the copy.
      context.fillStyle = light
        ? "rgba(230, 130, 55, 0.025)"
        : "rgba(225, 132, 62, 0.035)";
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
      width = viewport ? window.innerWidth : bounds.width;
      height = viewport ? window.innerHeight : bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncAnimation();
    });
    intersection.observe(host);
    document.addEventListener("visibilitychange", syncAnimation);
    reducedMotion.addEventListener("change", syncAnimation);
    resize();
    syncAnimation();

    return () => {
      stop();
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      reducedMotion.removeEventListener("change", syncAnimation);
    };
  }, [light, squareSize, speed, viewport]);

  return <canvas className="shape-grid" ref={canvasRef} aria-hidden="true" />;
}
