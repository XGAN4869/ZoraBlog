import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { animate, motion, useDragControls, useMotionValue, useReducedMotion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type ObjectProps = {
  id: "blog" | "projects" | "about";
  label: string;
  index: number;
  title: string;
  description: string;
  to?: string;
  onDragChange: (dragging: boolean) => void;
};

function RoomObject({ id, label, index, title, description, to, onDragChange }: ObjectProps) {
  const boundsRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  const controls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reduced = useReducedMotion();
  const [dragging, setDragging] = useState(false);
  const [canDrag, setCanDrag] = useState(() => window.matchMedia("(min-width: 768px) and (pointer: fine)").matches);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    const update = () => setCanDrag(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const returnHome = useCallback(() => {
    setDragging(false);
    onDragChange(false);
    const spring = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 320, damping: 24 };
    animate(x, 0, spring);
    animate(y, 0, spring);
  }, [onDragChange, reduced, x, y]);

  useEffect(() => {
    const reset = () => { controls.cancel(); returnHome(); };
    window.addEventListener("blur", reset);
    window.addEventListener("resize", reset);
    return () => {
      window.removeEventListener("blur", reset);
      window.removeEventListener("resize", reset);
      onDragChange(false);
      x.stop();
      y.stop();
    };
  }, [controls, onDragChange, returnHome, x, y]);

  function suppressDragClick(event: MouseEvent<HTMLElement>) {
    if (event.detail !== 0 && draggedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  const copy = (
    <span className="studio-module-copy">
      <span className="studio-module-title" role="heading" aria-level={3}>{title}</span>
      <span className="studio-module-description">{description}</span>
    </span>
  );

  const surface = to ? (
    <Link to={to} className="studio-surface" draggable={false} aria-label={label} onClick={suppressDragClick}>{copy}</Link>
  ) : (
    <DialogTrigger asChild>
      <button type="button" className="studio-surface" aria-label={label} onClick={suppressDragClick}>{copy}</button>
    </DialogTrigger>
  );

  return (
    <div className={`module-anchor anchor-${id}`} ref={boundsRef} id={id === "blog" ? undefined : id}>
      <motion.div className={`studio-object object-${id} ${dragging ? "is-dragging" : ""}`} data-room-object={id}
        drag={canDrag} dragControls={controls} dragListener={false} dragConstraints={boundsRef}
        dragElastic={0} dragMomentum={false} style={{ x, y }}
        onPointerDownCapture={(event) => {
          draggedRef.current = false;
          if (!canDrag || event.button !== 0 || event.pointerType === "touch") return;
          x.stop(); y.stop();
          controls.start(event);
        }}
        onDragStart={() => { draggedRef.current = true; setDragging(true); onDragChange(true); }}
        onDragEnd={returnHome}
        onPointerCancel={() => { controls.cancel(); returnHome(); }}>
        <motion.div className="studio-visual"
          initial={reduced ? false : { opacity: 0, y: 32, scale: 0.94 }}
          whileInView={{ opacity: 1, y: 0, scale: 1, rotateZ: 0, rotateY: 0, rotateX: 0,
            transition: reduced ? { duration: 0 } : { type: "spring", stiffness: 150, damping: 16, delay: index * 0.1 } }}
          viewport={{ once: true, amount: 0.3 }}
          whileHover={reduced || !canDrag ? undefined : { y: -8, scale: 1.025 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 22 }}>
          {surface}
        </motion.div>
      </motion.div>
    </div>
  );
}

export function ZoraRoom({ onDragChange }: { onDragChange: (dragging: boolean) => void }) {
  return (
    <section className="home-screen zora-room" id="room" aria-labelledby="room-title">
      <div className="studio-light" aria-hidden="true" />
      <div className="studio-shell">
        <div className="studio-heading">
          <div>
            <h2 id="room-title">Zora's Room<span>.</span></h2>
            <p>文字、灵感，还有一点点日常。</p>
          </div>
        </div>
        <div className="studio-stage" aria-label="房间里的三个模块">
          <div className="studio-board">
          <RoomObject id="blog" label="进入博客" title="Blog" description="记录技术，也收藏灵感。" index={0} to="/blog" onDragChange={onDragChange} />
          <Dialog>
            <RoomObject id="projects" label="查看项目" title="Projects" description="慢慢把想法做出来。" index={1} onDragChange={onDragChange} />
            <DialogContent className="studio-dialog">
              <DialogHeader><DialogTitle>想法的落点</DialogTitle><DialogDescription>已有项目的记录与开发实践。</DialogDescription></DialogHeader>
              <Link to="/articles/vue-composable-state" className="studio-project-link"><span><strong>Vite Ku Zora</strong><small>组件与组合式函数的个人工具箱 · Vue / VitePress</small></span></Link>
              <Link to="/articles/frontend-project-structure" className="studio-project-link"><span><strong>Hi Zora Blog</strong><small>关于技术、表达与持续成长的个人空间 · React / TypeScript</small></span></Link>
              <p className="studio-dialog-note">点击阅读相关实践。独立项目展示页暂未提供。</p>
            </DialogContent>
          </Dialog>
          <Dialog>
            <RoomObject id="about" label="认识 Zora" title="About" description="Zora · Front-end Developer" index={2} onDragChange={onDragChange} />
            <DialogContent className="studio-dialog">
              <DialogHeader><DialogTitle>Hi, 我是 Zora。</DialogTitle><DialogDescription>一名前端开发工程师，喜欢清晰的代码，也喜欢有温度的设计。</DialogDescription></DialogHeader>
              <p>这里是我的知识记录，也是持续学习、分享和创造的地方。</p>
              <div className="studio-interests"><span>前端开发</span><span>工程实践</span><span>交互设计</span><span>持续学习</span></div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
        <div className="studio-instructions"><span className="desktop-room-hint">轻轻拖动，松手就会回到原处。</span><span className="mobile-room-hint">点击，进来坐坐。</span></div>
      </div>
      <div className="studio-footer shell"><Link to="/#hello" className="scroll-link">回到 Hi, Zora <ArrowUp size={14} /></Link></div>
    </section>
  );
}
