import { useEffect, useRef, useState } from 'react';

// ─── Bailongma-style 6-Stage Progression ─────────────────────

const SPLASH_STAGES = [
  { text: 'Initializing engine...',          delay: 0,     earth: 0.0 },
  { text: 'Warming up cache...',             delay: 600,   earth: 0.2 },
  { text: 'Loading memories...',             delay: 1300,  earth: 0.4 },
  { text: 'Connecting to DeepSeek...',       delay: 1900,  earth: 0.6 },
  { text: 'Calibrating time sense...',       delay: 2500,  earth: 0.8 },
  { text: 'Ready',                           delay: 3100,  earth: 1.0 },
];

const TOTAL_DURATION = 3800; // ms before onComplete
const FADE_DURATION = 500;

// ─── Canvas 2D Earth Renderer ────────────────────────────────

interface EarthState {
  rotation: number;
  tilt: number;
  cloudOffset: number;
  particles: Particle[];
  stage: number;
  progress: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  brightness: number;
}

function createParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.8 + Math.random() * 0.8;
    particles.push({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi),
      z: r * Math.sin(phi) * Math.sin(theta),
      size: 0.5 + Math.random() * 1.5,
      speed: 0.2 + Math.random() * 0.4,
      brightness: 0.3 + Math.random() * 0.7,
    });
  }
  return particles;
}

