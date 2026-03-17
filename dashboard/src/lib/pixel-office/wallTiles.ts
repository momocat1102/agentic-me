/**
 * Wall tile auto-tiling: sprite storage and bitmask-based piece selection.
 *
 * Stores 16 wall sprites (one per 4-bit bitmask) loaded from walls.png.
 * At render time, each wall tile's 4 cardinal neighbors are checked to build
 * a bitmask, and the corresponding sprite is drawn directly.
 * No changes to the layout model — auto-tiling is purely visual.
 *
 * Bitmask convention: N=1, E=2, S=4, W=8. Out-of-bounds = NOT wall.
 */

import type { SpriteData, TileType as TileTypeVal, FloorColor, FurnitureInstance } from './types'
import { TileType, TILE_SIZE } from './types'
import { getColorizedSprite } from './colorize'

/** 16 wall sprites indexed by bitmask (0-15) */
let wallSprites: SpriteData[] | null = null

/** Set wall sprites (called once when extension sends wallTilesLoaded) */
export function setWallSprites(sprites: SpriteData[]): void {
  wallSprites = sprites
}

/** Check if wall sprites have been loaded */
export function hasWallSprites(): boolean {
  return wallSprites !== null
}

/**
 * Get the wall sprite for a tile based on its cardinal neighbors.
 * Returns the sprite + Y offset, or null to fall back to solid WALL_COLOR.
 */
export function getWallSprite(
  col: number,
  row: number,
  tileMap: TileTypeVal[][],
): { sprite: SpriteData; offsetY: number } | null {
  if (!wallSprites) return null

  const tmRows = tileMap.length
  const tmCols = tmRows > 0 ? tileMap[0].length : 0

  // Build 4-bit neighbor bitmask
  let mask = 0
  if (row > 0 && tileMap[row - 1][col] === TileType.WALL) mask |= 1            // N
  if (col < tmCols - 1 && tileMap[row][col + 1] === TileType.WALL) mask |= 2   // E
  if (row < tmRows - 1 && tileMap[row + 1][col] === TileType.WALL) mask |= 4   // S
  if (col > 0 && tileMap[row][col - 1] === TileType.WALL) mask |= 8            // W

  const sprite = wallSprites[mask]
  if (!sprite) return null

  // Anchor sprite at bottom of tile — tall sprites extend upward
  return { sprite, offsetY: TILE_SIZE - sprite.length }
}

/**
 * Get a colorized wall sprite for a tile based on its cardinal neighbors.
 * Uses Colorize mode (grayscale → HSL) like floor tiles.
 * Returns the colorized sprite + Y offset, or null if no wall sprites loaded.
 */
export function getColorizedWallSprite(
  col: number,
  row: number,
  tileMap: TileTypeVal[][],
  color: FloorColor,
): { sprite: SpriteData; offsetY: number } | null {
  if (!wallSprites) return null

  const tmRows = tileMap.length
  const tmCols = tmRows > 0 ? tileMap[0].length : 0

  // Build 4-bit neighbor bitmask (same as getWallSprite)
  let mask = 0
  if (row > 0 && tileMap[row - 1][col] === TileType.WALL) mask |= 1            // N
  if (col < tmCols - 1 && tileMap[row][col + 1] === TileType.WALL) mask |= 2   // E
  if (row < tmRows - 1 && tileMap[row + 1][col] === TileType.WALL) mask |= 4   // S
  if (col > 0 && tileMap[row][col - 1] === TileType.WALL) mask |= 8            // W

  const sprite = wallSprites[mask]
  if (!sprite) return null

  const cacheKey = `wall-${mask}-${color.h}-${color.s}-${color.b}-${color.c}`
  const colorized = getColorizedSprite(cacheKey, sprite, { ...color, colorize: true })

  return { sprite: colorized, offsetY: TILE_SIZE - sprite.length }
}

/**
 * Build FurnitureInstance-like objects for all wall tiles so they can participate
 * in z-sorting with furniture and characters.
 */
