import { CharacterState, Direction, TILE_SIZE } from '../types'
import { matrixEffectSeeds } from './matrixEffect'
import type { Character, Seat, SpriteData, TileType as TileTypeVal } from '../types'
import type { CharacterSprites } from '../sprites/spriteData'
import { findPath } from '../layout/tileMap'
import { trySocialInteraction, tryBreakBehavior, type BreakFurniture } from './socialBehavior'
import {
  WALK_SPEED_PX_PER_SEC,
  WALK_FRAME_DURATION_SEC,
  TYPE_FRAME_DURATION_SEC,
  WANDER_PAUSE_MIN_SEC,
  WANDER_PAUSE_MAX_SEC,
  WANDER_MOVES_BEFORE_REST_MIN,
  WANDER_MOVES_BEFORE_REST_MAX,
  SEAT_REST_MIN_SEC,
  SEAT_REST_MAX_SEC,
  INTERACTION_CHANCE,
  INTERACTION_STAY_MIN_SEC,
  INTERACTION_STAY_MAX_SEC,
  CAT_WANDER_PAUSE_MIN_SEC,
  CAT_WANDER_PAUSE_MAX_SEC,
  CAT_WALK_SPEED_FACTOR,
} from '../constants'
import type { InteractionPoint } from '../layout/layoutSerializer'

/** Round seat coords to integer for grid-based pathfinding (seats may be at half-tile positions) */
function seatGridCol(seat: Seat): number { return Math.round(seat.seatCol) }
function seatGridRow(seat: Seat): number { return Math.round(seat.seatRow) }

/** Tools that show reading animation instead of typing */
const READING_TOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'])

export function isReadingTool(tool: string | null): boolean {
  if (!tool) return false
  return READING_TOOLS.has(tool)
}

/** Pixel center of a tile */
function tileCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  }
}

/** Direction from one tile to an adjacent tile */
function directionBetween(fromCol: number, fromRow: number, toCol: number, toRow: number): Direction {
  const dc = toCol - fromCol
  const dr = toRow - fromRow
  if (dc > 0) return Direction.RIGHT
  if (dc < 0) return Direction.LEFT
  if (dr > 0) return Direction.DOWN
  return Direction.UP
}

export function createCharacter(
  id: number,
  palette: number,
  seatId: string | null,
  seat: Seat | null,
  hueShift = 0,
): Character {
  const col = seat ? seat.seatCol : 1
  const row = seat ? seat.seatRow : 1
  const gridCol = Math.round(col)
  const gridRow = Math.round(row)
  const center = tileCenter(col, row)
  return {
    id,
    state: CharacterState.TYPE,
    dir: seat ? seat.facingDir : Direction.DOWN,
    x: center.x,
    y: center.y,
    tileCol: gridCol,
    tileRow: gridRow,
    path: [],
    moveProgress: 0,
    currentTool: null,
    palette,
    hueShift,
    frame: 0,
    frameTimer: 0,
    moveSpeedMultiplier: 1,
    wanderTimer: 0,
    wanderCount: 0,
    wanderLimit: randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX),
    isActive: true,
    seatId,
    bubbleType: null,
    bubbleTimer: 0,
    seatTimer: 0,
    isSubagent: false,
    parentAgentId: null,
    greetLocked: false,
    label: '',
    matrixEffect: null,
    matrixEffectTimer: 0,
    matrixEffectSeeds: [],
    interactionTarget: null,
    isCat: false,
    catVariant: 0,
    catBehavior: 'wander' as const,
    catBehaviorTimer: 0,
    codeSnippets: [],
    photoComments: [],
    isViewingPhoto: false,
  }
}

