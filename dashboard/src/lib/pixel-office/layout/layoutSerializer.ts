import { TileType, FurnitureType, DEFAULT_COLS, DEFAULT_ROWS, TILE_SIZE, Direction } from '../types'
import type { TileType as TileTypeVal, OfficeLayout, PlacedFurniture, Seat, FurnitureInstance, FloorColor } from '../types'
import { getCatalogEntry } from './furnitureCatalog'
import { isWalkable } from './tileMap'
import { getColorizedSprite } from '../colorize'

/** Convert flat tile array from layout into 2D grid */
export function layoutToTileMap(layout: OfficeLayout): TileTypeVal[][] {
  const map: TileTypeVal[][] = []
  for (let r = 0; r < layout.rows; r++) {
    const row: TileTypeVal[] = []
    for (let c = 0; c < layout.cols; c++) {
      row.push(layout.tiles[r * layout.cols + c])
    }
    map.push(row)
  }
  return map
}

/** Convert placed furniture into renderable FurnitureInstance[] */
export function layoutToFurnitureInstances(furniture: PlacedFurniture[]): FurnitureInstance[] {
  // Pre-compute desk zY per tile so surface items can sort in front of desks
  const deskZByTile = new Map<string, number>()
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry || !entry.isDesk) continue
    const deskZY = item.row * TILE_SIZE + entry.sprite.length
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const key = `${item.col + dc},${item.row + dr}`
        const prev = deskZByTile.get(key)
        if (prev === undefined || deskZY > prev) deskZByTile.set(key, deskZY)
      }
    }
  }

  const instances: FurnitureInstance[] = []
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry) continue
    const x = item.col * TILE_SIZE
    const y = item.row * TILE_SIZE
    // For tileset-based items, sprite may be empty — use footprint for z-sorting
    const spriteH = entry.sprite.length > 0 ? entry.sprite.length : entry.footprintH * TILE_SIZE
    let zY = y + spriteH

    // Chair z-sorting: ensure characters sitting on chairs render correctly
    if (entry.category === 'chairs') {
      if (entry.orientation === 'back') {
        // Back-facing chairs render IN FRONT of the seated character
        // (the chair back visually occludes the character behind it)
        zY = (item.row + 1) * TILE_SIZE + 1
      } else {
        // All other chairs: cap zY to first row bottom so characters
        // at any seat tile render in front of the chair
        zY = (item.row + 1) * TILE_SIZE
      }
    }

    // Surface items render in front of the desk they sit on
    if (entry.canPlaceOnSurfaces) {
      for (let dr = 0; dr < entry.footprintH; dr++) {
        for (let dc = 0; dc < entry.footprintW; dc++) {
          const key = `${Math.round(item.col + dc)},${Math.round(item.row + dr)}`
          const deskZ = deskZByTile.get(key)
          if (deskZ !== undefined && deskZ + 0.5 > zY) zY = deskZ + 0.5
        }
      }
    }

    let sprite = entry.sprite
    if (item.color) {
      const { h, s, b: bv, c: cv } = item.color
      sprite = getColorizedSprite(`furn-${item.type}-${h}-${s}-${bv}-${cv}-${item.color.colorize ? 1 : 0}`, entry.sprite, item.color)
    }

    instances.push({
      uid: item.uid,
      sprite,
      x,
      y,
      zY,
      ...(entry.emoji ? { emoji: entry.emoji } : {}),
      ...(item.rotation ? { rotation: item.rotation } : {}),
      ...(entry.emojiScale ? { emojiScale: entry.emojiScale } : {}),
      ...(entry.tilesetRect ? { tilesetRect: entry.tilesetRect } : {}),
    })
  }
  return instances
}

/** Assign a tileset image to all furniture instances that have a tilesetRect. */
export function assignTilesetImage(instances: FurnitureInstance[], img: HTMLImageElement): void {
  for (const inst of instances) {
    if (inst.tilesetRect && !inst.tilesetImg) {
      inst.tilesetImg = img
    }
  }
}

