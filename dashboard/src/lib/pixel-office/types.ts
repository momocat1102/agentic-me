// Inlined constants (no longer imported from constants)
export const TILE_SIZE = 16
export const DEFAULT_COLS = 21
export const DEFAULT_ROWS = 17
export const MAX_COLS = 64
export const MAX_ROWS = 64
export const MATRIX_EFFECT_DURATION = 0.3

export const TileType = {
  WALL: 0,
  FLOOR_1: 1,
  FLOOR_2: 2,
  FLOOR_3: 3,
  FLOOR_4: 4,
  FLOOR_5: 5,
  FLOOR_6: 6,
  FLOOR_7: 7,
  VOID: 8,
} as const
export type TileType = (typeof TileType)[keyof typeof TileType]

/** Per-tile color settings for floor pattern colorization */
export interface FloorColor {
  /** Hue: 0-360 in colorize mode, -180 to +180 in adjust mode */
  h: number
  /** Saturation: 0-100 in colorize mode, -100 to +100 in adjust mode */
  s: number
  /** Brightness -100 to 100 */
  b: number
  /** Contrast -100 to 100 */
  c: number
  /** When true, use Photoshop-style Colorize (grayscale → fixed HSL). Default: adjust mode. */
  colorize?: boolean
}

export const CharacterState = {
  IDLE: 'idle',
  WALK: 'walk',
  TYPE: 'type',
} as const
export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState]

export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const
export type Direction = (typeof Direction)[keyof typeof Direction]

/** 2D array of hex color strings (or '' for transparent). [row][col] */
export type SpriteData = string[][]

export interface Seat {
  /** Chair furniture uid */
  uid: string
  /** Tile col where agent sits */
  seatCol: number
  /** Tile row where agent sits */
  seatRow: number
  /** Direction character faces when sitting (toward adjacent desk) */
  facingDir: Direction
  assigned: boolean
  /** Higher priority seats are assigned first (default 0). Work desks = 10. */
  priority?: number
}

export interface FurnitureInstance {
  uid?: string
  sprite: SpriteData
  /** Pixel x (top-left) */
  x: number
  /** Pixel y (top-left) */
  y: number
  /** Y value used for depth sorting (typically bottom edge) */
  zY: number
  /** Optional emoji to render instead of sprite */
  emoji?: string
  /** Rotation in degrees for emoji rendering */
  rotation?: number
  /** Scale factor for emoji rendering (default 1.0) */
  emojiScale?: number
  /** Source rect in tileset PNG for tileset-based furniture */
  tilesetRect?: { sx: number; sy: number; sw: number; sh: number }
  /** Reference to the tileset image for tileset-based furniture */
  tilesetImg?: HTMLImageElement
}

export interface ToolActivity {
  toolId: string
  status: string
  done: boolean
  permissionWait?: boolean
}

export const FurnitureType = {
  DESK: 'desk',
  BOOKSHELF: 'bookshelf',
  PLANT: 'plant',
  COOLER: 'cooler',
  WHITEBOARD: 'whiteboard',
  CHAIR: 'chair',
  PC: 'pc',
  PC_BACK: 'pc_back',
  CAMERA: 'camera',
  LAMP: 'lamp',
  // Tileset — Desks
  TABLE_WOOD_SM_VERTICAL: 'ts_table_wood_sm_vertical',
  TABLE_WOOD_SM_HORIZONTAL: 'ts_table_wood_sm_horizontal',
  // Tileset — Chairs
  CHAIR_CUSHION: 'ts_chair_cushion',
  CHAIR_SPINNING: 'ts_chair_spinning',
  BENCH: 'ts_bench',
  // Tileset — Decor
  WATER_COOLER: 'ts_water_cooler',
  FRIDGE: 'ts_fridge',
  DECO_3: 'ts_deco_3',
  CLOCK: 'ts_clock',
  LIBRARY_GRAY_FULL: 'ts_library_gray_full',
  PLANT_SMALL: 'ts_plant_small',
  PAINTING_LARGE_1: 'ts_painting_large_1',
  PAINTING_LARGE_2: 'ts_painting_large_2',
  PAINTING_SMALL_1: 'ts_painting_small_1',
  PAINTING_SMALL_2: 'ts_painting_small_2',
  PAINTING_SMALL_3: 'ts_painting_small_3',
  SERVER_RACK: 'server_rack',
  PHONE: 'phone',
  SOFA: 'sofa',
  COFFEE: 'coffee',
  COFFEE_MACHINE: 'coffee_machine',
  // Neko Cafe — Furniture
  COUNTER: 'neko_counter',
  CAFE_TABLE: 'neko_cafe_table',
  CAFE_CHAIR: 'neko_cafe_chair',
  DISPLAY_CASE: 'neko_display_case',
  NEKO_COFFEE_MACHINE: 'neko_coffee_machine',
  OVEN: 'neko_oven',
  // Neko Cafe — Decorations
  POTTED_PLANT_CAFE: 'neko_potted_plant',
  WALL_ART: 'neko_wall_art',
  PASTRY_DECO: 'neko_pastry_deco',
  COFFEE_CUP_DECO: 'neko_coffee_cup_deco',
  // Neko Cafe — Kitchen & Seating
  STOVETOP: 'neko_stovetop',
  CABINET_WOOD: 'neko_cabinet_wood',
  SMALL_SHELF: 'neko_small_shelf',
  SMALL_PLANT_NEKO: 'neko_small_plant',
  CASH_REGISTER: 'neko_cash_register',
  SOFA_L_LEFT: 'neko_sofa_l_left',
  SOFA_SINGLE: 'neko_sofa_single',
  SOFA_L_RIGHT: 'neko_sofa_l_right',
  FLOOR_MAT: 'neko_floor_mat',
  // Neko Cafe — Cat play area
  FISH_TANK: 'neko_fish_tank',
  CAT_CUSHION: 'neko_cat_cushion',
  CAT_BOWL: 'neko_cat_bowl',
  CAT_TOY: 'neko_cat_toy',
  SCRATCHING_POST: 'neko_scratching_post',
} as const
export type FurnitureType = (typeof FurnitureType)[keyof typeof FurnitureType]

