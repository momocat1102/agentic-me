/**
 * Central Command Agent Bridge
 * Replaces OpenClaw's agentBridge with CC API + WebSocket integration.
 */

import { OfficeState } from './engine/officeState'

export interface CCAgentActivity {
  agentId: string
  agentName: string
  status: 'working' | 'idle' | 'offline'
  lastActiveAt: string | null
  currentProject: string | null
  currentSessionId: string | null
}

/** Track which character IDs map to which agent IDs */
const agentIdMap = new Map<string, number>()
let nextCharId = 1

/** Track previous states to detect changes */
const prevAgentStates = new Map<string, string>()

/** Snippet timer for working agents */
let snippetInterval: ReturnType<typeof setInterval> | null = null
let snippetOffice: OfficeState | null = null

const workingSnippets = [
  '💻 寫 code 中...', '🔍 在讀程式碼...', '✏️ 改東西中...', '🧪 跑測試中...',
  '📝 寫文件中...', '🔧 修 bug 中...', '📦 build 中...', '🤔 想一下...',
  '🔀 重構中...', '📊 分析資料中...', '🚀 要部署了！', '⚡ 效能優化中...',
  '💻 coding...', '🔍 reading...', '✏️ editing...', '🤔 thinking...',
  '😤 這什麼鬼啊', '🧐 讓我看看...', '💪 衝了！', '🎯 快完成了！',
  '📖 看文件中...', '🐛 找 bug 中...', '✅ 過了過了！', '😅 差點忘記...',
]
const idleSnippets = [
  '☕ 休息一下~', '💤 好睏...', '🎵 ♪♫', '👀 看看四周...',
  '🥱 打個哈欠', '🍜 好餓喔...', '📱 滑一下手機', '☕ 來杯咖啡',
  '🤙 等等要開會', '😴 想睡了...', '🌤️ 天氣不錯', '💭 在想事情...',
]

function startSnippetLoop(): void {
  if (snippetInterval) return
  snippetInterval = setInterval(() => {
    if (!snippetOffice) return
    for (const [agentId, charId] of agentIdMap) {
      const status = prevAgentStates.get(agentId)
      if (status === 'working' && Math.random() < 0.35) {
        const snippet = workingSnippets[Math.floor(Math.random() * workingSnippets.length)]
        snippetOffice.pushCodeSnippet(charId, snippet)
      } else if (status === 'idle' && Math.random() < 0.25) {
        const snippet = idleSnippets[Math.floor(Math.random() * idleSnippets.length)]
        snippetOffice.pushCodeSnippet(charId, snippet)
      }
    }
  }, 4000)
}

function stopSnippetLoop(): void {
  if (snippetInterval) {
    clearInterval(snippetInterval)
    snippetInterval = null
  }
  snippetOffice = null
}

/**
 * Sync CC agent activities to the OfficeState.
 * Called when we receive new activity data (via polling or WebSocket).
 */
export function syncAgentsToOffice(
  activities: CCAgentActivity[],
  office: OfficeState,
): void {
  const currentAgentIds = new Set(activities.map(a => a.agentId))

  // Remove agents that are no longer registered
  for (const [agentId, charId] of agentIdMap) {
    if (!currentAgentIds.has(agentId)) {
      office.removeAgent(charId)
      agentIdMap.delete(agentId)
      prevAgentStates.delete(agentId)
    }
  }

  for (const activity of activities) {
    // Offline agents get removed from the office
    if (activity.status === 'offline') {
      if (agentIdMap.has(activity.agentId)) {
        const charId = agentIdMap.get(activity.agentId)!
        office.removeAgent(charId)
        agentIdMap.delete(activity.agentId)
      }
      prevAgentStates.set(activity.agentId, 'offline')
      continue
    }

    let charId = agentIdMap.get(activity.agentId)
    if (charId === undefined) {
      charId = nextCharId++
      agentIdMap.set(activity.agentId, charId)
      const wasOffline = prevAgentStates.get(activity.agentId) === 'offline'
      const isNew = !prevAgentStates.has(activity.agentId)
      office.addAgent(charId, undefined, undefined, undefined, undefined, wasOffline || isNew)
    }

    // Set label (agent name + project if working)
    const ch = office.characters.get(charId)
    if (ch) {
      ch.label = activity.agentName || activity.agentId
      if (activity.status === 'working' && activity.currentProject) {
        ch.label += ` [${activity.currentProject}]`
      }
    }

    // Detect state transitions for bubble effects
    const prevStatus = prevAgentStates.get(activity.agentId)
    const statusChanged = prevStatus !== undefined && prevStatus !== activity.status

    switch (activity.status) {
      case 'working':
        office.setAgentActive(charId, true)
        office.setAgentTool(charId, null)
        if (statusChanged) {
          office.dismissBubble(charId)
          const proj = activity.currentProject || activity.agentName
          office.pushCodeSnippet(charId, `🚀 ${proj}`)
        }
        break
      case 'idle':
        office.setAgentActive(charId, false)
        office.setAgentTool(charId, null)
        if (statusChanged && prevStatus === 'working') {
          office.showWaitingBubble(charId)
          office.pushCodeSnippet(charId, '✅ done!')
        }
        break
    }

    // Keep snippet loop alive
    snippetOffice = office
    startSnippetLoop()

    prevAgentStates.set(activity.agentId, activity.status)
  }
}

/**
 * Reverse-lookup: given a character ID, return the CC agentId string (or undefined).
 */
export function getAgentIdByCharId(charId: number): string | undefined {
  for (const [agentId, cId] of agentIdMap) {
    if (cId === charId) return agentId
  }
  return undefined
}

/**
 * Reset all bridge state (e.g., when page unmounts).
 */
export function resetBridge(): void {
  agentIdMap.clear()
  prevAgentStates.clear()
  nextCharId = 1
  stopSnippetLoop()
}

/**
 * Fetch agent activity from CC API.
 */
export async function fetchAgentActivity(): Promise<CCAgentActivity[]> {
  const res = await fetch('/api/agents/activity')
  if (!res.ok) return []
  return res.json()
}

/**
 * Create a WebSocket connection for real-time updates.
 * Returns a cleanup function.
 */
export function connectActivityWebSocket(
  onUpdate: (activities: CCAgentActivity[]) => void,
  wsPort = 4001,
): () => void {
  const wsUrl = `ws://localhost:${wsPort}`
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  function connect() {
    if (stopped) return
    try {
      ws = new WebSocket(wsUrl)

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'agent:activity' && Array.isArray(msg.payload)) {
            onUpdate(msg.payload as CCAgentActivity[])
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!stopped) {
          reconnectTimer = setTimeout(connect, 5000)
        }
      }

      ws.onerror = () => {
        ws?.close()
      }
    } catch {
      if (!stopped) {
        reconnectTimer = setTimeout(connect, 5000)
      }
    }
  }

  connect()

  return () => {
    stopped = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    ws?.close()
  }
}
