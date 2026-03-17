/**
 * socialBehavior.ts
 *
 * Social interaction and break behavior for pixel office characters.
 * Pure functions — no classes, no external state.
 */

// ---------------------------------------------------------------------------
// Minimal character shape (subset of the full Character interface)
// ---------------------------------------------------------------------------

interface SocialCharacter {
  id: number
  state: 'idle' | 'walk' | 'type'
  isActive: boolean
  tileCol: number
  tileRow: number
  isCat?: boolean
}

// ---------------------------------------------------------------------------
// Furniture shape needed by tryBreakBehavior
// ---------------------------------------------------------------------------

export interface BreakFurniture {
  /** FurnitureType string, e.g. 'coffee_machine' | 'sofa' */
  type: string
  /** Tile column of the furniture's top-left corner */
  col: number
  /** Tile row of the furniture's top-left corner */
  row: number
}

// ---------------------------------------------------------------------------
// Tile position
// ---------------------------------------------------------------------------

export interface TilePos {
  col: number
  row: number
}

// ---------------------------------------------------------------------------
// Conversation pool (zh-TW, 15+ pairs: question + answer)
// ---------------------------------------------------------------------------

export interface ConversationPair {
  question: string
  answer: string
}

export const CONVERSATION_POOL: ConversationPair[] = [
  // 工作相關
  { question: '今天 PR 合了嗎？', answer: '還在 review 中啦...' },
  { question: '那個 bug 找到原因了嗎？', answer: '是 race condition！超雷' },
  { question: 'CI 又掛了？', answer: '又是 flaky test，煩死' },
  { question: '這個功能預計幾號上線？', answer: '下週五啦，沒意外的話' },
  { question: 'TypeScript 報錯看了嗎？', answer: '看了，泛型推論問題，頭痛' },
  { question: '你用 Cursor 還是 Claude Code？', answer: 'Claude Code！超好用但 token 噴很快' },
  { question: 'DB migration 跑完了嗎？', answer: '跑完了資料都對，鬆一口氣' },
  { question: '那個 API 怎麼這麼慢？', answer: 'N+1 query 啦，加 eager load 就好' },
  // 台灣日常
  { question: '午餐吃什麼？', answer: '想吃滷肉飯' },
  { question: '欸等等要不要去買飲料？', answer: '好啊！我要大杯微糖去冰' },
  { question: '週末有計畫嗎？', answer: '打算耍廢一整天' },
  { question: '昨晚睡得好嗎？', answer: '不太好，一直想著那個 bug' },
  { question: '下午要喝咖啡嗎？', answer: '已經第三杯了欸...' },
  { question: '最近在追什麼劇？', answer: '還沒找到好看的' },
  { question: '欸你吃飯了沒？', answer: '還沒欸，等下去買' },
  { question: '冷氣是不是壞了？', answer: '對啊超熱的' },
  { question: '你今天怎麼來這麼早？', answer: '昨天太早睡結果自然醒' },
  { question: '週五了欸！', answer: '終於！這週超累' },
  { question: '等等要開會嗎？', answer: '好像三點有一個' },
  { question: '便利商店有特價欸', answer: '真的嗎？等等去看' },
  { question: '你帶傘了嗎？', answer: '沒有欸，等等會下雨喔？' },
  { question: '好累喔...', answer: '我也是，撐一下就下班了' },
  { question: '這個需求合理嗎？', answer: '不太合理但先做吧' },
  // 搞笑/迷因
  { question: '你看到那隻蟲了嗎？', answer: '是 feature 不是 bug！' },
  { question: '又要開會了...', answer: '這個會議可以是 email 吧' },
  { question: 'AI 幫你寫完整個模組？', answer: '有，但我還是得 review 每一行' },
  { question: '這個 regex 你看得懂嗎？', answer: '沒有人看得懂 regex 啦' },
  { question: '為什麼 works on my machine？', answer: '經典！那就部署你的電腦' },
  { question: '又有新框架了', answer: '拜託不要再出新的了' },
  { question: '誰動了我的 config？', answer: '不是我！我什麼都沒碰' },
  { question: '你 commit message 寫 fix', answer: '對啊，fix 就是 fix' },
  { question: '這段 code 誰寫的？', answer: 'git blame 一下... 是我自己 😅' },
]

// ---------------------------------------------------------------------------
// Break snippet pool
// ---------------------------------------------------------------------------

export interface BreakSnippet {
  text: string
  furnitureType: 'coffee_machine' | 'sofa'
}