/** Get all tiles blocked by furniture footprints, optionally excluding a set of tiles.
 *  Skips top backgroundTiles rows so characters can walk through them. */
export function getBlockedTiles(furniture: PlacedFurniture[], excludeTiles?: Set<string>): Set<string> {
  const tiles = new Set<string>()
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry) continue
    const bgRows = entry.backgroundTiles || 0
    for (let dr = 0; dr < entry.footprintH; dr++) {
      if (dr < bgRows) continue // skip background rows — characters can walk through
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const key = `${item.col + dc},${item.row + dr}`
        if (excludeTiles && excludeTiles.has(key)) continue
        tiles.add(key)
      }
    }
  }
  return tiles
}

/** Get tiles blocked for placement purposes — skips top backgroundTiles rows per item */
export function getPlacementBlockedTiles(furniture: PlacedFurniture[], excludeUid?: string): Set<string> {
  const tiles = new Set<string>()
  for (const item of furniture) {
    if (item.uid === excludeUid) continue
    const entry = getCatalogEntry(item.type)
    if (!entry) continue
    const bgRows = entry.backgroundTiles || 0
    for (let dr = 0; dr < entry.footprintH; dr++) {
      if (dr < bgRows) continue // skip background rows
      for (let dc = 0; dc < entry.footprintW; dc++) {
        tiles.add(`${item.col + dc},${item.row + dr}`)
      }
    }
  }
  return tiles
}

/** Map chair orientation to character facing direction */
function orientationToFacing(orientation: string): Direction {
  switch (orientation) {
    case 'front': return Direction.DOWN
    case 'back': return Direction.UP
    case 'left': return Direction.LEFT
    case 'right': return Direction.RIGHT
    default: return Direction.DOWN
  }
}

/** Generate seats from chair furniture.
 *  Facing priority: 1) chair orientation, 2) adjacent desk, 3) forward (DOWN). */
export function layoutToSeats(furniture: PlacedFurniture[]): Map<string, Seat> {
  const seats = new Map<string, Seat>()

  // Build set of all desk tiles
  const deskTiles = new Set<string>()
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry || !entry.isDesk) continue
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        deskTiles.add(`${item.col + dc},${item.row + dr}`)
      }
    }
  }

  const dirs: Array<{ dc: number; dr: number; facing: Direction }> = [
    { dc: 0, dr: -1, facing: Direction.UP },    // desk is above chair → face UP
    { dc: 0, dr: 1, facing: Direction.DOWN },   // desk is below chair → face DOWN
    { dc: -1, dr: 0, facing: Direction.LEFT },   // desk is left of chair → face LEFT
    { dc: 1, dr: 0, facing: Direction.RIGHT },   // desk is right of chair → face RIGHT
  ]

  // For each chair, every footprint tile becomes a seat.
  // Multi-tile chairs (e.g. 2-tile couches) produce multiple seats.
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry || entry.category !== 'chairs') continue

    let seatCount = 0
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const tileCol = item.col + dc
        const tileRow = item.row + dr

        // Determine facing direction:
        // 1) Chair orientation takes priority
        // 2) Adjacent desk direction (use rounded coords for grid lookup)
        // 3) Default forward (DOWN)
        let facingDir: Direction = Direction.DOWN
        const roundedCol = Math.round(tileCol)
        const roundedRow = Math.round(tileRow)
        if (item.uid.startsWith('stool-r')) {
          facingDir = Direction.LEFT
        } else if (entry.orientation) {
          facingDir = orientationToFacing(entry.orientation)
        } else {
          for (const d of dirs) {
            if (deskTiles.has(`${roundedCol + d.dc},${roundedRow + d.dr}`)) {
              facingDir = d.facing
              break
            }
          }
        }

        // First seat uses chair uid (backward compat), subsequent use uid:N
        const seatUid = seatCount === 0 ? item.uid : `${item.uid}:${seatCount}`
        // Work area desk chairs get high priority so agents sit there first
        const isWorkSeat = item.uid.startsWith('chair-wL') || item.uid.startsWith('chair-wR')
        seats.set(seatUid, {
          uid: seatUid,
          seatCol: tileCol,
          seatRow: tileRow,
          facingDir,
          assigned: false,
          priority: isWorkSeat ? 10 : 0,
        })
        seatCount++
      }
    }
  }

  return seats
}

