import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

// Image imports
import dabeliImg from '../assets/images/dish_dabeli.jpg';
import vadapavImg from '../assets/images/dish_vadapav.jpg';
import pavbhajiImg from '../assets/images/dish_pavbhaji.png';
import nightMarketImg from '../assets/images/night_market.png';
import logoImg from '../assets/Logo/Logo.png';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MousePos { x: number; y: number; }
interface Card {
  id: number;
  img: string;
  label: string;
  emoji: string;
  x: string; y: string;
  rotate: number;
  scale: number;
  zIndex: number;
  delay: number;
  mobileHidden: boolean;
}

// ─── Card Definitions ─────────────────────────────────────────────────────────
const CARDS: Card[] = [
  { id: 1, img: dabeliImg, label: 'Dabeli', emoji: '🌮', x: '8%', y: '18%', rotate: -14, scale: 1.05, zIndex: 3, delay: 0.1, mobileHidden: true },
  { id: 2, img: vadapavImg, label: 'Vada Pav', emoji: '🫓', x: '72%', y: '8%', rotate: 10, scale: 1.0, zIndex: 2, delay: 0.25, mobileHidden: true },
  { id: 3, img: pavbhajiImg, label: 'Pav Bhaji', emoji: '🍲', x: '80%', y: '55%', rotate: 8, scale: 1.08, zIndex: 4, delay: 0.0, mobileHidden: true },
  { id: 5, img: nightMarketImg, label: 'Khau Galli', emoji: '🌃', x: '3%', y: '62%', rotate: -8, scale: 0.95, zIndex: 2, delay: 0.35, mobileHidden: true },
];

