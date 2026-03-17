/**
 * Agent Cat NPC Sprite Sheet integration.
 *
 * Uses Neko Cafe Asset Pack cat NPCs (HelloRumin, itch.io) as Agent skins.
 * Sheet: /assets/pixel-office/neko-cafe/cats.png  (64×288)
 *
 * Layout: 4 cols × 18 rows of 16×16 cells
 * 3 cat variants, each 6 rows (96px):
 *   Cat 0 (orange):  rows  0-5
 *   Cat 1 (gray):    rows  6-11
 *   Cat 2 (waiter):  rows 12-17
 *
 * Per cat (6 rows, paired idle+walk per direction):
 *   Row 0: front (DOWN) idle  — 3 frames (cols 0-2)
 *   Row 1: front (DOWN) walk  — 4 frames (cols 0-3)
 *   Row 2: back  (UP)   idle  — 3 frames
 *   Row 3: back  (UP)   walk  — 4 frames
 *   Row 4: side  (LEFT) idle  — 3 frames  (flip for RIGHT)
 *   Row 5: side  (LEFT) walk  — 4 frames  (flip for RIGHT)
 *
 * License: HelloRumin — free for commercial/personal use, no redistribution
 */

import { CharacterState, Direction } from '../types'
import type { Character } from '../types'

export const AGENT_CAT_SHEET_URL = '/assets/pixel-office/neko-cafe/cats.png'
export const AGENT_CAT_CELL = 16 // 16×16 pixels per frame

const ROWS_PER_VARIANT = 6

/** Base row for each cat variant */
const VARIANT_BASE_ROW = [0, 6, 12] // orange, gray, waiter

/**
 * Direction → row offsets (idle row, walk row) within a variant block.
 * Side sprites face LEFT natively; RIGHT is rendered by flipping.
 */
interface DirLayout {
  idleRowOff: number
  idleFrames: number
  walkRowOff: number
  walkFrames: number
}

const DIR_LAYOUT: Record<number, DirLayout> = {
  [Direction.DOWN]:  { idleRowOff: 0, idleFrames: 3, walkRowOff: 1, walkFrames: 4 },
  [Direction.UP]:    { idleRowOff: 2, idleFrames: 3, walkRowOff: 3, walkFrames: 4 },
  [Direction.LEFT]:  { idleRowOff: 4, idleFrames: 3, walkRowOff: 5, walkFrames: 4 },
  [Direction.RIGHT]: { idleRowOff: 4, idleFrames: 3, walkRowOff: 5, walkFrames: 4 }, // same rows, flipX
}

export interface AgentCatFrameResult {
  sx: number
  sy: number
  sw: number
  sh: number
  /** When true, the renderer should mirror horizontally */
  flipX: boolean
}

/**
 * Get the source rect in the sprite sheet for a given Agent character.
 * The Agent's palette index maps to a cat variant (palette % 3).
 */
export function getAgentCatFrame(ch: Character): AgentCatFrameResult {
  const variantIdx = (ch.palette ?? 0) % VARIANT_BASE_ROW.length
  const baseRow = VARIANT_BASE_ROW[variantIdx]
  const C = AGENT_CAT_CELL
  const flipX = ch.dir === Direction.LEFT

  const dl = DIR_LAYOUT[ch.dir] ?? DIR_LAYOUT[Direction.DOWN]

  // Typing or idle → use idle row
  if (ch.state === CharacterState.TYPE || ch.state === CharacterState.IDLE) {
    const f = ch.frame % dl.idleFrames
    return {
      sx: f * C,
      sy: (baseRow + dl.idleRowOff) * C,
      sw: C,
      sh: C,
      flipX,
    }
  }

  // Walking → use walk row
  const f = ch.frame % dl.walkFrames
  return {
    sx: f * C,
    sy: (baseRow + dl.walkRowOff) * C,
    sw: C,
    sh: C,
    flipX,
  }
}