function drawEarth(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: EarthState,
  time: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.2;
  const rot = state.rotation;

  // ── Clear ──
  ctx.clearRect(0, 0, w, h);

  // ── Background gradient (cosmic) ──
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 4);
  bg.addColorStop(0, '#0d1117');
  bg.addColorStop(0.5, '#0a0e1a');
  bg.addColorStop(1, '#050810');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // ── Stars ──
  ctx.save();
  for (let i = 0; i < 120; i++) {
    // Deterministic star positions based on seed
    const seed = i * 7919;
    const sx = ((seed * 13) % w) as number;
    const sy = ((seed * 17) % h) as number;
    const sb = 0.2 + ((seed * 31) % 80) / 100;
    ctx.fillStyle = `rgba(255,255,255,${sb})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.5 + ((seed * 7) % 3) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Glow behind Earth ──
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 2);
  glow.addColorStop(0, 'rgba(79, 111, 255, 0.15)');
  glow.addColorStop(0.5, 'rgba(79, 111, 255, 0.05)');
  glow.addColorStop(1, 'rgba(79, 111, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
  ctx.fill();

  // ── Earth sphere ──
  ctx.save();
  ctx.translate(cx, cy);

  // Simulate 3D rotation with a sphere + latitude/longitude wireframe
  const tilt = 0.41; // ~23.5 degrees
  ctx.rotate(tilt);

  // Base sphere
  const sphereGrad = ctx.createRadialGradient(
    -radius * 0.3, -radius * 0.3, 0,
    0, 0, radius,
  );
  sphereGrad.addColorStop(0, '#1a4a8a');
  sphereGrad.addColorStop(0.3, '#0f3b7a');
  sphereGrad.addColorStop(0.6, '#0a2d6a');
  sphereGrad.addColorStop(0.8, '#0a1a3a');
  sphereGrad.addColorStop(1, '#050d1a');
  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // ── Continents (simplified as patches) ──
  const continentColor = 'rgba(45, 125, 75, 0.6)';
  ctx.fillStyle = continentColor;

  // Landmass patches (lat/lon → x,y projections)
  const landPatches = [
    // North America
    { lat: -0.3, lon: 0.5, w: 0.4, h: 0.3 },
    // South America
    { lat: 0.5, lon: 0.4, w: 0.15, h: 0.4 },
    // Europe
    { lat: -0.4, lon: -0.1, w: 0.2, h: 0.2 },
    // Africa
    { lat: 0.1, lon: -0.05, w: 0.25, h: 0.4 },
    // Asia
    { lat: -0.3, lon: -0.4, w: 0.5, h: 0.3 },
    // Australia
    { lat: 0.5, lon: -0.5, w: 0.2, h: 0.15 },
  ];

  for (const patch of landPatches) {
    // Apply rotation to the latitude/longitude
    const angle = patch.lon * Math.PI + rot;
    const x = Math.sin(angle) * Math.cos(patch.lat * Math.PI) * radius;
    const y = Math.sin(patch.lat * Math.PI) * radius;

    // Only draw visible (front-facing) patches
    const facing = Math.cos(angle);
    if (facing > 0) {
      const scale = facing * 0.8 + 0.2;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, patch.w * radius * 0.3, patch.h * radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Latitude lines ──
  ctx.strokeStyle = 'rgba(79, 111, 255, 0.12)';
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
    ctx.strokeStyle = 'rgba(79, 111, 255, 0.08)';
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.1, radius, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Cloud layer (semi-transparent rotating) ──
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const cloudR = radius * 1.02;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + state.cloudOffset;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.arc(cloudR * 0.7, 0, radius * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Specular highlight ──
  const specular = ctx.createRadialGradient(
    -radius * 0.4, -radius * 0.4, 0,
    -radius * 0.4, -radius * 0.4, radius * 0.6,
  );
  specular.addColorStop(0, 'rgba(255,255,255,0.08)');
  specular.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = specular;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // undo tilt

  // ── Orbital particles ──
  for (const p of state.particles) {
    const angle = time * p.speed * 0.001 + Math.atan2(p.z, p.x);
    const dist = Math.sqrt(p.x * p.x + p.z * p.z);
    const px = cx + Math.cos(angle) * dist;
    const py = cy + p.y;
    const size = p.size * (1 + 0.5 * Math.sin(time * 0.002 + p.x));
    ctx.fillStyle = `rgba(79, 111, 255, ${p.brightness * 0.5})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Progress ring (outer) ──
  const progress = state.progress;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = 'rgba(79, 111, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 18, 0, Math.PI * 2);
  ctx.stroke();

  if (progress > 0 && progress < 1) {
    ctx.strokeStyle = `rgba(79, 111, 255, ${0.4 + progress * 0.6})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 18, 0, Math.PI * 2 * progress);
    ctx.stroke();
  } else if (progress >= 1) {
    ctx.strokeStyle = '#3fb950';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 18, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── SplashScreen Component ──────────────────────────────────

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const animRef = useRef<number>(0);
  const earthRef = useRef<EarthState>({
    rotation: 0,
    tilt: 0.41,
    cloudOffset: 0,
    particles: createParticles(60),
    stage: 0,
    progress: 0,
  });

  // Stage timing
  useEffect(() => {
    SPLASH_STAGES.forEach((s, i) => {
      setTimeout(() => setStage(i), s.delay);
    });
    setTimeout(() => setFadeOut(true), TOTAL_DURATION - FADE_DURATION);
    setTimeout(() => {
      setVisible(false);
      onComplete();
    }, TOTAL_DURATION);
  }, [onComplete]);

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const earth = earthRef.current;

      // Update rotation (slow spin)
      earth.rotation = elapsed * 0.00008;
      earth.cloudOffset = elapsed * 0.00012;
      earth.stage = stage;

      // Calculate overall progress (mapped from stage)
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
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d1117',
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-out`,
        zIndex: 9999,
      }}
    >
      {/* Canvas for Earth animation */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Title */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          marginTop: 240,
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#e6edf3',
            letterSpacing: '-0.5px',
            animation: 'splashFadeIn 1.2s ease-out 0.3s both',
          }}
        >
          LongMa
        </h1>
        <p
          style={{
            fontSize: 13,
            color: '#8b949e',
            marginTop: 8,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            animation: 'splashFadeIn 1.2s ease-out 0.6s both',
          }}
        >
          DeepSeek Native AI Agent
        </p>
      </div>

      {/* Stage progression */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minWidth: 260,
          marginTop: 48,
        }}
      >
        {SPLASH_STAGES.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: stage > i ? 0.5 : stage === i ? 1 : 0.15,
              transition: 'all 0.4s ease',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: stage > i ? '#3fb950' : stage === i ? '#4f6fff' : '#30363d',
                boxShadow: stage === i ? '0 0 12px rgba(79, 111, 255, 0.6)' : 'none',
                animation: stage === i ? 'splashPulse 1.2s ease-in-out infinite' : 'none',
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: stage > i ? '#8b949e' : stage === i ? '#e6edf3' : '#30363d',
                fontWeight: stage === i ? 600 : 400,
                fontFamily: 'Inter, -apple-system, sans-serif',
              }}
            >
              {s.text}
            </span>

            {/* Progress dots for current stage */}
            {stage === i && stage < SPLASH_STAGES.length - 1 && (
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                {[0, 1, 2].map(d => (
                  <span
                    key={d}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: '#4f6fff',
                      opacity: 0.3 + d * 0.3,
                      animation: `splashPulse 1.2s ease-in-out ${d * 0.3}s infinite`,
                    }}
                  />
                ))}
              </span>
            )}

            {/* Checkmark for completed stages */}
            {stage > i && (
              <span style={{ marginLeft: 'auto', color: '#3fb950', fontSize: 14 }}>
                ✓
              </span>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes splashFadeIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
