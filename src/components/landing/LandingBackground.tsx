'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../hooks/useTheme';

// === Types ===
interface Point {
  readonly x: number;
  readonly y: number;
}

interface ThreadData {
  readonly points: readonly Point[];
  readonly hue: number;
  readonly alpha: number;
  readonly phase: number;
  readonly speed: number;
}

interface DustData {
  x: number;
  y: number;
  size: number;
  vy: number;
  vx: number;
  maxLife: number;
  age: number;
  warm: boolean;
}

// === Helpers ===
function createThread(w: number, h: number): ThreadData {
  const startX = Math.random() * w;
  const startY = Math.random() * h;
  const angle = Math.random() * Math.PI * 2;
  const len = 150 + Math.random() * 250;
  const segments = 40;
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      x: startX + Math.cos(angle) * len * t + Math.sin(t * Math.PI * 2) * 20,
      y: startY + Math.sin(angle) * len * t + Math.cos(t * Math.PI * 3) * 15,
    });
  }
  return {
    points,
    hue: Math.random() > 0.5 ? 38 : 220,
    alpha: 0.03 + Math.random() * 0.04,
    phase: Math.random() * Math.PI * 2,
    speed: 0.003 + Math.random() * 0.005,
  };
}

function createDust(w: number, h: number, init: boolean): DustData {
  return {
    x: Math.random() * w,
    y: init ? Math.random() * h : h + 20,
    size: Math.random() * 1.2 + 0.3,
    vy: -(Math.random() * 0.15 + 0.03),
    vx: (Math.random() - 0.5) * 0.08,
    maxLife: 800 + Math.random() * 600,
    age: init ? Math.random() * (800 + Math.random() * 600) : 0,
    warm: Math.random() > 0.5,
  };
}

// === Prism SVG ===
function PrismSVG({ isDark }: { readonly isDark: boolean }): React.ReactElement {
  const fillOpacity = isDark ? '0.15' : '0.7';
  const strokeColor = isDark ? 'rgba(140,160,200,0.25)' : 'rgba(200,195,185,0.25)';
  const innerStroke = isDark ? 'rgba(140,160,200,0.15)' : 'rgba(200,195,185,0.15)';
  const facetFill1 = isDark ? 'rgba(100,140,220,0.15)' : 'rgba(255,255,255,0.2)';
  const facetFill2 = isDark ? 'rgba(80,100,160,0.1)' : 'rgba(245,243,240,0.15)';

  return (
    <svg viewBox="0 0 180 180" className="w-full h-full drop-shadow-[0_15px_40px_rgba(0,0,0,0.04)]">
      <defs>
        <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isDark ? 'rgba(100,130,200,0.3)' : 'rgba(255,255,255,0.7)'} />
          <stop offset="50%" stopColor={isDark ? 'rgba(80,100,160,0.2)' : 'rgba(240,238,235,0.5)'} />
          <stop offset="100%" stopColor={isDark ? 'rgba(60,80,140,0.25)' : 'rgba(230,228,225,0.6)'} />
        </linearGradient>
        <filter id="prismShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dx="0" dy="4" />
          <feComponentTransfer><feFuncA type="linear" slope="0.06" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#prismShadow)">
        <polygon
          points="90,15 160,65 140,155 40,155 20,65"
          fill="url(#pg)"
          stroke={strokeColor}
          strokeWidth="0.8"
          opacity={fillOpacity}
        />
        <line x1="90" y1="15" x2="90" y2="95" stroke={innerStroke} strokeWidth="0.5" />
        <line x1="90" y1="95" x2="160" y2="65" stroke={innerStroke} strokeWidth="0.5" />
        <line x1="90" y1="95" x2="140" y2="155" stroke={innerStroke} strokeWidth="0.5" />
        <line x1="90" y1="95" x2="40" y2="155" stroke={innerStroke} strokeWidth="0.5" />
        <line x1="90" y1="95" x2="20" y2="65" stroke={innerStroke} strokeWidth="0.5" />
        <polygon points="90,15 160,65 90,95" fill={facetFill1} />
        <polygon points="90,15 20,65 90,95" fill={facetFill2} />
      </g>
    </svg>
  );
}

