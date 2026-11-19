import { useEffect, useRef } from "react";

/** Low-contrast living backdrop: drifting gradient blobs, faint curved lines and a twinkling starfield. */
export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-midnight">
      {/* deep indigo wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(26,15,46,0.95) 0%, rgba(10,10,15,0) 60%), radial-gradient(90% 60% at 50% 110%, rgba(26,15,46,0.8) 0%, rgba(10,10,15,0) 60%)",
        }}
      />

      {/* drifting blobs */}
      <div
        className="absolute -left-[12vw] -top-[18vh] h-[60vmax] w-[60vmax] rounded-full animate-blob-a will-change-transform"
        style={{ background: "radial-gradient(circle, rgba(138,92,246,0.26) 0%, rgba(138,92,246,0) 65%)", filter: "blur(40px)" }}
      />
      <div
        className="absolute -right-[18vw] top-[22vh] h-[55vmax] w-[55vmax] rounded-full animate-blob-b will-change-transform"
        style={{ background: "radial-gradient(circle, rgba(107,139,255,0.17) 0%, rgba(107,139,255,0) 65%)", filter: "blur(50px)" }}
      />
      <div
        className="absolute -bottom-[25vh] left-[8vw] h-[58vmax] w-[58vmax] rounded-full animate-blob-c will-change-transform"
        style={{ background: "radial-gradient(circle, rgba(184,155,255,0.13) 0%, rgba(26,15,46,0) 65%)", filter: "blur(60px)" }}
      />

      {/* faint curved lines */}
      <svg
        className="absolute -inset-[4%] h-[108%] w-[108%] animate-curve will-change-transform"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="bgLine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8A5CF6" stopOpacity="0.0" />
            <stop offset="0.5" stopColor="#B89BFF" stopOpacity="0.35" />
            <stop offset="1" stopColor="#6B8BFF" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <g stroke="url(#bgLine)" strokeWidth="1">
          <path d="M-100 140 C 220 20, 420 260, 700 160 S 1100 -40, 1320 120" opacity="0.55" />
          <path d="M-60 700 C 240 560, 460 820, 760 640 S 1120 520, 1300 640" opacity="0.5" />
          <circle cx="980" cy="330" r="340" opacity="0.35" />
          <circle cx="980" cy="330" r="420" opacity="0.18" />
          <path d="M150 -20 C 330 240, 90 420, 260 820" opacity="0.28" />
        </g>
      </svg>

      <Starfield />

      {/* vignette keeps text readable */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(10,10,15,0) 40%, rgba(10,10,15,0.65) 100%)" }}
      />
    </div>
  );
}

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  tw: number;
  ph: number;
  vx: number;
  hue: number;
}

function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(170, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.1 + 0.25,
        a: Math.random() * 0.35 + 0.12,
        tw: Math.random() * 0.0016 + 0.0005,
        ph: Math.random() * Math.PI * 2,
        vx: Math.random() * 0.012 + 0.004,
        hue: Math.random() > 0.7 ? 225 : 265,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = reduce ? 0.7 : 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = `hsl(${s.hue} 100% 88%)`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduce) {
          s.x -= s.vx;
          if (s.x < -2) s.x = w + 2;
        }
      }
      ctx.globalAlpha = 1;
      if (!reduce && !document.hidden) raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    draw(0);
    if (!reduce) raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0" />;
}