export const BREAK_SNIPPETS: BreakSnippet[] = [
  { text: '☕ 來杯咖啡~', furnitureType: 'coffee_machine' },
  { text: '☕ 提神一下！', furnitureType: 'coffee_machine' },
  { text: '🛋️ 休息一下', furnitureType: 'sofa' },
  { text: '🛋️ 伸展一下', furnitureType: 'sofa' },
]

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function tileDistance(a: SocialCharacter, b: SocialCharacter): number {
  return Math.abs(a.tileCol - b.tileCol) + Math.abs(a.tileRow - b.tileRow)
}

/** Return a tile adjacent (±1 in one axis) to the given character position. */
function adjacentTile(target: SocialCharacter): TilePos {
  // Prefer standing beside on the horizontal axis
  const offsets: TilePos[] = [
    { col: 1, row: 0 },
    { col: -1, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: -1 },
  ]
  const pick = offsets[Math.floor(Math.random() * offsets.length)]
  return { col: target.tileCol + pick.col, row: target.tileRow + pick.row }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Decides whether the current idle character should walk toward another idle
 * character for a social interaction.
 *
 * @param character - The character considering a social move (must be idle).
 * @param allCharacters - Full list of characters in the scene.
 * @param pushSnippetFn - Callback to push a text snippet to a character by id.
 * @returns Target tile adjacent to the nearest idle peer, or null.
 */
export function trySocialInteraction(
  character: SocialCharacter,
  allCharacters: SocialCharacter[],
  pushSnippetFn: (characterId: number, text: string) => void,
): TilePos | null {
  // Only idle, non-active characters participate
  if (character.state !== 'idle' || character.isActive) return null

  // 30% chance gate
  if (Math.random() >= 0.3) return null

  // Find other idle, non-active characters within 5 tiles (Manhattan distance)
  const SOCIAL_RADIUS = 5
  const candidates = allCharacters.filter(
    (other) =>
      other.id !== character.id &&
      !other.isActive &&
      other.state === 'idle' &&
      tileDistance(character, other) <= SOCIAL_RADIUS,
  )

  if (candidates.length === 0) return null

  // Pick the nearest candidate
  candidates.sort((a, b) => tileDistance(character, a) - tileDistance(character, b))
  const nearest = candidates[0]

  // Trigger a conversation immediately (both characters receive snippets)
  triggerConversation(character.id, nearest.id, pushSnippetFn)

  return adjacentTile(nearest)
}

/**
 * Pushes a random conversation snippet (question + answer) to both characters.
 *
 * @param char1Id - The initiating character's id (receives the question).
 * @param char2Id - The responding character's id (receives the answer).
 * @param pushSnippetFn - Callback to push a text snippet to a character by id.
 */
export function triggerConversation(
  char1Id: number,
  char2Id: number,
  pushSnippetFn: (characterId: number, text: string) => void,
): void {
  const pair = CONVERSATION_POOL[Math.floor(Math.random() * CONVERSATION_POOL.length)]
  pushSnippetFn(char1Id, pair.question)
  pushSnippetFn(char2Id, pair.answer)
}

/**
 * Decides whether the character should take a break at a coffee machine or sofa.
 *
 * @param character - The character considering a break.
 * @param furnitureList - All furniture instances available in the office.
 * @returns Tile position of the break spot (same tile as the furniture), or null.
 */
export function tryBreakBehavior(
  character: SocialCharacter,
  furnitureList: BreakFurniture[],
): TilePos | null {
  // 15% chance gate
  if (Math.random() >= 0.15) return null

  const BREAK_TYPES: ReadonlyArray<string> = ['coffee_machine', 'sofa']

  const spots = furnitureList.filter((f) => BREAK_TYPES.includes(f.type))
  if (spots.length === 0) return null

  const target = spots[Math.floor(Math.random() * spots.length)]
  return { col: target.col, row: target.row }
}

/**
 * Pick a random break snippet for a given furniture type.
 * Useful for callers that want to show a bubble when a break starts.
 */
export function pickBreakSnippet(furnitureType: 'coffee_machine' | 'sofa'): string {
  const pool = BREAK_SNIPPETS.filter((s) => s.furnitureType === furnitureType)
  if (pool.length === 0) return furnitureType === 'coffee_machine' ? '☕ 來杯咖啡~' : '🛋️ 休息一下'
  return pool[Math.floor(Math.random() * pool.length)].text
}
