/**
 * Seasonal ambient particle system for the pixel office Canvas 2D game.
 * Particles render in screen coordinates as decorative elements around the canvas edges.
 */

type Season = "spring" | "summer" | "autumn" | "winter";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  active: boolean;
  /** Time elapsed since spawn, used for sinusoidal sway and pulse */
  age: number;
  /** Base x velocity before sinusoidal offset (spring sway) */
  baseVx: number;
}

const POOL_SIZE = 40;

function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter"; // months 11, 0, 1
}

function isSummerNight(): boolean {
  const hour = new Date().getHours();
  return hour >= 19 || hour <= 5;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Spawn position along the top edge or side edges only */
function spawnEdgePosition(
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  // Pick a random edge: 0=top, 1=left, 2=right
  const edge = Math.floor(Math.random() * 3);
  if (edge === 0) {
    return { x: randomBetween(0, canvasWidth), y: -10 };
  } else if (edge === 1) {
    return { x: -10, y: randomBetween(0, canvasHeight * 0.6) };
  } else {
    return {
      x: canvasWidth + 10,
      y: randomBetween(0, canvasHeight * 0.6),
    };
  }
}

function initParticle(
  p: Particle,
  season: Season,
  canvasWidth: number,
  canvasHeight: number
): void {
  const pos = spawnEdgePosition(canvasWidth, canvasHeight);
  p.x = pos.x;
  p.y = pos.y;
  p.age = randomBetween(0, Math.PI * 2); // randomize phase
  p.active = true;

  switch (season) {
    case "spring": {
      // Pink cherry blossom petals — small rectangles with rotation, sinusoidal sway
      p.size = randomBetween(3, 4);
      p.vx = randomBetween(-0.3, 0.3);
      p.baseVx = p.vx;
      p.vy = randomBetween(0.4, 0.9);
      p.alpha = randomBetween(0.6, 0.9);
      p.rotation = randomBetween(0, Math.PI * 2);
      p.rotationSpeed = randomBetween(-0.03, 0.03);
      break;
    }
    case "summer": {
      // Yellow-green fireflies — 2px dots, random float direction, pulsing alpha
      p.size = 2;
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.2, 0.6);
      p.vx = Math.cos(angle) * speed;
      p.baseVx = p.vx;
      p.vy = Math.sin(angle) * speed;
      p.alpha = randomBetween(0.5, 1.0);
      p.rotation = 0;
      p.rotationSpeed = 0;
      // Override spawn: fireflies float anywhere near edges
      p.x = randomBetween(0, canvasWidth);
      p.y = randomBetween(0, canvasHeight);
      break;
    }
    case "autumn": {
      // Orange/brown leaves — 3-5px rectangles, spinning rotation, slightly faster fall
      p.size = randomBetween(3, 5);
      p.vx = randomBetween(-0.6, 0.6);
      p.baseVx = p.vx;
      p.vy = randomBetween(0.7, 1.4);
      p.alpha = randomBetween(0.7, 1.0);
      p.rotation = randomBetween(0, Math.PI * 2);
      p.rotationSpeed = randomBetween(-0.06, 0.06);
      // Ensure meaningful spin direction
      if (Math.abs(p.rotationSpeed) < 0.02) {
        p.rotationSpeed = p.rotationSpeed < 0 ? -0.04 : 0.04;
      }
      break;
    }
    case "winter": {
      // White snowflakes — 2-3px circles, very slow fall, gentle drift
      p.size = randomBetween(2, 3);
      p.vx = randomBetween(-0.2, 0.2);
      p.baseVx = p.vx;
      p.vy = randomBetween(0.15, 0.4);
      p.alpha = randomBetween(0.5, 0.85);
      p.rotation = 0;
      p.rotationSpeed = 0;
      break;
    }
  }
}

function resetParticle(
  p: Particle,
  season: Season,
  canvasWidth: number,
  canvasHeight: number
): void {
  initParticle(p, season, canvasWidth, canvasHeight);
}

function isOffScreen(
  p: Particle,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  return (
    p.y > canvasHeight + 20 ||
    p.x < -30 ||
    p.x > canvasWidth + 30 ||
    p.y < -30
  );
}

export class ParticleSystem {
  enabled: boolean = true;

  private canvasWidth: number;
  private canvasHeight: number;
  private pool: Particle[];
  private season: Season;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.season = getCurrentSeason();

