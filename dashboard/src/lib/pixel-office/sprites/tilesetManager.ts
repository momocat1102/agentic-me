/**
 * TilesetManager — loads a tileset PNG and provides drawTile() for rendering
 * individual tiles by source rect cropping via ctx.drawImage().
 */

export interface TileRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

/** Registry of named tile IDs to source rects in the tileset */
export type TileRegistry = Record<string, TileRect>

export class TilesetManager {
  private img: HTMLImageElement | null = null
  private loaded = false
  private registry: TileRegistry = {}

  constructor(private url: string, registry: TileRegistry) {
    this.registry = registry
  }

  /** Load the tileset image. Returns a promise that resolves when ready. */
  load(): Promise<void> {
    if (this.loaded && this.img) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        this.img = img
        this.loaded = true
        resolve()
      }
      img.onerror = () => {
        this.loaded = false
        reject(new Error(`Failed to load tileset: ${this.url}`))
      }
      img.src = this.url
    })
  }

  /** Check if the tileset image is loaded and ready */
  isReady(): boolean {
    return this.loaded && this.img !== null
  }

  /** Get the raw HTMLImageElement (for passing to renderer) */
  getImage(): HTMLImageElement | null {
    return this.img
  }

  /** Draw a named tile at the given canvas position */
  drawTile(
    ctx: CanvasRenderingContext2D,
    tileId: string,
    x: number,
    y: number,
    zoom: number,
    tileSize = 16,
  ): boolean {
    if (!this.img || !this.loaded) return false
    const rect = this.registry[tileId]
    if (!rect) return false
    const destSize = tileSize * zoom
    ctx.drawImage(
      this.img,
      rect.sx, rect.sy, rect.sw, rect.sh,
      x, y, destSize, destSize,
    )
    return true
  }

  /** Get a tile rect by ID (for external rendering) */
  getTileRect(tileId: string): TileRect | null {
    return this.registry[tileId] ?? null
  }

  /** Update registry (e.g., after analyzing the actual sprite sheet) */
  setRegistry(registry: TileRegistry): void {
    this.registry = registry
  }
}

// ── Neko Cafe Tileset Registry ──
// tileset.png (160×96) = 10×6 grid @16×16
// Contains wall/shelf tiles arranged as two bookshelf-like structures:
//   Left block (~cols 0-4): dark wood shelf with panels
//   Right block (~cols 5-9): lighter shelf variant
const T = 16 // tile size in source PNG

export const NEKO_CAFE_TILES: TileRegistry = {
  // ── Floor tiles (from furnitures.png, but mapped via tilesetManager for floor rendering) ──
  // Since tileset.png contains shelf structures, floor rendering falls back to SpriteData colorization
  'floor_wood_1':    { sx: 0, sy: 0, sw: T, sh: T },
  'floor_wood_2':    { sx: T, sy: 0, sw: T, sh: T },
  'floor_tile_1':    { sx: 2 * T, sy: 0, sw: T, sh: T },
  'floor_tile_2':    { sx: 3 * T, sy: 0, sw: T, sh: T },
  'floor_carpet_1':  { sx: 4 * T, sy: 0, sw: T, sh: T },
  'floor_carpet_2':  { sx: 5 * T, sy: 0, sw: T, sh: T },

  // ── Shelf/display structures from tileset.png ──
  // Left shelf (5×6 tiles) — dark wood bookcase
  'shelf_left_tl':   { sx: 0, sy: 0, sw: T, sh: T },
  'shelf_left_tr':   { sx: 4 * T, sy: 0, sw: T, sh: T },
  // Right shelf (5×6 tiles) — light wood bookcase
  'shelf_right_tl':  { sx: 5 * T, sy: 0, sw: T, sh: T },
  'shelf_right_tr':  { sx: 9 * T, sy: 0, sw: T, sh: T },

  // ── Wall tiles (generic, used for auto-tiling fallback) ──
  'wall_top':        { sx: 0, sy: T, sw: T, sh: T },
  'wall_mid':        { sx: T, sy: T, sw: T, sh: T },
  'wall_bottom':     { sx: 2 * T, sy: T, sw: T, sh: T },
  'wall_left':       { sx: 3 * T, sy: T, sw: T, sh: T },
  'wall_right':      { sx: 4 * T, sy: T, sw: T, sh: T },
  'wall_corner_tl':  { sx: 5 * T, sy: T, sw: T, sh: T },
  'wall_corner_tr':  { sx: 6 * T, sy: T, sw: T, sh: T },
  'wall_corner_bl':  { sx: 7 * T, sy: T, sw: T, sh: T },
  'wall_corner_br':  { sx: 0, sy: 2 * T, sw: T, sh: T },
}

/** Create the default Neko Cafe tileset manager */
export function createNekoCafeTileset(): TilesetManager {
  return new TilesetManager(
    '/assets/pixel-office/neko-cafe/tileset.png',
    NEKO_CAFE_TILES,
  )
}