/** Get the set of tiles occupied by seats (so they can be excluded from blocked tiles) */
export function getSeatTiles(seats: Map<string, Seat>): Set<string> {
  const tiles = new Set<string>()
  for (const seat of seats.values()) {
    tiles.add(`${Math.round(seat.seatCol)},${Math.round(seat.seatRow)}`)
  }
  return tiles
}

/** Default floor colors */
const DEFAULT_LEFT_ROOM_COLOR: FloorColor = { h: 35, s: 30, b: 15, c: 0 }  // warm beige
const DEFAULT_RIGHT_ROOM_COLOR: FloorColor = { h: 25, s: 45, b: 5, c: 10 }  // warm brown
const DEFAULT_CARPET_COLOR: FloorColor = { h: 280, s: 40, b: -5, c: 0 }     // purple
const DEFAULT_DOORWAY_COLOR: FloorColor = { h: 35, s: 25, b: 10, c: 0 }     // tan
const DEFAULT_LOUNGE_COLOR: FloorColor = { h: 200, s: 30, b: 10, c: 0 }     // cool blue
const DEFAULT_WALL_COLOR: FloorColor = { h: 240, s: 25, b: -10, c: 0 }      // purple-gray ~#3A3A5C

// Neko Cafe color palette
const CAFE_WALL_COLOR: FloorColor = { h: 25, s: 40, b: -15, c: 5 }        // warm brown wall
const CAFE_WOOD_FLOOR: FloorColor = { h: 30, s: 50, b: 20, c: 5 }         // honey wood
const CAFE_TILE_FLOOR: FloorColor = { h: 20, s: 25, b: 25, c: 0 }         // cream tile
const CAFE_CARPET_FLOOR: FloorColor = { h: 15, s: 35, b: 10, c: 0 }       // warm carpet
const CAFE_DOORWAY_FLOOR: FloorColor = { h: 30, s: 30, b: 15, c: 0 }      // tan doorway

// Legacy items to remove during migration
function shouldRemoveLegacyItems(item: PlacedFurniture): boolean {
  if (item.uid.startsWith('stool-r')) return true
  if (item.uid === 'plant-r1' || item.uid === 'lamp-r' || item.uid === 'cooler-r') return true
  if (item.uid === 'server-b-left') return true
  if (item.type === FurnitureType.PLANT && item.col === 19 && item.row === 3) return true
  if (item.type === FurnitureType.LAMP && item.col === 19 && item.row === 7) return true
  if (item.type === FurnitureType.COOLER && item.col === 18 && item.row === 7) return true
  return false
}

function normalizeFurniture(furniture: PlacedFurniture[]): PlacedFurniture[] {
  return furniture.filter((item) => !shouldRemoveLegacyItems(item))
}