    // Pre-allocate the entire pool once
    this.pool = Array.from({ length: POOL_SIZE }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      alpha: 1,
      rotation: 0,
      rotationSpeed: 0,
      size: 2,
      active: false,
      age: 0,
      baseVx: 0,
    }));

    this.spawnInitialParticles();
  }

  private spawnInitialParticles(): void {
    // Skip summer if it's daytime — fireflies are night-only
    if (this.season === "summer" && !isSummerNight()) {
      return;
    }

    for (const p of this.pool) {
      // Stagger initial positions so they don't all spawn at edges simultaneously
      initParticle(p, this.season, this.canvasWidth, this.canvasHeight);
      // Scatter initial y position so scene isn't empty on load
      if (this.season !== "summer") {
        p.y = randomBetween(-50, this.canvasHeight * 0.8);
      }
    }
  }

  /**
   * Update all particles by delta time (seconds).
   */
  update(dt: number): void {
    if (!this.enabled) return;

    // Re-check season and night condition each frame (lightweight)
    this.season = getCurrentSeason();

    if (this.season === "summer" && !isSummerNight()) {
      // Deactivate all particles during daytime summer
      for (const p of this.pool) {
        p.active = false;
      }
      return;
    }

    const W = this.canvasWidth;
    const H = this.canvasHeight;
    // dt is in seconds; convert to a ~60fps normalised step for velocity
    const step = dt * 60;

    for (const p of this.pool) {
      if (!p.active) {
        // Respawn inactive particles
        resetParticle(p, this.season, W, H);
        continue;
      }

      p.age += dt;

      switch (this.season) {
        case "spring": {
          // Sinusoidal left-right sway overlaid on base horizontal drift
          p.vx = p.baseVx + Math.sin(p.age * 1.2) * 0.4;
          p.x += p.vx * step;
          p.y += p.vy * step;
          p.rotation += p.rotationSpeed * step;
          break;
        }
        case "summer": {
          // Fireflies wander — gradually nudge direction
          p.vx += randomBetween(-0.02, 0.02);
          p.vy += randomBetween(-0.02, 0.02);
          // Clamp speed
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (speed > 0.7) {
            p.vx = (p.vx / speed) * 0.7;
            p.vy = (p.vy / speed) * 0.7;
          }
          p.x += p.vx * step;
          p.y += p.vy * step;
          // Pulsing alpha — glow in, glow out
          p.alpha = 0.4 + Math.abs(Math.sin(p.age * 1.8)) * 0.6;
          break;
        }
        case "autumn": {
          // Spinning leaves, slight horizontal drift on the way down
          p.vx = p.baseVx + Math.sin(p.age * 0.8) * 0.3;
          p.x += p.vx * step;
          p.y += p.vy * step;
          p.rotation += p.rotationSpeed * step;
          break;
        }
        case "winter": {
          // Snowflakes — slow gentle drift
          p.vx = p.baseVx + Math.sin(p.age * 0.5) * 0.15;
          p.x += p.vx * step;
          p.y += p.vy * step;
          break;
        }
      }

      if (isOffScreen(p, W, H)) {
        p.active = false;
      }
    }
  }

  /**
   * Render particles in screen coordinates.
   * The zoom/offset parameters are accepted to keep the signature consistent
   * with other engine modules, but particles render at screen space only.
   */
  render(
    ctx: CanvasRenderingContext2D,
    _zoom: number,
    _offsetX: number,
    _offsetY: number
  ): void {
    if (!this.enabled) return;

    for (const p of this.pool) {
      if (!p.active) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

      switch (this.season) {
        case "spring": {
          // Pink cherry blossom petal — small rotated rectangle
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = "#FFB7C5"; // light cherry pink
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
          break;
        }
        case "summer": {
          // Firefly — small glowing dot
          ctx.translate(p.x, p.y);
          // Outer soft glow
          ctx.fillStyle = "rgba(200, 230, 80, 0.3)";
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
          // Inner bright core
          ctx.fillStyle = "#CCEE44";
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "autumn": {
          // Autumn leaf — rotated rectangle, orange or brown tint
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          // Alternate between orange and brown based on particle position in pool
          const leafColor =
            (p.size * 17) % 2 === 0 ? "#D4691E" : "#8B4513";
          ctx.fillStyle = leafColor;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
          // Small stem suggestion
          ctx.fillStyle = "#6B3410";
          ctx.fillRect(0, p.size * 0.7, 1, p.size * 0.5);
          break;
        }
        case "winter": {
          // Snowflake — small white circle
          ctx.translate(p.x, p.y);
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          // Faint outline for visibility on light backgrounds
          ctx.strokeStyle = "rgba(180, 210, 240, 0.6)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
          break;
        }
      }

      ctx.restore();
    }

    // Reset global alpha to avoid leaking into other rendering passes
    ctx.globalAlpha = 1;
  }

  /**
   * Call when the canvas is resized so edge-spawn logic stays correct.
   */
  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