// === Accent shapes ===
function AccentShapes({ isDark }: { readonly isDark: boolean }): React.ReactElement {
  const warmStroke = isDark ? 'rgba(140,175,220,0.2)' : 'rgba(190,175,140,0.2)';
  const coolStroke = isDark ? 'rgba(100,130,190,0.15)' : 'rgba(160,170,190,0.15)';
  const neutralStroke = isDark ? 'rgba(120,150,200,0.12)' : 'rgba(180,170,150,0.12)';
  const crossStroke = isDark ? 'rgba(130,150,185,0.18)' : 'rgba(170,175,185,0.18)';
  const ringStroke = isDark ? 'rgba(120,140,180,0.1)' : 'rgba(185,180,165,0.1)';
  const ringFill = isDark ? 'rgba(120,140,180,0.08)' : 'rgba(185,180,165,0.08)';
  const leafStroke = isDark ? 'rgba(110,140,180,0.12)' : 'rgba(165,170,180,0.12)';

  return (
    <>
      <div className="accent a1">
        <svg width="20" height="20"><circle cx="10" cy="10" r="3" fill="none" stroke={warmStroke} strokeWidth="0.8" /></svg>
      </div>
      <div className="accent a2">
        <svg width="16" height="16"><rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke={coolStroke} strokeWidth="0.7" transform="rotate(15 8 8)" /></svg>
      </div>
      <div className="accent a3">
        <svg width="24" height="24"><polygon points="12,2 22,18 2,18" fill="none" stroke={neutralStroke} strokeWidth="0.7" /></svg>
      </div>
      <div className="accent a4">
        <svg width="14" height="14">
          <line x1="0" y1="7" x2="14" y2="7" stroke={crossStroke} strokeWidth="0.6" />
          <line x1="7" y1="0" x2="7" y2="14" stroke={crossStroke} strokeWidth="0.6" />
        </svg>
      </div>
      <div className="accent a5">
        <svg width="18" height="18">
          <circle cx="9" cy="9" r="7" fill="none" stroke={ringStroke} strokeWidth="0.5" />
          <circle cx="9" cy="9" r="2" fill={ringFill} />
        </svg>
      </div>
      <div className="accent a6">
        <svg width="20" height="20"><path d="M2,10 Q10,2 18,10 Q10,18 2,10Z" fill="none" stroke={leafStroke} strokeWidth="0.6" /></svg>
      </div>
    </>
  );
}