export const EditTool = {
  TILE_PAINT: 'tile_paint',
  WALL_PAINT: 'wall_paint',
  FURNITURE_PLACE: 'furniture_place',
  FURNITURE_PICK: 'furniture_pick',
  SELECT: 'select',
  EYEDROPPER: 'eyedropper',
  ERASE: 'erase',
} as const
export type EditTool = (typeof EditTool)[keyof typeof EditTool]

export interface FurnitureCatalogEntry {
  type: string
  label: string
  footprintW: number
  footprintH: number
  sprite: SpriteData
  isDesk: boolean
  category?: string
  orientation?: string
  canPlaceOnSurfaces?: boolean
  emoji?: string
  emojiScale?: number
  backgroundTiles?: number
  canPlaceOnWalls?: boolean
  /** 'spriteData' (default) or 'tileset' for PNG tileset items */
  spriteSource?: 'spriteData' | 'tileset'
  /** Source rect in the tileset PNG (only used when spriteSource === 'tileset') */
  tilesetRect?: { sx: number; sy: number; sw: number; sh: number }
}

export interface PlacedFurniture {
  uid: string
  type: string
  col: number
  row: number
  color?: FloorColor
  /** Rotation in degrees (0, 90, 180, 270) for emoji furniture */
  rotation?: number
}

export interface OfficeLayout {
  version: 1
  cols: number
  rows: number
  tiles: TileType[]
  furniture: PlacedFurniture[]
  tileColors?: Array<FloorColor | null>
}

export interface Character {
  id: number
  state: CharacterState
  dir: Direction
  x: number
  y: number
  tileCol: number
  tileRow: number
  path: Array<{ col: number; row: number }>
  moveProgress: number
  currentTool: string | null
  palette: number
  hueShift: number
  frame: number
  frameTimer: number
  moveSpeedMultiplier: number
  wanderTimer: number
  wanderCount: number
  wanderLimit: number
  isActive: boolean
  seatId: string | null
  bubbleType: 'permission' | 'waiting' | null
  bubbleTimer: number
  seatTimer: number
  isSubagent: boolean
  parentAgentId: number | null
  greetLocked: boolean
  label: string
  matrixEffect: 'spawn' | 'despawn' | null
  matrixEffectTimer: number
  matrixEffectSeeds: number[]
  interactionTarget: { col: number; row: number; facingDir: Direction; furnitureType?: string } | null
  isCat: boolean
  catVariant: number
  catBehavior: 'wander' | 'sit' | 'sleep'
  catBehaviorTimer: number
  codeSnippets: Array<{ text: string; age: number; x: number; y: number }>
  photoComments: Array<{ text: string; age: number; x: number }>
  isViewingPhoto: boolean
  isSystemRole?: boolean
  systemRoleType?: 'gateway_sre'
  systemStatus?: 'unknown' | 'healthy' | 'degraded' | 'down'
  /** Walk back to this tile after farewell greeting, then despawn */
  pendingDespawn?: { col: number; row: number } | true
}
