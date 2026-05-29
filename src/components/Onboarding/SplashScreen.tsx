import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Bailongma-style 7-Stage Progression ─────────────────────
const SPLASH_STAGES = [
  { text: 'Initializing engine...',          delay: 0,     earth: 0.00 },
  { text: 'Warming up cache...',             delay: 800,   earth: 0.14 },
  { text: 'Loading memories...',             delay: 1700,  earth: 0.28 },
  { text: 'Connecting to DeepSeek...',       delay: 2600,  earth: 0.42 },
  { text: 'Calibrating time sense...',       delay: 3500,  earth: 0.57 },
  { text: 'Loading modules...',              delay: 4400,  earth: 0.71 },
  { text: 'Ready',                           delay: 5300,  earth: 1.00 },
];

const TOTAL_DURATION = 6200;
const FADE_DURATION = 600;

interface Particle {
  x: number; y: number; z: number;
  size: number; speed: number; brightness: number;
  phase: number;
}

function createParticles(count: number): Particle[] {
  const p: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.8 + Math.random() * 0.8;
    p.push({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi),
      z: r * Math.sin(phi) * Math.sin(theta),
      size: 0.5 + Math.random() * 1.5,
      speed: 0.2 + Math.random() * 0.4,
      brightness: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return p;
}

function drawGlowArc(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, time: number) {
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 2.5);
  const hue1 = (time * 0.02 + 220) % 360;
  const hue2 = (time * 0.015 + 260) % 360;
  gradient.addColorStop(0, `hsla(${hue1}, 80%, 60%, 0.08)`);
  gradient.addColorStop(0.5, `hsla(${hue2}, 70%, 50%, 0.04)`);
  gradient.addColorStop(1, 'rgba(13, 17, 23, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawEarth(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  state: EarthState, time: number,
) {
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) * 0.2;
  const rot = state.rotation;

  ctx.clearRect(0, 0, w, h);

  // ── Cosmic background ──
  const bg = ctx.createRadialGradient(cx, cy - radius, 0, cx, cy, radius * 5);
  bg.addColorStop(0, '#0d1117');
  bg.addColorStop(0.6, '#0a0e1a');
  bg.addColorStop(1, '#04070d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // ── Nebula/aurora glow ──
  drawGlowArc(ctx, cx, cy, radius, time);

  // ── Stars ──
  ctx.save();
  for (let i = 0; i < 160; i++) {
    const seed = i * 7919;
    const sx = (seed * 13) % w;
    const sy = (seed * 17) % h;
    const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 0.001 + i * 1.7));
    const sb = (0.2 + ((seed * 31) % 80) / 100) * twinkle;
    ctx.fillStyle = `rgba(255,255,255,${sb})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.5 + ((seed * 7) % 3) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Earth glow ──
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 2.5);
  glow.addColorStop(0, 'rgba(79, 111, 255, 0.12)');
  glow.addColorStop(0.5, 'rgba(79, 111, 255, 0.04)');
  glow.addColorStop(1, 'rgba(79, 111, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // ── Earth ──
  ctx.save();
  ctx.translate(cx, cy);
  const tilt = 0.41;
  ctx.rotate(tilt);

  const sphereGrad = ctx.createRadialGradient(-radius*0.3, -radius*0.3, 0, 0, 0, radius);
  sphereGrad.addColorStop(0, '#1a5a9a');
  sphereGrad.addColorStop(0.3, '#0f3b7a');
  sphereGrad.addColorStop(0.6, '#0a2d6a');
  sphereGrad.addColorStop(0.8, '#0a1a3a');
  sphereGrad.addColorStop(1, '#050d1a');
  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // ── Continents ──
  ctx.fillStyle = 'rgba(45, 145, 85, 0.45)';
  const landPatches = [
    { lat: -0.3, lon: 0.5, w: 0.4, h: 0.3 },
    { lat: 0.5, lon: 0.4, w: 0.15, h: 0.4 },
    { lat: -0.4, lon: -0.1, w: 0.2, h: 0.2 },
    { lat: 0.1, lon: -0.05, w: 0.25, h: 0.4 },
    { lat: -0.3, lon: -0.4, w: 0.5, h: 0.3 },
    { lat: 0.5, lon: -0.5, w: 0.2, h: 0.15 },
  ];
  for (const patch of landPatches) {
    const angle = patch.lon * Math.PI + rot;
    const x = Math.sin(angle) * Math.cos(patch.lat * Math.PI) * radius;
    const y = Math.sin(patch.lat * Math.PI) * radius;
    const facing = Math.cos(angle);
    if (facing > 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(facing * 0.8 + 0.2, facing * 0.8 + 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, patch.w * radius * 0.3, patch.h * radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Latitude lines ──
  ctx.strokeStyle = 'rgba(79, 111, 255, 0.10)';
  ctx.lineWidth = 0.5;
  for (let i = -80; i <= 80; i += 20) {
    const latRad = (i * Math.PI) / 180;
    const y = Math.sin(latRad) * radius;
    const r = Math.cos(latRad) * radius;
    if (r > 2) {
      ctx.beginPath();
      ctx.ellipse(0, y, r, Math.abs(r * 0.15), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ── Longitude lines ──
  for (let i = 0; i < 360; i += 30) {
    const angle = (i * Math.PI) / 180 + rot;
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = 'rgba(79, 111, 255, 0.06)';
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.08, radius, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Cloud layer ──
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + state.cloudOffset;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.arc(cloudR * 0.65, 0, radius * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Specular highlight ──
  const spec = ctx.createRadialGradient(-radius*0.4, -radius*0.4, 0, -radius*0.4, -radius*0.4, radius*0.6);
  spec.addColorStop(0, 'rgba(255,255,255,0.10)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Orbital particles ──
  for (const p of state.particles) {
    const angle = time * p.speed * 0.001 + Math.atan2(p.z, p.x) + p.phase;
    const dist = Math.sqrt(p.x * p.x + p.z * p.z);
    const px = cx + Math.cos(angle) * dist;
    const py = cy + p.y + Math.sin(time * 0.001 + p.phase) * 8;
    const size = p.size * (1 + 0.3 * Math.sin(time * 0.002 + p.x));
    ctx.fillStyle = `rgba(100, 140, 255, ${p.brightness * 0.4})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Progress ring ──
  const progress = state.progress;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = 'rgba(79, 111, 255, 0.06)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 20, 0, Math.PI * 2);
  ctx.stroke();

  if (progress > 0 && progress < 1) {
    ctx.strokeStyle = `rgba(79, 111, 255, ${0.4 + progress * 0.6})`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 20, 0, Math.PI * 2 * progress);
    ctx.stroke();
  } else if (progress >= 1) {
    ctx.strokeStyle = '#3fb950';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
const cloudR = 1; // hoisted for cloud layer reference

interface EarthState {
  rotation: number;
  tilt: number;
  cloudOffset: number;
  particles: Particle[];
  stage: number;
  progress: number;
}

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const animRef = useRef<number>(0);
  const skippedRef = useRef(false);
  const earthRef = useRef<EarthState>({
    rotation: 0, tilt: 0.41, cloudOffset: 0,
    particles: createParticles(80),
    stage: 0, progress: 0,
  });

  // Skip handler
  const handleSkip = useCallback(() => {
    if (skippedRef.current) return;
    skippedRef.current = true;
    setFadeOut(true);
    setTimeout(() => {
      setVisible(false);
      onComplete();
    }, FADE_DURATION);
  }, [onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') handleSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSkip]);

  // Stage timing
  useEffect(() => {
    SPLASH_STAGES.forEach((s, i) => {
      setTimeout(() => setStage(i), s.delay);
    });
    setTimeout(() => {
      if (!skippedRef.current) {
        setFadeOut(true);
        setTimeout(() => {
          setVisible(false);
          onComplete();
        }, FADE_DURATION);
      }
    }, TOTAL_DURATION);
  }, [onComplete]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const earth = earthRef.current;
      earth.rotation = elapsed * 0.00008;
      earth.cloudOffset = elapsed * 0.00012;
      earth.stage = stage;
      earth.progress = Math.min(1, stage / (SPLASH_STAGES.length - 1));
      drawEarth(ctx, canvas.width, canvas.height, earth, time);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [stage]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#0d1117',
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-out`,
        cursor: 'pointer',
      }}
      onClick={handleSkip}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {/* Title */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', marginTop: 240 }}>
        <h1 style={{
          fontSize: 36, fontWeight: 700,
          background: 'linear-gradient(135deg, #e6edf3 0%, #4f6fff 50%, #7c3aed 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px',
          animation: 'splashFadeIn 1.2s ease-out 0.3s both',
        }}>
          LongMa
        </h1>
        <p style={{
          fontSize: 13, color: '#8b949e', marginTop: 8,
          letterSpacing: '2px', textTransform: 'uppercase',
          animation: 'splashFadeIn 1.2s ease-out 0.6s both',
        }}>
          DeepSeek Native AI Agent
        </p>
      </div>

      {/* Stage list */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 10,
        minWidth: 280, marginTop: 48,
      }}>
        {SPLASH_STAGES.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            opacity: stage > i ? 0.5 : stage === i ? 1 : 0.12,
            transition: 'all 0.4s ease',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: stage > i ? '#3fb950' : stage === i ? '#4f6fff' : '#30363d',
              boxShadow: stage === i ? '0 0 14px rgba(79, 111, 255, 0.7)' : 'none',
              animation: stage === i ? 'splashPulse 1s ease-in-out infinite' : 'none',
            }} />
            <span style={{
              fontSize: 13,
              color: stage > i ? '#8b949e' : stage === i ? '#e6edf3' : '#30363d',
              fontWeight: stage === i ? 600 : 400,
            }}>
              {s.text}
            </span>
            {stage === i && stage < SPLASH_STAGES.length - 1 && (
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                {[0, 1, 2].map(d => (
                  <span key={d} style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: '#4f6fff', opacity: 0.3 + d * 0.3,
                    animation: `splashPulse 1s ease-in-out ${d * 0.25}s infinite`,
                  }} />
                ))}
              </span>
            )}
            {stage > i && (
              <span style={{ marginLeft: 'auto', color: '#3fb950', fontSize: 14 }}>✓</span>
            )}
          </div>
        ))}
      </div>

      {/* Skip hint */}
      <div style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, fontSize: 11, color: '#6e7681',
        animation: stage >= 2 ? 'splashFadeIn 0.6s ease-out both' : 'none',
        opacity: 0.6,
      }}>
        Click anywhere or press ESC to skip
      </div>

      <style>{`
        @keyframes splashFadeIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