/** Create the default office layout — 21×17 multi-room office */
export function createDefaultLayout(): OfficeLayout {
  const W = TileType.WALL
  const F1 = TileType.FLOOR_1  // wood (counter/kitchen area)
  const F2 = TileType.FLOOR_2  // cream tile (seating area)
  const F3 = TileType.FLOOR_3  // warm carpet (work area)
  const F4 = TileType.FLOOR_4  // doorway

  // ═══ Neko Cafe Layout ═══
  // 21×17 grid — cozy cat café office
  //
  // Row 0:      Top wall
  // Rows 1-5:   Counter & kitchen (wood floor) — café service area
  // Row 6:      Divider wall with doorways
  // Rows 7-10:  Seating area (cream tile) — café tables + chairs
  // Row 11:     Divider wall with doorways
  // Rows 12-16: Work area (warm carpet) — desks + PCs + subagent stools
  //
  const cols = DEFAULT_COLS  // 21
  const rows = DEFAULT_ROWS  // 17
  const tiles: TileTypeVal[] = []
  const tileColors: Array<FloorColor | null> = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Outer walls
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        tiles.push(W); tileColors.push(CAFE_WALL_COLOR); continue
      }

      // Horizontal divider: counter area / seating area (row 6)
      if (r === 6) {
        if ((c >= 5 && c <= 7) || (c >= 13 && c <= 15)) {
          tiles.push(F4); tileColors.push(CAFE_DOORWAY_FLOOR)
        } else {
          tiles.push(W); tileColors.push(CAFE_WALL_COLOR)
        }
        continue
      }

      // Horizontal divider: seating area / work area (row 11)
      if (r === 11) {
        if ((c >= 4 && c <= 6) || (c >= 14 && c <= 16)) {
          tiles.push(F4); tileColors.push(CAFE_DOORWAY_FLOOR)
        } else {
          tiles.push(W); tileColors.push(CAFE_WALL_COLOR)
        }
        continue
      }

      // Counter & kitchen area (rows 1-5): warm honey wood
      if (r >= 1 && r <= 5) {
        tiles.push(F1); tileColors.push(CAFE_WOOD_FLOOR); continue
      }

      // Seating area (rows 7-10): cream tile
      if (r >= 7 && r <= 10) {
        tiles.push(F2); tileColors.push(CAFE_TILE_FLOOR); continue
      }

      // Work area (rows 12-16): warm carpet
      tiles.push(F3); tileColors.push(CAFE_CARPET_FLOOR)
    }
  }

  // (Right-side work area furniture is now inline in the main array below)

  const furniture: PlacedFurniture[] = [
    // ═══ Top Area (rows 0-5) ═══
    // Left: lounge + study
    { uid: 'deco-top-L', type: FurnitureType.DECO_3, col: 1, row: 0 },
    { uid: 'water-cooler', type: FurnitureType.WATER_COOLER, col: 3, row: 0 },
    { uid: 'desk-top1', type: FurnitureType.DESK, col: 3, row: 3 },
    { uid: 'bench-top1a', type: FurnitureType.BENCH, col: 2, row: 3 },
    { uid: 'bench-top1b', type: FurnitureType.BENCH, col: 2, row: 4 },
    { uid: 'bench-top1c', type: FurnitureType.BENCH, col: 5, row: 3 },
    { uid: 'bench-top1d', type: FurnitureType.BENCH, col: 5, row: 4 },
    { uid: 'library-top1', type: FurnitureType.LIBRARY_GRAY_FULL, col: 5, row: 0 },
    { uid: 'library-top2', type: FurnitureType.LIBRARY_GRAY_FULL, col: 7, row: 0 },
    { uid: 'desk-top2', type: FurnitureType.DESK, col: 8, row: 3 },
    { uid: 'bench-top2a', type: FurnitureType.BENCH, col: 7, row: 3 },
    { uid: 'bench-top2b', type: FurnitureType.BENCH, col: 7, row: 4 },
    { uid: 'bench-top2c', type: FurnitureType.BENCH, col: 10, row: 3 },
    { uid: 'bench-top2d', type: FurnitureType.BENCH, col: 10, row: 4 },
    { uid: 'plant-top1', type: FurnitureType.PLANT_SMALL, col: 11, row: 5 },
    { uid: 'plant-top2', type: FurnitureType.PLANT_SMALL, col: 13, row: 3 },
    // Center/Right: kitchen
    { uid: 'painting-top', type: FurnitureType.PAINTING_LARGE_1, col: 10, row: 0 },
    { uid: 'fridge-L', type: FurnitureType.FRIDGE, col: 12, row: 0 },
    { uid: 'fridge-R', type: FurnitureType.FRIDGE, col: 13, row: 0 },
    { uid: 'k-wallart', type: FurnitureType.WALL_ART, col: 14, row: -0.8 },
    { uid: 'k-cabinet', type: FurnitureType.CABINET_WOOD, col: 18, row: -0.7 },
    { uid: 'k-stovetop', type: FurnitureType.STOVETOP, col: 14, row: 0 },
    { uid: 'k-oven', type: FurnitureType.OVEN, col: 16, row: 0 },
    { uid: 'k-counter', type: FurnitureType.COUNTER, col: 18, row: 0 },
    { uid: 'fish-tank', type: FurnitureType.FISH_TANK, col: 18, row: 2 },
    { uid: 'k-bar', type: FurnitureType.SOFA_L_RIGHT, col: 14, row: 3 },

    // ═══ Divider decorations (row 6/11) ═══
    { uid: 'clock-div1', type: FurnitureType.CLOCK, col: 10, row: 6 },
    { uid: 'whiteboard-w', type: FurnitureType.WHITEBOARD, col: 8, row: 11 },
    { uid: 'clock-div2', type: FurnitureType.CLOCK, col: 11, row: 11 },

    // ═══ Seating Area (rows 7-10) ═══
    { uid: 'table-s1', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 3, row: 8 },
    { uid: 'chair-s1a', type: FurnitureType.BENCH, col: 3.5, row: 7 },
    { uid: 'chair-s1b', type: FurnitureType.BENCH, col: 3.5, row: 9 },
    { uid: 'table-s2', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 7, row: 8 },
    { uid: 'chair-s2a', type: FurnitureType.BENCH, col: 7.5, row: 7 },
    { uid: 'chair-s2b', type: FurnitureType.BENCH, col: 7.5, row: 9 },
    { uid: 'table-s3', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 13, row: 8 },
    { uid: 'chair-s3a', type: FurnitureType.BENCH, col: 13.5, row: 7 },
    { uid: 'chair-s3b', type: FurnitureType.BENCH, col: 13.5, row: 9 },
    { uid: 'table-s4', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 17, row: 8 },
    { uid: 'chair-s4a', type: FurnitureType.BENCH, col: 17.5, row: 7 },
    { uid: 'chair-s4b', type: FurnitureType.BENCH, col: 17.5, row: 9 },
    { uid: 'coffee-s1', type: FurnitureType.COFFEE, col: 3.3, row: 7.75 },
    { uid: 'coffee-s2', type: FurnitureType.COFFEE, col: 13.3, row: 7.75 },
    { uid: 'plant-s1', type: FurnitureType.POTTED_PLANT_CAFE, col: 1, row: 7 },
    { uid: 'plant-s2', type: FurnitureType.POTTED_PLANT_CAFE, col: 19, row: 7 },
    { uid: 'plant-s3', type: FurnitureType.PLANT_SMALL, col: 11, row: 7 },
    { uid: 'lamp-s1', type: FurnitureType.LAMP, col: 1, row: 9 },
    { uid: 'lamp-s2', type: FurnitureType.LAMP, col: 19, row: 9 },

    // ═══ Work Area (rows 12-16) ═══
    // Left
    { uid: 'bookshelf-wL', type: FurnitureType.BOOKSHELF, col: 1, row: 12 },
    { uid: 'desk-wL1', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 3, row: 12 },
    { uid: 'pc-wL1', type: FurnitureType.PC, col: 3.5, row: 11.75 },
    { uid: 'chair-wL1', type: FurnitureType.BENCH, col: 3.5, row: 13 },
    { uid: 'desk-wL2', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 6, row: 12 },
    { uid: 'pc-wL2', type: FurnitureType.PC, col: 6.5, row: 11.75 },
    { uid: 'chair-wL2', type: FurnitureType.BENCH, col: 6.5, row: 13 },
    { uid: 'desk-wL3', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 3, row: 14 },
    { uid: 'pc-wL3', type: FurnitureType.PC, col: 3.5, row: 13.75 },
    { uid: 'chair-wL3', type: FurnitureType.BENCH, col: 3.5, row: 15 },
    { uid: 'desk-wL4', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 6, row: 14 },
    { uid: 'pc-wL4', type: FurnitureType.PC, col: 6.5, row: 13.75 },
    { uid: 'chair-wL4', type: FurnitureType.BENCH, col: 6.5, row: 15 },
    // Center
    { uid: 'server-w', type: FurnitureType.SERVER_RACK, col: 10, row: 12 },
    // Right
    { uid: 'bookshelf-wR', type: FurnitureType.BOOKSHELF, col: 19, row: 12 },
    { uid: 'desk-wR1', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 13, row: 12 },
    { uid: 'pc-wR1', type: FurnitureType.PC, col: 13.5, row: 11.75 },
    { uid: 'chair-wR1', type: FurnitureType.BENCH, col: 13.5, row: 13 },
    { uid: 'desk-wR2', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 16, row: 12 },
    { uid: 'pc-wR2', type: FurnitureType.PC, col: 16.5, row: 11.75 },
    { uid: 'chair-wR2', type: FurnitureType.BENCH, col: 16.5, row: 13 },
    { uid: 'desk-wR3', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 13, row: 14 },
    { uid: 'pc-wR3', type: FurnitureType.PC, col: 13.5, row: 13.75 },
    { uid: 'chair-wR3', type: FurnitureType.BENCH, col: 13.5, row: 15 },
    { uid: 'desk-wR4', type: FurnitureType.TABLE_WOOD_SM_HORIZONTAL, col: 16, row: 14 },
    { uid: 'pc-wR4', type: FurnitureType.PC, col: 16.5, row: 13.75 },
    { uid: 'chair-wR4', type: FurnitureType.BENCH, col: 16.5, row: 15 },
    // Decorations
    { uid: 'plant-w1', type: FurnitureType.POTTED_PLANT_CAFE, col: 1, row: 14 },
    { uid: 'plant-w2', type: FurnitureType.POTTED_PLANT_CAFE, col: 19, row: 14 },
    { uid: 'lamp-w', type: FurnitureType.LAMP, col: 9, row: 15 },
  ]

  return { version: 1, cols, rows, tiles, tileColors, furniture }
}