export function getWallInstances(
  tileMap: TileTypeVal[][],
  tileColors?: Array<FloorColor | null>,
  cols?: number,
): FurnitureInstance[] {
  if (!wallSprites) return []
  const tmRows = tileMap.length
  const tmCols = tmRows > 0 ? tileMap[0].length : 0
  const layoutCols = cols ?? tmCols
  const instances: FurnitureInstance[] = []
  for (let r = 0; r < tmRows; r++) {
    for (let c = 0; c < tmCols; c++) {
      if (tileMap[r][c] !== TileType.WALL) continue
      const colorIdx = r * layoutCols + c
      const wallColor = tileColors?.[colorIdx]
      // Always use raw wall sprites (no colorization) to preserve walls.png look
      const wallInfo = getWallSprite(c, r, tileMap)
      if (!wallInfo) continue
      instances.push({
        sprite: wallInfo.sprite,
        x: c * TILE_SIZE,
        y: r * TILE_SIZE + wallInfo.offsetY,
        zY: r * TILE_SIZE,
      })
    }
  }
  return instances
}

/**
 * Compute the flat fill hex color for a wall tile with a given FloorColor.
 * Uses same Colorize algorithm as floor tiles: 50% gray → HSL.
 */
// ── Tileset-based wall tile mapping ──

/** Map 4-bit neighbor bitmask to tileset tile IDs.
 *  These are placeholder mappings — update after analyzing the actual tileset. */
export const WALL_BITMASK_TO_TILE: Record<number, string> = {
  0b0000: 'wall_mid',       // isolated
  0b0001: 'wall_bottom',    // N only
  0b0010: 'wall_left',      // E only
  0b0100: 'wall_top',       // S only
  0b1000: 'wall_right',     // W only
  0b0011: 'wall_corner_bl', // N+E
  0b0110: 'wall_corner_tl', // E+S
  0b1100: 'wall_corner_tr', // S+W
  0b1001: 'wall_corner_br', // W+N
  0b0101: 'wall_mid',       // N+S (vertical)
  0b1010: 'wall_mid',       // E+W (horizontal)
  0b0111: 'wall_mid',       // N+E+S
  0b1110: 'wall_mid',       // E+S+W
  0b1101: 'wall_mid',       // S+W+N
  0b1011: 'wall_mid',       // W+N+E
  0b1111: 'wall_mid',       // all sides
}

/** Get the tileset tile ID for a wall at (col, row) based on neighbor bitmask */
export function getWallTileId(col: number, row: number, tileMap: TileTypeVal[][]): string {
  const tmRows = tileMap.length
  const tmCols = tmRows > 0 ? tileMap[0].length : 0
  let mask = 0
  if (row > 0 && tileMap[row - 1][col] === TileType.WALL) mask |= 1
  if (col < tmCols - 1 && tileMap[row][col + 1] === TileType.WALL) mask |= 2
  if (row < tmRows - 1 && tileMap[row + 1][col] === TileType.WALL) mask |= 4
  if (col > 0 && tileMap[row][col - 1] === TileType.WALL) mask |= 8
  return WALL_BITMASK_TO_TILE[mask] ?? 'wall_mid'
}

/**
 * Compute the flat fill hex color for a wall tile with a given FloorColor.
 * Uses same Colorize algorithm as floor tiles: 50% gray → HSL.
 */
export function wallColorToHex(color: FloorColor): string {
  const { h, s, b, c } = color
  // Start with 50% gray (wall base)
  let lightness = 0.5

  // Apply contrast
  if (c !== 0) {
    const factor = (100 + c) / 100
    lightness = 0.5 + (lightness - 0.5) * factor
  }

  // Apply brightness
  if (b !== 0) {
    lightness = lightness + b / 200
  }

  lightness = Math.max(0, Math.min(1, lightness))

  // HSL to hex (same as colorize.ts hslToHex)
  const satFrac = s / 100
  const ch = (1 - Math.abs(2 * lightness - 1)) * satFrac
  const hp = h / 60
  const x = ch * (1 - Math.abs(hp % 2 - 1))
  let r1 = 0, g1 = 0, b1 = 0

  if (hp < 1) { r1 = ch; g1 = x; b1 = 0 }
  else if (hp < 2) { r1 = x; g1 = ch; b1 = 0 }
  else if (hp < 3) { r1 = 0; g1 = ch; b1 = x }
  else if (hp < 4) { r1 = 0; g1 = x; b1 = ch }
  else if (hp < 5) { r1 = x; g1 = 0; b1 = ch }
  else { r1 = ch; g1 = 0; b1 = x }

  const m = lightness - ch / 2
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255)))

  return `#${clamp(r1).toString(16).padStart(2, '0')}${clamp(g1).toString(16).padStart(2, '0')}${clamp(b1).toString(16).padStart(2, '0')}`
}
