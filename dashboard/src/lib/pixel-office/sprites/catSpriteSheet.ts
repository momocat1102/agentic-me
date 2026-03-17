/**
 * Pet Cat Sprite Sheet integration.
 *
 * Primary: Last tick 32×32 Pixel Kittens (itch.io)
 *   Sheet: /assets/pixel-office/cats/pixel-kittens.png (352×5088)
 *   Combined sheet: 3 cats stacked vertically, each 53 rows of 32×32
 *     Cat 0 (gray):   rows 0-52
 *     Cat 1 (ginger):  rows 53-105
 *     Cat 2 (white):   rows 106-158
 *   Per cat:
 *     Row 0: rest/sit poses (6 frames, cols 0-5)
 *     Row 5: walk DOWN (3 frames, cols 0-2)
 *     Row 6: walk UP (3 frames)
 *     Row 7: walk RIGHT (8 frames, cols 0-7)
 *     Row 8: walk LEFT (8 frames)
 *     Row 13: sleep (2 frames)
 *
 * Fallback: LPC Cats (bluecarrot16, CC-BY 3.0, OpenGameArt)
 *   Sheet: /assets/pixel-office/cats/lpc-cats.png (512×256, 32×32 cells)
 *   Colors (4 cols each): 0-3 = white, 4-7 = orange, 8-11 = brown, 12-15 = black
 *   Rows: 0 = walk RIGHT (4f), 1 = walk DOWN (3f), 2 = walk UP (3f),
 *          3 = walk LEFT (4f), 4 = rest/sit/sleep (4f)
 */

import { Direction } from '../types'
import type { Character } from '../types'

// ── Sheet URLs ──
export const CAT_SHEET_URL_PRIMARY = '/assets/pixel-office/cats/pixel-kittens.png'
export const CAT_SHEET_URL_FALLBACK = '/assets/pixel-office/cats/lpc-cats.png'
/** Kept for backward compatibility */
export const CAT_SHEET_URL = CAT_SHEET_URL_FALLBACK
export const CAT_CELL = 32

// ── Active sheet detection ──
let useLastTickSheet = false

export function setUseLastTickSheet(val: boolean): void {
  useLastTickSheet = val
}

// ══════════════════════════════════════════════════════════
// ── LPC Cats mapping (fallback) ──
// ══════════════════════════════════════════════════════════

const LPC_VARIANT_TO_COL_OFFSET: Record<number, number> = {
  0: 4,   // orange  (cols 4-7)
  1: 0,   // white   (cols 0-3)
  2: 8,   // brown   (cols 8-11)
  3: 12,  // black   (cols 12-15)
}

const LPC_DIR_MAP: Record<number, { row: number; frames: number }> = {
  [Direction.RIGHT]: { row: 0, frames: 4 },
  [Direction.DOWN]:  { row: 1, frames: 3 },
  [Direction.UP]:    { row: 2, frames: 3 },
  [Direction.LEFT]:  { row: 3, frames: 4 },
}

function getLpcCatFrame(ch: Character): { sx: number; sy: number; sw: number; sh: number } {
  const colOffset = LPC_VARIANT_TO_COL_OFFSET[ch.catVariant] ?? 4
  const sw = CAT_CELL
  const sh = CAT_CELL

  if (ch.catBehavior === 'sit' || ch.catBehavior === 'sleep') {
    let f: number
    if (ch.catBehavior === 'sleep') {
      f = 2 + (ch.frame % 2)
    } else {
      f = ch.frame % 2
    }
    return { sx: (colOffset + f) * CAT_CELL, sy: 4 * CAT_CELL, sw, sh }
  }

  const dm = LPC_DIR_MAP[ch.dir] ?? LPC_DIR_MAP[Direction.DOWN]
  const f = ch.frame % dm.frames
  return { sx: (colOffset + f) * CAT_CELL, sy: dm.row * CAT_CELL, sw, sh }
}

// ══════════════════════════════════════════════════════════
// ── Last tick Pixel Kittens mapping (primary) ──
// ══════════════════════════════════════════════════════════
//
// pixel-kittens.png: 352×5088 = 11 cols × 159 rows @32×32
// 3 cats, each 53 rows:
//   Gray:   baseRow = 0
//   Ginger: baseRow = 53
//   White:  baseRow = 106

const LT_ROWS_PER_VARIANT = 53

const LT_VARIANT_TO_BASE_ROW: Record<number, number> = {
  0: 0,                          // gray
  1: LT_ROWS_PER_VARIANT,       // ginger
  2: LT_ROWS_PER_VARIANT * 2,   // white
}

// Walk direction row offsets (relative to variant base row)
const LT_DIR_MAP: Record<number, { rowOff: number; frames: number }> = {
  [Direction.DOWN]:  { rowOff: 5, frames: 3 },
  [Direction.UP]:    { rowOff: 6, frames: 3 },
  [Direction.LEFT]:  { rowOff: 7, frames: 4 },  // 8 frames available, use 4 for smooth loop
  [Direction.RIGHT]: { rowOff: 8, frames: 4 },
}

// Sit: row 0 has 6 rest poses, use first 2 for gentle animation
const LT_SIT_ROW_OFF = 0
const LT_SIT_FRAMES = 2
// Sleep: row 13 has sleep animation
const LT_SLEEP_ROW_OFF = 13
const LT_SLEEP_FRAMES = 2

function getLastTickCatFrame(ch: Character): { sx: number; sy: number; sw: number; sh: number } {
  const baseRow = LT_VARIANT_TO_BASE_ROW[ch.catVariant] ?? 0
  const sw = CAT_CELL
  const sh = CAT_CELL

  if (ch.catBehavior === 'sleep') {
    const f = ch.frame % LT_SLEEP_FRAMES
    return { sx: f * CAT_CELL, sy: (baseRow + LT_SLEEP_ROW_OFF) * CAT_CELL, sw, sh }
  }

  if (ch.catBehavior === 'sit') {
    const f = ch.frame % LT_SIT_FRAMES
    return { sx: f * CAT_CELL, sy: (baseRow + LT_SIT_ROW_OFF) * CAT_CELL, sw, sh }
  }

  const dm = LT_DIR_MAP[ch.dir] ?? LT_DIR_MAP[Direction.DOWN]
  const f = ch.frame % dm.frames
  return { sx: f * CAT_CELL, sy: (baseRow + dm.rowOff) * CAT_CELL, sw, sh }
}

// ══════════════════════════════════════════════════════════
// ── Public API ──
// ══════════════════════════════════════════════════════════

/** Get the source rect in the sprite sheet for a given pet cat state. */
export function getCatSheetFrame(ch: Character): { sx: number; sy: number; sw: number; sh: number } {
  if (useLastTickSheet) {
    return getLastTickCatFrame(ch)
  }
  return getLpcCatFrame(ch)
}