/** Serialize layout to JSON string */
export function serializeLayout(layout: OfficeLayout): string {
  return JSON.stringify(layout)
}

/** Deserialize layout from JSON string, migrating old tile types if needed */
export function deserializeLayout(json: string): OfficeLayout | null {
  try {
    const obj = JSON.parse(json)
    if (obj && obj.version === 1 && Array.isArray(obj.tiles) && Array.isArray(obj.furniture)) {
      return migrateLayout(obj as OfficeLayout)
    }
  } catch { /* ignore parse errors */ }
  return null
}

/**
 * Ensure layout has tileColors. If missing, generate defaults based on tile types.
 * Exported for use by message handlers that receive layouts over the wire.
 */
export function migrateLayoutColors(layout: OfficeLayout): OfficeLayout {
  return migrateLayout(layout)
}

/**
 * Migrate old layouts that use legacy tile types (TILE_FLOOR=1, WOOD_FLOOR=2, CARPET=3, DOORWAY=4)
 * to the new pattern-based system. If tileColors is already present, no migration needed.
 */
function migrateLayout(layout: OfficeLayout): OfficeLayout {
  if (layout.tileColors && layout.tileColors.length === layout.tiles.length) {
    const furniture = normalizeFurniture(layout.furniture)
    const furnitureChanged =
      furniture.length !== layout.furniture.length ||
      furniture.some((item, index) => item !== layout.furniture[index])
    if (!furnitureChanged) return layout
    return { ...layout, furniture }
  }

  // Check if any tiles use old values (1-4) — these map directly to FLOOR_1-4
  // but need color assignments
  const tileColors: Array<FloorColor | null> = []
  for (const tile of layout.tiles) {
    switch (tile) {
      case 0: // WALL
        tileColors.push(null)
        break
      case 1: // was TILE_FLOOR → FLOOR_1 beige
        tileColors.push(DEFAULT_LEFT_ROOM_COLOR)
        break
      case 2: // was WOOD_FLOOR → FLOOR_2 brown
        tileColors.push(DEFAULT_RIGHT_ROOM_COLOR)
        break
      case 3: // was CARPET → FLOOR_3 purple
        tileColors.push(DEFAULT_CARPET_COLOR)
        break
      case 4: // was DOORWAY → FLOOR_4 tan
        tileColors.push(DEFAULT_DOORWAY_COLOR)
        break
      default:
        // New tile types (5-7) without colors — use neutral gray
        tileColors.push(tile > 0 ? { h: 0, s: 0, b: 0, c: 0 } : null)
    }
  }

  const furniture = normalizeFurniture(layout.furniture)
  return { ...layout, tileColors, furniture }
}

