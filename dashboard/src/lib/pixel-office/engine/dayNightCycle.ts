/**
 * DayNightCycle — day/night overlay + glow effects for the pixel office canvas.
 *
 * Time periods:
 *   Dawn  05:00–07:00  warm orange tint
 *   Day   07:00–17:00  no overlay
 *   Dusk  17:00–19:00  orange-purple tint
 *   Night 19:00–05:00  deep blue overlay
 *
 * Glow effects (rendered only when nightFactor > 0.3):
 *   pc-type furniture  → light-blue radial gradient, radius ≈ 2 tiles
 *   lamp furniture     → warm-yellow radial gradient, radius ≈ 2 tiles
 */

const TILE_SIZE = 16;

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface PeriodDef {
  /** Start hour (0–24, may wrap). */
  startHour: number;
  /** End hour (0–24). */
  endHour: number;
  color: RGBA;
}

const PERIODS: PeriodDef[] = [
  { startHour: 5, endHour: 7, color: { r: 255, g: 180, b: 100, a: 0.08 } }, // Dawn
  { startHour: 7, endHour: 17, color: { r: 0, g: 0, b: 0, a: 0 } },         // Day
  { startHour: 17, endHour: 19, color: { r: 200, g: 100, b: 50, a: 0.12 } }, // Dusk
  // Night spans 19–24 and 0–5, represented as 19–29 for arithmetic convenience
  { startHour: 19, endHour: 29, color: { r: 20, g: 20, b: 80, a: 0.25 } },   // Night
];

/**
 * Resolve current decimal hour (0–24) from wall-clock time.
 */
function currentDecimalHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

/**
 * Linearly interpolate between two RGBA colours.
 */
function lerpRGBA(a: RGBA, b: RGBA, t: number): RGBA {
  const c = Math.max(0, Math.min(1, t));
  return {
    r: a.r + (b.r - a.r) * c,
    g: a.g + (b.g - a.g) * c,
    b: a.b + (b.b - a.b) * c,
    a: a.a + (b.a - a.a) * c,
  };
}