// ─── Particle Component ───────────────────────────────────────────────────────
const Particle: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div className="absolute rounded-full pointer-events-none" style={style} />
);

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<MousePos>({ x: 0.5, y: 0.5 });
  const animRef = useRef<number>(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [phase, setPhase] = useState<'enter' | 'idle' | 'exit'>('enter');
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  // ── Particles config (memoised) ──────────────────────────────────────────
  const particles = React.useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      size: Math.random() * 5 + 2,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      dur: `${Math.random() * 8 + 5}s`,
      delay: `${Math.random() * 6}s`,
      opacity: Math.random() * 0.35 + 0.05,
      color: i % 3 === 0 ? '#D94A38' : i % 3 === 1 ? '#F59E0B' : '#ffffff',
    })), []);

  // ── Mount animation ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // ── Progress bar + auto-navigate ─────────────────────────────────────────
  useEffect(() => {
    const DURATION = 4000; // ms total
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);

       if (elapsed >= DURATION - 600) {
         setPhase('exit');
       }
       if (elapsed >= DURATION) {
         sessionStorage.setItem('fromSplash', 'true');
         navigate('/home');
         return;
      }
      requestAnimationFrame(tick);
    };

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [navigate]);

  // ── Mouse tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      mouseRef.current = { x: e.clientX / vw, y: e.clientY / vh };
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  // ── 3D card animation loop ────────────────────────────────────────────────
  useEffect(() => {
    const strengths = [28, 20, 32, 22, 16];
    const lerpFactors = [0.06, 0.05, 0.07, 0.055, 0.04];
    const currentRots = CARDS.map(c => ({ rx: 0, ry: 0, tx: 0, ty: 0, initRot: c.rotate }));

    const loop = () => {
      const { x, y } = mouseRef.current;
      const dx = x - 0.5; // −0.5 to 0.5
      const dy = y - 0.5;

      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const s = strengths[i];
        const lf = lerpFactors[i];
        const targetRy = dx * s;
        const targetRx = -dy * s * 0.65;
        const targetTx = dx * s * 0.4;
        const targetTy = dy * s * 0.4;

        currentRots[i].ry += (targetRy - currentRots[i].ry) * lf;
        currentRots[i].rx += (targetRx - currentRots[i].rx) * lf;
        currentRots[i].tx += (targetTx - currentRots[i].tx) * lf;
        currentRots[i].ty += (targetTy - currentRots[i].ty) * lf;

        const { rx, ry, tx, ty, initRot } = currentRots[i];
        el.style.transform = `
          translateX(${tx}px) translateY(${ty}px)
          rotateZ(${initRot}deg)
          rotateX(${rx}deg) rotateY(${ry}deg)
          scale(${CARDS[i].scale})
        `;
      });

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const isExit = phase === 'exit';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 30% 40%, #FAF8F5 0%, #FAF7F2 45%, #EBE5D9 100%)',
        transition: isExit ? 'opacity 0.6s ease, transform 0.6s ease' : undefined,
        opacity: isExit ? 0 : 1,
        transform: isExit ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      {/* ── Animated grain overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.6,
        }}
      />

      {/* ── Glowing radial accent ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 700, height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,74,56,0.1) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'pulse-glow 4s ease-in-out infinite',
        }}
      />

      {/* ── Floating particles ── */}
      {particles.map(p => (
        <Particle
          key={p.id}
          style={{
            width: p.size, height: p.size,
            left: p.left, top: p.top,
            background: p.color,
            opacity: p.opacity + 0.25,
            animation: `float-particle ${p.dur} ${p.delay} ease-in-out infinite alternate`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}

      {/* ── Horizontal ambient lines ── */}
      {[15, 45, 72, 90].map((pct, i) => (
        <div
          key={i}
          className="absolute w-full pointer-events-none"
          style={{
            top: `${pct}%`, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(217,74,56,0.06) 50%, transparent)',
            animation: `scan-line 8s ${i * 2}s linear infinite`,
          }}
        />
      ))}

      {/* ─────────────────────── 3D FOOD CARDS ─────────────────────────── */}
      <div className="absolute inset-0" style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}>
        {CARDS.map((card, i) => (
          <div
            key={card.id}
            className={`absolute ${card.mobileHidden ? 'hidden md:block' : ''}`}
            style={{
              left: card.x, top: card.y,
              zIndex: card.zIndex,
              transformStyle: 'preserve-3d',
              transition: mounted
                ? 'opacity 0.9s ease, filter 0.9s ease'
                : 'none',
              opacity: mounted ? 1 : 0,
              transitionDelay: `${card.delay + 0.2}s`,
              filter: mounted ? 'blur(0px)' : 'blur(12px)',
            }}
          >
            <div
              ref={el => { cardRefs.current[i] = el; }}
              className="relative"
              style={{
                width: 220, height: 155,
                transformStyle: 'preserve-3d',
                willChange: 'transform',
              }}
            >
              {/* Card glow shadow */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'rgba(217,74,56,0.2)',
                  filter: 'blur(20px)',
                  transform: 'translateZ(-20px) scale(0.9)',
                }}
              />

              {/* Card body */}
              <div
                className="relative w-full h-full rounded-2xl overflow-hidden"
                style={{
                  boxShadow: '0 24px 64px rgba(28,25,23,0.15), 0 0 0 1px rgba(28,25,23,0.08)',
                  transform: 'translateZ(0)',
                }}
              >
                {/* Image */}
                <img
                  src={card.img}
                  alt={card.label}
                  className="w-full h-full object-cover"
                  style={{ transform: 'scale(1.08)', filter: 'saturate(1.3) contrast(1.05)' }}
                />

                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(160deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)',
                  }}
                />

                {/* Card shimmer line */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)',
                  }}
                />

                {/* Label badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                  <span
                    className="text-white font-bold text-xs tracking-wide"
                    style={{
                      textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    {card.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─────────────────────── CENTER CONTENT ─────────────────────────── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 10 }}>

        {/* Logo container */}
        <div
          className="flex flex-col items-center"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.9)',
            transition: 'opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)',
            transitionDelay: '0.05s',
          }}
        >
          {/* Logo ring */}
          <div className="relative mb-5">
            {/* Outer spinning ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, #D94A38, #F59E0B, #D94A38)',
                padding: 2,
                borderRadius: '50%',
                animation: 'spin-ring 4s linear infinite',
                width: 88, height: 88,
                top: -4, left: -4,
              }}
            >
              <div className="w-full h-full rounded-full" style={{ background: '#FAF7F2' }} />
            </div>

            {/* Logo image */}
            <div
              className="relative w-20 h-20 rounded-full overflow-hidden"
              style={{
                boxShadow: '0 0 40px rgba(217,74,56,0.25), 0 0 80px rgba(217,74,56,0.1)',
              }}
            >
              <img src={logoImg} alt="StreetBites" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Brand name */}
          <div className="text-center">
            <h1
              className="font-bold tracking-tight"
              style={{
                fontSize: 52,
                lineHeight: 1,
                fontFamily: 'Georgia, serif',
                background: 'linear-gradient(135deg, #1C1917 0%, #44403C 40%, #D94A38 75%, #F59E0B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: 'none',
                letterSpacing: '-1px',
              }}
            >
              StreetBites
            </h1>

            {/* Tagline with letter stagger */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(217,74,56,0.4))' }} />
              <span
                className="text-xs font-bold uppercase tracking-[0.35em]"
                style={{ color: 'rgba(28,25,23,0.5)', fontFamily: 'sans-serif' }}
              >
                Khau Galli's
              </span>
              <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, rgba(217,74,56,0.4), transparent)' }} />
            </div>
          </div>
        </div>

        {/* Animated tagline lines */}
        <div
          className="mt-8 text-center space-y-1"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 1s ease, transform 1s ease',
            transitionDelay: '0.5s',
          }}
        >
          <p style={{ fontSize: 15, color: 'rgba(28,25,23,0.85)', fontFamily: 'sans-serif', fontWeight: 500 }}>
            One cart.{' '}
            <span style={{ color: '#D94A38', fontWeight: 700 }}>Every stall.</span>
          </p>
          <p style={{ fontSize: 11, color: 'rgba(28,25,23,0.5)', fontFamily: 'sans-serif', letterSpacing: '0.08em' }}>
            Multi-stall street food delivery — one unified checkout
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="mt-10"
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 1s ease',
            transitionDelay: '0.8s',
          }}
        >
          <div
            className="rounded-full overflow-hidden"
            style={{ width: 180, height: 2, background: 'rgba(28,25,23,0.1)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #D94A38, #F59E0B)',
                transition: 'width 0.1s linear',
                boxShadow: '0 0 8px rgba(217,74,56,0.8)',
              }}
            />
          </div>

          <p
            className="text-center mt-3"
            style={{ fontSize: 10, color: 'rgba(28,25,23,0.35)', fontFamily: 'sans-serif', letterSpacing: '0.15em' }}
          >
            LOADING EXPERIENCE
          </p>
        </div>
      </div>

      {/* ── Bottom cluster strip ── */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3"
        style={{
          zIndex: 10,
          opacity: mounted ? 0.6 : 0,
          transition: 'opacity 1s ease',
          transitionDelay: '1s',
        }}
      >
      </div>

      {/* ── Global keyframe styles ── */}
      <style>{`
        @keyframes float-particle {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(12px, -18px) scale(1.3); }
          100% { transform: translate(-8px, 10px) scale(0.8); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; transform: translate(-50%,-50%) scale(1); }
          50%       { opacity: 1;   transform: translate(-50%,-50%) scale(1.1); }
        }
        @keyframes spin-ring {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes scan-line {
          0%   { opacity: 0; transform: translateX(-100%); }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(100%); }
        }
        @keyframes ping-dot {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%       { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