// ── Interaction Points ──────────────────────────────────────────

export interface InteractionPoint {
  col: number
  row: number
  facingDir: Direction
  furnitureType: string
}

/** Furniture types that idle characters can interact with */
const INTERACTABLE_TYPES = new Set([
  FurnitureType.COOLER, FurnitureType.WATER_COOLER,
  FurnitureType.BOOKSHELF, FurnitureType.LIBRARY_GRAY_FULL,
  FurnitureType.WHITEBOARD, FurnitureType.FRIDGE,
  FurnitureType.DECO_3,
  FurnitureType.COFFEE_MACHINE,
])

/** Get interaction points adjacent to interactable furniture */
export function getInteractionPoints(
  furniture: PlacedFurniture[], tileMap: TileTypeVal[][], blockedTiles: Set<string>,
): InteractionPoint[] {
  const points: InteractionPoint[] = []
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry || !INTERACTABLE_TYPES.has(item.type as any)) continue
    // Check tiles along the bottom edge + 1 row below the furniture
    for (let dc = 0; dc < entry.footprintW; dc++) {
      const belowCol = Math.round(item.col + dc)
      const belowRow = Math.round(item.row + entry.footprintH)
      if (isWalkable(belowCol, belowRow, tileMap, blockedTiles)) {
        points.push({ col: belowCol, row: belowRow, facingDir: Direction.UP, furnitureType: item.type })
      }
    }
    // Check tiles along the left edge
    for (let dr = 0; dr < entry.footprintH; dr++) {
      const leftCol = Math.round(item.col - 1)
      const leftRow = Math.round(item.row + dr)
      if (isWalkable(leftCol, leftRow, tileMap, blockedTiles)) {
        points.push({ col: leftCol, row: leftRow, facingDir: Direction.RIGHT, furnitureType: item.type })
      }
    }
    // Check tiles along the right edge
    for (let dr = 0; dr < entry.footprintH; dr++) {
      const rightCol = Math.round(item.col + entry.footprintW)
      const rightRow = Math.round(item.row + dr)
      if (isWalkable(rightCol, rightRow, tileMap, blockedTiles)) {
        points.push({ col: rightCol, row: rightRow, facingDir: Direction.LEFT, furnitureType: item.type })
      }
    }
  }

  // (Right top area is currently empty — no photograph interaction points)

  return points
}

// ── Doorway Tiles ───────────────────────────────────────────────

/** Find all doorway (FLOOR_4) tiles in the layout */
export function getDoorwayTiles(layout: OfficeLayout): Array<{ col: number; row: number }> {
  const tiles: Array<{ col: number; row: number }> = []
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      if (layout.tiles[r * layout.cols + c] === TileType.FLOOR_4) {
        tiles.push({ col: c, row: r })
      }
    }
  }
  return tiles
}