// === Main Background Component ===
export function LandingBackground(): React.ReactElement {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const causticsRef = useRef<HTMLCanvasElement>(null);
  const threadsRef = useRef<HTMLCanvasElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const prismRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const cTimeRef = useRef(0);
  const frameRef = useRef(0);
  const threadsDataRef = useRef<ThreadData[]>([]);
  const dustDataRef = useRef<DustData[]>([]);
  const isDarkRef = useRef(isDark);

  // Keep isDarkRef in sync
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  const initCanvases = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const cc = causticsRef.current;
    if (cc) {
      cc.width = Math.floor(w / 3);
      cc.height = Math.floor(h / 3);
      cc.style.width = w + 'px';
      cc.style.height = h + 'px';
    }

    const tc = threadsRef.current;
    if (tc) { tc.width = w; tc.height = h; }

    const dc = dustRef.current;
    if (dc) { dc.width = w; dc.height = h; }

    // Reinit threads/dust for new size
    threadsDataRef.current = Array.from({ length: 12 }, () => createThread(w, h));
    dustDataRef.current = Array.from({ length: 50 }, () => createDust(w, h, true));
  }, []);

  useEffect(() => {
    mouseRef.current = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      sx: window.innerWidth / 2,
      sy: window.innerHeight / 2,
    };

    initCanvases();

    const handleResize = () => initCanvases();
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    const handleMouseEnter = () => {
      if (glowRef.current) glowRef.current.style.opacity = '1';
    };
    const handleMouseLeave = () => {
      if (glowRef.current) glowRef.current.style.opacity = '0';
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    const loop = () => {
      frameRef.current++;
      const m = mouseRef.current;
      const dark = isDarkRef.current;

      // Smooth mouse
      m.sx += (m.x - m.sx) * 0.06;
      m.sy += (m.y - m.sy) * 0.06;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Cursor glow
      if (glowRef.current) {
        glowRef.current.style.left = m.sx + 'px';
        glowRef.current.style.top = m.sy + 'px';
      }

      // Prism parallax
      if (prismRef.current) {
        const px = (m.sx / w - 0.5) * 12;
        const py = (m.sy / h - 0.5) * 12;
        prismRef.current.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
      }

      // Caustics every 2nd frame
      if (frameRef.current % 2 === 0) {
        const cc = causticsRef.current;
        if (cc) {
          const ctx = cc.getContext('2d');
          if (ctx) {
            const cw = cc.width;
            const ch = cc.height;
            const img = ctx.createImageData(cw, ch);
            const d = img.data;
            cTimeRef.current += 0.004;
            const ct = cTimeRef.current;

            for (let y = 0; y < ch; y++) {
              for (let x = 0; x < cw; x++) {
                const i = (y * cw + x) * 4;
                const nx = (x / cw) * 4;
                const ny = (y / ch) * 4;
                const v1 = Math.sin(nx * 2.5 + ct * 1.3) * Math.cos(ny * 2.2 - ct * 0.9);
                const v2 = Math.sin((nx + ny) * 1.8 + ct * 0.7) * Math.cos(nx * 1.5 - ny * 1.2 + ct);
                const v3 = Math.sin(nx * 3.1 - ct * 0.5) * Math.sin(ny * 2.8 + ct * 1.1);
                const val = (v1 + v2 + v3) / 3;

                if (dark) {
                  const bright = Math.floor(15 + val * 12);
                  d[i] = Math.min(255, bright - Math.floor(val * 2));
                  d[i + 1] = Math.min(255, bright);
                  d[i + 2] = Math.min(255, bright + Math.floor(val * 3));
                  d[i + 3] = 30;
                } else {
                  const bright = Math.floor(245 + val * 12);
                  d[i] = Math.min(255, bright + Math.floor(val * 3));
                  d[i + 1] = Math.min(255, bright);
                  d[i + 2] = Math.min(255, bright - Math.floor(val * 2));
                  d[i + 3] = 40;
                }
              }
            }
            ctx.putImageData(img, 0, 0);
          }
        }
      }

      // Threads
      const tc = threadsRef.current;
      if (tc) {
        const tCtx = tc.getContext('2d');
        if (tCtx) {
          tCtx.clearRect(0, 0, w, h);
          const t = performance.now();
          for (const th of threadsDataRef.current) {
            const wave = Math.sin(t * th.speed + th.phase) * 0.4 + 0.6;
            const hue = dark ? (th.hue === 38 ? 210 : 250) : th.hue;
            const lightness = dark ? '55%' : '65%';
            tCtx.strokeStyle = `hsla(${hue}, 30%, ${lightness}, ${th.alpha * wave})`;
            tCtx.lineWidth = 0.6;
            tCtx.beginPath();
            tCtx.moveTo(th.points[0].x, th.points[0].y);
            for (let i = 1; i < th.points.length - 1; i++) {
              const xc = (th.points[i].x + th.points[i + 1].x) / 2;
              const yc = (th.points[i].y + th.points[i + 1].y) / 2;
              tCtx.quadraticCurveTo(th.points[i].x, th.points[i].y, xc, yc);
            }
            tCtx.stroke();
          }
        }
      }

      // Dust
      const dc = dustRef.current;
      if (dc) {
        const dCtx = dc.getContext('2d');
        if (dCtx) {
          dCtx.clearRect(0, 0, w, h);
          for (const p of dustDataRef.current) {
            p.x += p.vx + Math.sin(p.age * 0.008) * 0.03;
            p.y += p.vy;
            p.age++;
            if (p.age > p.maxLife || p.y < -20) {
              Object.assign(p, createDust(w, h, false));
            }
            const f = 1 - Math.abs(2 * p.age / p.maxLife - 1);
            const alpha = f * 0.2;
            if (alpha < 0.01) continue;
            const col = dark
              ? (p.warm ? `rgba(140,175,220,${alpha})` : `rgba(100,130,190,${alpha})`)
              : (p.warm ? `rgba(190,175,140,${alpha})` : `rgba(160,170,190,${alpha})`);
            dCtx.fillStyle = col;
            dCtx.beginPath();
            dCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            dCtx.fill();
          }
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [initCanvases]);

  // Refraction conic gradient colors
  const refractionBg = isDark
    ? `conic-gradient(from 0deg at 50% 50%,
        rgba(80,120,200,0.05) 0deg, rgba(60,100,180,0.06) 60deg,
        rgba(100,80,160,0.05) 120deg, rgba(60,140,130,0.06) 180deg,
        rgba(100,120,180,0.05) 240deg, rgba(80,100,200,0.06) 300deg,
        rgba(80,120,200,0.05) 360deg)`
    : `conic-gradient(from 0deg at 50% 50%,
        rgba(220,180,120,0.03) 0deg, rgba(180,200,220,0.04) 60deg,
        rgba(200,170,190,0.03) 120deg, rgba(170,195,180,0.04) 180deg,
        rgba(210,190,160,0.03) 240deg, rgba(180,185,210,0.04) 300deg,
        rgba(220,180,120,0.03) 360deg)`;

  const cursorGlowBg = isDark
    ? 'radial-gradient(circle, rgba(80,120,200,0.08) 0%, transparent 65%)'
    : 'radial-gradient(circle, rgba(210,195,160,0.06) 0%, transparent 65%)';

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ cursor: 'default' }}>
      {/* Base gradient */}
      <div className="bg-base-layer" />

      {/* Warm/cool mesh */}
      <div className="bg-mesh-layer" />

      {/* Caustics canvas */}
      <canvas ref={causticsRef} className="fixed inset-0 pointer-events-none opacity-0 animate-soft-reveal" style={{ zIndex: 2 }} />

      {/* Threads canvas */}
      <canvas ref={threadsRef} className="fixed inset-0 pointer-events-none opacity-0 animate-soft-reveal-delayed" style={{ zIndex: 3 }} />

      {/* Glass panels */}
      <div className="glass-panel gp-1" />
      <div className="glass-panel gp-2" />
      <div className="glass-panel gp-3" />
      <div className="glass-panel gp-4" />
      <div className="glass-panel gp-5" />

      {/* Dust canvas */}
      <canvas ref={dustRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 5 }} />

      {/* Center prism */}
      <div
        ref={prismRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 animate-prism-in"
        style={{ zIndex: 6 }}
      >
        <div
          className="absolute top-1/2 left-1/2 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[40px] animate-refraction-spin"
          style={{ background: refractionBg, zIndex: -1 }}
        />
        <div className="w-[180px] h-[180px] relative">
          <PrismSVG isDark={isDark} />
        </div>
      </div>

      {/* Floating accents */}
      <AccentShapes isDark={isDark} />

      {/* Cursor glow */}
      <div
        ref={glowRef}
        className="fixed w-[350px] h-[350px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 transition-opacity duration-400"
        style={{ zIndex: 7, background: cursorGlowBg }}
      />

      {/* Vignette */}
      <div className="vignette-layer" />

      {/* Noise */}
      <div className="noise-layer" />
    </div>
  );
}