export function updateCharacter(
  ch: Character,
  dt: number,
  walkableTiles: Array<{ col: number; row: number }>,
  seats: Map<string, Seat>,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
  interactionPoints: InteractionPoint[],
  allCharacters?: Character[],
  breakFurniture?: BreakFurniture[],
  pushSnippetFn?: (characterId: number, text: string) => void,
): void {
  ch.frameTimer += dt

  // Pet-specific update: always wander, never sit
  if (ch.isCat) {
    updateCat(ch, dt, walkableTiles, tileMap, blockedTiles)
    return
  }

  switch (ch.state) {
    case CharacterState.TYPE: {
      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      // If no longer active, stand up and start wandering (after seatTimer expires)
      if (!ch.isActive) {
        if (ch.seatTimer > 0) {
          ch.seatTimer -= dt
          break
        }
        ch.seatTimer = 0 // clear sentinel
        ch.state = CharacterState.IDLE
        ch.frame = 0
        ch.frameTimer = 0
        ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
        ch.wanderCount = 0
        ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX)
      }
      break
    }

    case CharacterState.IDLE: {
      // Under greeting control — stay frozen
      if (ch.greetLocked) break
      // Pending walk-back before despawn — start walking immediately
      if (ch.pendingDespawn && ch.pendingDespawn !== true) {
        const target = ch.pendingDespawn
        const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row, tileMap, blockedTiles)
        if (path.length > 0) {
          ch.path = path
          ch.moveProgress = 0
          ch.state = CharacterState.WALK
          ch.frame = 0
          ch.frameTimer = 0
        } else {
          // Can't reach target — despawn in place
          ch.pendingDespawn = undefined
          ch.matrixEffect = 'despawn'
          ch.matrixEffectTimer = 0
          ch.matrixEffectSeeds = matrixEffectSeeds()
        }
        break
      }
      // No idle animation — static pose
      ch.frame = 0
      if (ch.seatTimer < 0) ch.seatTimer = 0 // clear turn-end sentinel
      // If became active, pathfind to seat
      if (ch.isActive) {
        if (!ch.seatId) {
          // No seat assigned — type in place
          ch.state = CharacterState.TYPE
          ch.frame = 0
          ch.frameTimer = 0
          break
        }
        const seat = seats.get(ch.seatId)
        if (seat) {
          const path = findPath(ch.tileCol, ch.tileRow, seatGridCol(seat), seatGridRow(seat), tileMap, blockedTiles)
          if (path.length > 0) {
            ch.path = path
            ch.moveProgress = 0
            ch.state = CharacterState.WALK
            ch.frame = 0
            ch.frameTimer = 0
          } else {
            // Already at seat or no path — sit down
            ch.state = CharacterState.TYPE
            ch.dir = seat.facingDir
            ch.frame = 0
            ch.frameTimer = 0
          }
        }
        break
      }
      // Countdown wander timer
      ch.wanderTimer -= dt
      if (ch.wanderTimer <= 0) {
        // Check if we've wandered enough — return to seat for a rest
        if (ch.wanderCount >= ch.wanderLimit && ch.seatId) {
          const seat = seats.get(ch.seatId)
          if (seat) {
            const path = findPath(ch.tileCol, ch.tileRow, seatGridCol(seat), seatGridRow(seat), tileMap, blockedTiles)
            if (path.length > 0) {
              ch.path = path
              ch.moveProgress = 0
              ch.state = CharacterState.WALK
              ch.frame = 0
              ch.frameTimer = 0
              break
            }
          }
        }
        if (walkableTiles.length > 0) {
          // Social interaction: walk toward another idle character (20% chance)
          if (allCharacters && pushSnippetFn) {
            const socialTarget = trySocialInteraction(
              { id: ch.id, state: ch.state === CharacterState.IDLE ? 'idle' : ch.state === CharacterState.WALK ? 'walk' : 'type', isActive: ch.isActive, tileCol: ch.tileCol, tileRow: ch.tileRow },
              allCharacters.map(c => ({ id: c.id, state: c.state === CharacterState.IDLE ? 'idle' as const : c.state === CharacterState.WALK ? 'walk' as const : 'type' as const, isActive: c.isActive, tileCol: c.tileCol, tileRow: c.tileRow })),
              pushSnippetFn,
            )
            if (socialTarget) {
              const path = findPath(ch.tileCol, ch.tileRow, socialTarget.col, socialTarget.row, tileMap, blockedTiles)
              if (path.length > 0) {
                ch.path = path
                ch.moveProgress = 0
                ch.state = CharacterState.WALK
                ch.frame = 0
                ch.frameTimer = 0
                ch.wanderCount++
                ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
                break
              }
            }
          }

          // Break behavior: walk to coffee machine or sofa (15% chance)
          if (breakFurniture && breakFurniture.length > 0) {
            const breakTarget = tryBreakBehavior(
              { id: ch.id, state: 'idle', isActive: ch.isActive, tileCol: ch.tileCol, tileRow: ch.tileRow },
              breakFurniture,
            )
            if (breakTarget) {
              const path = findPath(ch.tileCol, ch.tileRow, breakTarget.col, breakTarget.row, tileMap, blockedTiles)
              if (path.length > 0) {
                ch.path = path
                ch.moveProgress = 0
                ch.state = CharacterState.WALK
                ch.frame = 0
                ch.frameTimer = 0
                ch.wanderCount++
                ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
                break
              }
            }
          }

          // Chance to walk to an interactable furniture instead of random tile
          if (interactionPoints.length > 0 && Math.random() < INTERACTION_CHANCE) {
            const ip = interactionPoints[Math.floor(Math.random() * interactionPoints.length)]
            const path = findPath(ch.tileCol, ch.tileRow, ip.col, ip.row, tileMap, blockedTiles)
            if (path.length > 0) {
              ch.path = path
              ch.moveProgress = 0
              ch.state = CharacterState.WALK
              ch.frame = 0
              ch.frameTimer = 0
              ch.interactionTarget = { col: ip.col, row: ip.row, facingDir: ip.facingDir, furnitureType: ip.furnitureType }
              ch.wanderCount++
              ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
              break
            }
          }
          const target = walkableTiles[Math.floor(Math.random() * walkableTiles.length)]
          const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row, tileMap, blockedTiles)
          if (path.length > 0) {
            ch.path = path
            ch.moveProgress = 0
            ch.state = CharacterState.WALK
            ch.frame = 0
            ch.frameTimer = 0
            ch.wanderCount++
          }
        }
        ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
      }
      break
    }

    case CharacterState.WALK: {
      // Walk animation
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 4
      }

      if (ch.path.length === 0) {
        // Path complete — snap to tile center and transition
        const center = tileCenter(ch.tileCol, ch.tileRow)
        ch.x = center.x
        ch.y = center.y

        // Temp worker returning to seat before exit — despawn on arrival
        if (ch.pendingDespawn) {
          const target = ch.pendingDespawn === true ? null : ch.pendingDespawn
          const arrived = !target || (ch.tileCol === target.col && ch.tileRow === target.row)
          if (arrived) {
            ch.pendingDespawn = undefined
            ch.matrixEffect = 'despawn'
            ch.matrixEffectTimer = 0
            ch.matrixEffectSeeds = matrixEffectSeeds()
            break
          }
        }

        if (ch.isActive) {
          if (!ch.seatId) {
            // No seat — type in place
            ch.state = CharacterState.TYPE
          } else {
            const seat = seats.get(ch.seatId)
            if (seat && ch.tileCol === seatGridCol(seat) && ch.tileRow === seatGridRow(seat)) {
              ch.state = CharacterState.TYPE
              ch.dir = seat.facingDir
              // Snap to fractional seat position for visual alignment with chair sprite
              ch.x = seat.seatCol * TILE_SIZE + TILE_SIZE / 2
              ch.y = seat.seatRow * TILE_SIZE + TILE_SIZE / 2
            } else {
              ch.state = CharacterState.IDLE
            }
          }
        } else {
          // Check if arrived at an interaction target — face furniture and linger
          if (ch.interactionTarget &&
              ch.tileCol === ch.interactionTarget.col &&
              ch.tileRow === ch.interactionTarget.row) {
            ch.dir = ch.interactionTarget.facingDir
            ch.state = CharacterState.IDLE
            const stayTime = randomRange(INTERACTION_STAY_MIN_SEC, INTERACTION_STAY_MAX_SEC)
            ch.wanderTimer = stayTime
            // Show photo comments when visiting the photograph
            if (ch.interactionTarget.furnitureType === 'photograph') {
              ch.isViewingPhoto = true
            }
            ch.interactionTarget = null
            // Don't count toward wanderCount — interaction is a bonus
            ch.frame = 0
            ch.frameTimer = 0
            break
          }
          ch.interactionTarget = null // clear stale target
          // Check if arrived at assigned seat — sit down for a rest before wandering again
          if (ch.seatId) {
            const seat = seats.get(ch.seatId)
            if (seat && ch.tileCol === seatGridCol(seat) && ch.tileRow === seatGridRow(seat)) {
              ch.state = CharacterState.TYPE
              ch.dir = seat.facingDir
              // Snap to fractional seat position for visual alignment with chair sprite
              ch.x = seat.seatCol * TILE_SIZE + TILE_SIZE / 2
              ch.y = seat.seatRow * TILE_SIZE + TILE_SIZE / 2
              // seatTimer < 0 is a sentinel from setAgentActive(false) meaning
              // "turn just ended" — skip the long rest so idle transition is immediate
              if (ch.seatTimer < 0) {
                ch.seatTimer = 0
              } else {
                ch.seatTimer = randomRange(SEAT_REST_MIN_SEC, SEAT_REST_MAX_SEC)
              }
              ch.wanderCount = 0
              ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX)
              ch.frame = 0
              ch.frameTimer = 0
              break
            }
          }
          ch.state = CharacterState.IDLE
          ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
        }
        ch.frame = 0
        ch.frameTimer = 0
        break
      }

      // Move toward next tile in path
      const nextTile = ch.path[0]
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row)

      const speedMultiplier = ch.moveSpeedMultiplier > 0 ? ch.moveSpeedMultiplier : 1
      ch.moveProgress += ((WALK_SPEED_PX_PER_SEC * speedMultiplier) / TILE_SIZE) * dt

      const fromCenter = tileCenter(ch.tileCol, ch.tileRow)
      const toCenter = tileCenter(nextTile.col, nextTile.row)
      const t = Math.min(ch.moveProgress, 1)
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t

      if (ch.moveProgress >= 1) {
        // Arrived at next tile
        ch.tileCol = nextTile.col
        ch.tileRow = nextTile.row
        ch.x = toCenter.x
        ch.y = toCenter.y
        ch.path.shift()
        ch.moveProgress = 0
      }

      // If became active while wandering, repath to seat (skip if under greeting control)
      if (ch.isActive && ch.seatId && !ch.greetLocked) {
        const seat = seats.get(ch.seatId)
        if (seat) {
          const lastStep = ch.path[ch.path.length - 1]
          if (!lastStep || lastStep.col !== seatGridCol(seat) || lastStep.row !== seatGridRow(seat)) {
            const newPath = findPath(ch.tileCol, ch.tileRow, seatGridCol(seat), seatGridRow(seat), tileMap, blockedTiles)
            if (newPath.length > 0) {
              ch.path = newPath
              ch.moveProgress = 0
            }
          }
        }
      }
      break
    }
  }
}