function rgbaString(c: RGBA): string {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a.toFixed(4)})`;
}

/**
 * Given a decimal hour (0–24), return the interpolated overlay colour.
 *
 * Night is treated as a single logical band that wraps midnight (19–5).
 * We normalise hours < 5 into the 24–29 range so arithmetic is continuous.
 */
function overlayColorForHour(rawHour: number): RGBA {
  // Extend the hour into [0, 29) so night wraps cleanly.
  const hour = rawHour < 5 ? rawHour + 24 : rawHour;

  for (let i = 0; i < PERIODS.length; i++) {
    const period = PERIODS[i];
    if (hour >= period.startHour && hour < period.endHour) {
      const duration = period.endHour - period.startHour;
      const elapsed = hour - period.startHour;
      const t = elapsed / duration;

      // Lerp toward the colour of the next period (wraps).
      const next = PERIODS[(i + 1) % PERIODS.length];
      return lerpRGBA(period.color, next.color, t);
    }
  }

  // Fallback (should not occur).
  return { r: 0, g: 0, b: 0, a: 0 };
}

/**
 * How "night-like" is the current time? Returns 0 (full day) to 1 (deep night).
 * Used to gate glow effects.
 */
function nightFactor(rawHour: number): number {
  const hour = rawHour < 5 ? rawHour + 24 : rawHour;

  // Full night band: 19–29 (wraps midnight).
  const nightStart = 19;
  const nightEnd = 29;
  const dawnStart = 5;  // same as nightEnd - 24 in raw hours
  const duskStart = 17;
  const duskEnd = 19;
  const dawnEnd = 7;

  if (hour >= nightStart && hour <= nightEnd) {
    // Ramp up over the first hour of night, ramp down over the last hour (dawn).
    const fadeIn = Math.min(1, (hour - nightStart) / 1);
    const fadeOut = Math.min(1, (nightEnd - hour) / 2); // 2-hour dawn fade
    return Math.min(fadeIn, fadeOut);
  }
  if (hour >= duskStart && hour < duskEnd) {
    return (hour - duskStart) / (duskEnd - duskStart);
  }
  if (hour >= dawnEnd && hour < dawnStart + 24) {
    // This range is 7–29 in normalised space — won't be reached because the
    // night/dusk branches above cover it. Guard left for completeness.
  }
  return 0;
}

export type TimeOfDay = "Dawn" | "Day" | "Dusk" | "Night";

function timeOfDayLabel(rawHour: number): TimeOfDay {
  const hour = rawHour < 5 ? rawHour + 24 : rawHour;
  if (hour >= 5 && hour < 7) return "Dawn";
  if (hour >= 7 && hour < 17) return "Day";
  if (hour >= 17 && hour < 19) return "Dusk";
  return "Night";
}

export interface DayNightFurniture {
  type: string;
  col: number;
  row: number;
}

export class DayNightCycle {
  /** Toggle the entire day/night effect on or off. */
  public enabled: boolean = true;

  /** Current interpolated overlay colour (updated every frame). */
  private _currentColor: RGBA = { r: 0, g: 0, b: 0, a: 0 };

  /** Cached decimal hour at last update tick. */
  private _lastHour: number = -1;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Advance the cycle.  Call once per game loop with the frame delta (seconds).
   * Colour is derived from wall-clock time, so `dt` is only used for future
   * time-acceleration features; the base implementation re-samples the clock
   * every frame.
   *
   * @param dt Frame delta in seconds (unused in base implementation but kept
   *           for API compatibility with other engine modules).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_dt: number): void {
    const hour = currentDecimalHour();
    if (hour === this._lastHour) return; // Nothing changed sub-second.
    this._lastHour = hour;
    this._currentColor = overlayColorForHour(hour);
  }

  /**
   * Draw the semi-transparent overlay on top of the scene.
   * Uses `source-over` compositing — simply paints a tinted rect.
   */
  public renderOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    if (!this.enabled) return;
    if (this._currentColor.a <= 0) return;

    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgbaString(this._currentColor);
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = prev;
  }

  /**
   * Draw warm/cool glow halos around PC and LAMP furniture tiles at night.
   *
   * Coordinates assume the same camera transform used by the main renderer:
   *   screen_x = col * tileSize * zoom + offsetX
   *   screen_y = row * tileSize * zoom + offsetY
   *
   * @param ctx               Canvas 2D context (not pre-transformed).
   * @param furnitureInstances Flat list of placed furniture.
   * @param zoom              Current camera zoom factor.
   * @param offsetX           Camera horizontal offset in screen pixels.
   * @param offsetY           Camera vertical offset in screen pixels.
   * @param tileSize          Tile size in logical pixels (default TILE_SIZE=16).
   */
  public renderGlow(
    ctx: CanvasRenderingContext2D,
    furnitureInstances: DayNightFurniture[],
    zoom: number,
    offsetX: number,
    offsetY: number,
    tileSize: number = TILE_SIZE
  ): void {
    if (!this.enabled) return;

    const factor = nightFactor(currentDecimalHour());
    if (factor <= 0.3) return;

    // Glow opacity scales with how dark it currently is.
    const glowAlpha = (factor - 0.3) / 0.7; // 0..1

    const scaledTile = tileSize * zoom;
    const glowRadius = scaledTile * 2; // ≈ 2 tiles

    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "source-over";

    for (const inst of furnitureInstances) {
      const isPC = inst.type.toLowerCase().includes("pc");
      const isLamp = inst.type === "lamp";

      if (!isPC && !isLamp) continue;

      // Centre of the tile in screen space.
      const cx = inst.col * scaledTile + offsetX + scaledTile / 2;
      const cy = inst.row * scaledTile + offsetY + scaledTile / 2;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);

      if (isPC) {
        // Light blue monitor glow.
        gradient.addColorStop(0, `rgba(100, 180, 255, ${(0.45 * glowAlpha).toFixed(4)})`);
        gradient.addColorStop(0.4, `rgba(80, 140, 230, ${(0.2 * glowAlpha).toFixed(4)})`);
        gradient.addColorStop(1, "rgba(60, 100, 200, 0)");
      } else {
        // Warm yellow lamp glow.
        gradient.addColorStop(0, `rgba(255, 240, 120, ${(0.5 * glowAlpha).toFixed(4)})`);
        gradient.addColorStop(0.4, `rgba(255, 200, 60, ${(0.22 * glowAlpha).toFixed(4)})`);
        gradient.addColorStop(1, "rgba(220, 140, 20, 0)");
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = prev;
  }

  /**
   * Returns a human-readable label for the current time period.
   */
  public getTimeOfDay(): TimeOfDay {
    return timeOfDayLabel(currentDecimalHour());
  }
}