/** Get the correct sprite frame for a character's current state and direction */
export function getCharacterSprite(ch: Character, sprites: CharacterSprites): SpriteData {
  switch (ch.state) {
    case CharacterState.TYPE:
      if (isReadingTool(ch.currentTool)) {
        return sprites.reading[ch.dir][ch.frame % 2]
      }
      return sprites.typing[ch.dir][ch.frame % 2]
    case CharacterState.WALK:
      return sprites.walk[ch.dir][ch.frame % 4]
    case CharacterState.IDLE:
      return sprites.walk[ch.dir][1]
    default:
      return sprites.walk[ch.dir][1]
  }
}

/** Cat-specific update: wander continuously, slower speed, no seat */
function updateCat(
  ch: Character, dt: number,
  walkableTiles: Array<{ col: number; row: number }>,
  tileMap: TileTypeVal[][], blockedTiles: Set<string>,
): void {
  const catSpeed = WALK_SPEED_PX_PER_SEC * CAT_WALK_SPEED_FACTOR

  switch (ch.state) {
    case CharacterState.IDLE: {
      // Sitting or sleeping — tick behavior timer
      if (ch.catBehavior === 'sit' || ch.catBehavior === 'sleep') {
        ch.catBehaviorTimer -= dt
        if (ch.catBehaviorTimer <= 0) {
          ch.catBehavior = 'wander'
          ch.wanderTimer = randomRange(CAT_WANDER_PAUSE_MIN_SEC, CAT_WANDER_PAUSE_MAX_SEC)
        }
        // Animate sit frames
        if (ch.catBehavior === 'sit') {
          if (ch.frameTimer >= 0.5) {
            ch.frameTimer -= 0.5
            ch.frame = (ch.frame + 1) % 2
          }
        } else {
          ch.frame = 0
        }
        break
      }

      // Wander behavior
      ch.frame = 0
      ch.wanderTimer -= dt
      if (ch.wanderTimer <= 0 && walkableTiles.length > 0) {
        const roll = Math.random()
        if (roll < 0.4) {
          // 40%: wander to random tile
          const target = walkableTiles[Math.floor(Math.random() * walkableTiles.length)]
          const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row, tileMap, blockedTiles)
          if (path.length > 0) {
            ch.path = path
            ch.moveProgress = 0
            ch.state = CharacterState.WALK
            ch.catBehavior = 'wander'
            ch.frame = 0
            ch.frameTimer = 0
          }
        } else if (roll < 0.7) {
          // 30%: sit
          ch.catBehavior = 'sit'
          ch.catBehaviorTimer = 5 + Math.random() * 10
          ch.frame = 0
          ch.frameTimer = 0
        } else {
          // 30%: sleep
          ch.catBehavior = 'sleep'
          ch.catBehaviorTimer = 10 + Math.random() * 20
          ch.frame = 0
          ch.frameTimer = 0
        }
        ch.wanderTimer = randomRange(CAT_WANDER_PAUSE_MIN_SEC, CAT_WANDER_PAUSE_MAX_SEC)
      }
      break
    }
    case CharacterState.WALK: {
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 4
      }
      if (ch.path.length === 0) {
        const center = tileCenter(ch.tileCol, ch.tileRow)
        ch.x = center.x
        ch.y = center.y
        ch.state = CharacterState.IDLE
        ch.frame = 0
        ch.frameTimer = 0
        ch.wanderTimer = randomRange(CAT_WANDER_PAUSE_MIN_SEC, CAT_WANDER_PAUSE_MAX_SEC)
        break
      }
      const nextTile = ch.path[0]
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row)
      ch.moveProgress += (catSpeed / TILE_SIZE) * dt
      const fromCenter = tileCenter(ch.tileCol, ch.tileRow)
      const toCenter = tileCenter(nextTile.col, nextTile.row)
      const t = Math.min(ch.moveProgress, 1)
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t
      if (ch.moveProgress >= 1) {
        ch.tileCol = nextTile.col
        ch.tileRow = nextTile.row
        ch.x = toCenter.x
        ch.y = toCenter.y
        ch.path.shift()
        ch.moveProgress = 0
      }
      break
    }
    default: {
      // Cat shouldn't be in TYPE state — reset to IDLE
      ch.state = CharacterState.IDLE
      ch.frame = 0
      ch.frameTimer = 0
      ch.wanderTimer = randomRange(CAT_WANDER_PAUSE_MIN_SEC, CAT_WANDER_PAUSE_MAX_SEC)
    }
  }
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}
