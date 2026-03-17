'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { OfficeState } from '@/lib/pixel-office/engine/officeState'
import { renderFrame, type EditorRenderState } from '@/lib/pixel-office/engine/renderer'
import { startGameLoop } from '@/lib/pixel-office/engine/gameLoop'
import {
  syncAgentsToOffice,
  resetBridge,
  fetchAgentActivity,
  getAgentIdByCharId,
  type CCAgentActivity,
} from '@/lib/pixel-office/ccBridge'
import { getCatalogEntry, isRotatable } from '@/lib/pixel-office/layout/furnitureCatalog'
import { assignTilesetImage, deserializeLayout, createDefaultLayout } from '@/lib/pixel-office/layout/layoutSerializer'
import type { OfficeLayout, PlacedFurniture } from '@/lib/pixel-office/types'
import { TileType, TILE_SIZE } from '@/lib/pixel-office/types'
import { EditorState } from '@/lib/pixel-office/editor'
import { createWebSocket, api, type WSMessage } from '@/lib/api'
import FurniturePalette from './FurniturePalette'
import * as catSpriteSheet from '@/lib/pixel-office/sprites/catSpriteSheet'
import { Viewport } from '@/lib/pixel-office/engine/viewport'
import { DayNightCycle } from '@/lib/pixel-office/engine/dayNightCycle'
import { ParticleSystem } from '@/lib/pixel-office/engine/particles'
import { isPipSupported, isPipActive, launchPip, closePip } from '@/lib/pixel-office/pip'

// ── localStorage 持久化 ────────────────────────────────────────

const LAYOUT_STORAGE_KEY = 'pixel-office-layout'

/** 儲存佈局到 localStorage */
function saveLayout(layout: OfficeLayout): void {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // localStorage 滿了或不可用，靜默忽略
  }
}

/** 從 localStorage 載入佈局，失敗時回傳 null */
function loadLayoutFromStorage(): OfficeLayout | null {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return null
    return deserializeLayout(raw)
  } catch {
    return null
  }
}

// ── Agent Chip Bar ─────────────────────────────────────────────

function AgentChip({ activity }: { activity: CCAgentActivity }) {
  const dotColor = activity.status === 'working' ? 'bg-green-400' :
    activity.status === 'idle' ? 'bg-yellow-400' : 'bg-gray-600'
  const textColor = activity.status === 'offline' ? 'text-gray-500' : 'text-gray-200'
  const pulseClass = activity.status === 'working' ? 'animate-pulse' : ''
  const statusLabel = activity.status === 'working' ? 'WORKING' :
    activity.status === 'idle' ? 'IDLE' : 'OFFLINE'
  const statusColor = activity.status === 'working' ? 'text-green-400' :
    activity.status === 'idle' ? 'text-yellow-400' : 'text-gray-500'

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 ${textColor}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor} ${pulseClass}`} />
      <span className="text-xs font-bold whitespace-nowrap">{activity.agentName}</span>
      <span className={`text-[10px] font-medium ${statusColor}`}>{statusLabel}</span>
    </div>
  )
}

// ── Furniture Info Popover ──────────────────────────────────────

interface FurniturePopoverProps {
  type: string
  position: { x: number; y: number }
  onClose: () => void
}

function FurniturePopover({ type, position, onClose }: FurniturePopoverProps) {
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        let result: unknown
        switch (type) {
          case 'whiteboard':
            result = await api.projects.list()
            break
          case 'pc':
          case 'pc_back':
            result = await api.tasks.list({ limit: 5 })
            break
          case 'ts_clock':
            result = await api.schedules.list()
            break
          case 'server_rack':
            result = await (await fetch('/api/health')).json()
            break
          case 'coffee_machine':
            result = { type: 'coffee_machine' }
            break
          case 'sofa':
            result = await (await fetch('/api/agents/activity')).json().catch(() => [])
            break
          case 'bookshelf':
          case 'library':
            result = { type: 'bookshelf' }
            break
          case 'fridge':
          case 'ts_fridge':
            result = { type: 'fridge' }
            break
          case 'plant':
          case 'potted_plant':
          case 'ts_plant_small':
            result = { type: 'plant' }
            break
          default:
            result = null
        }
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [type])

  const title: Record<string, string> = {
    whiteboard: '📊 專案進度',
    pc: '💻 最近任務',
    pc_back: '💻 最近任務',
    ts_clock: '🕐 排程',
    server_rack: '🖥️ 系統狀態',
    coffee_machine: '☕ 咖啡機',
    sofa: '🛋️ Agent 休息統計',
    bookshelf: '📚 記憶庫',
    library: '📚 記憶庫',
    fridge: '🧊 冰箱',
    ts_fridge: '🧊 冰箱',
    plant: '🌱 植物',
    potted_plant: '🌱 植物',
    ts_plant_small: '🌱 植物',
  }
  const displayTitle = title[type] || type

  return (
    <div
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 min-w-64 max-w-80 max-h-64 overflow-y-auto text-sm"
      style={{ left: Math.min(position.x, window.innerWidth - 340), top: Math.min(position.y, window.innerHeight - 280) }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-white">{displayTitle}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      {loading ? (
        <div className="text-gray-400">載入中...</div>
      ) : data ? (
        <FurnitureContent type={type} data={data} />
      ) : (
        <div className="text-gray-500">無資料</div>
      )}
    </div>
  )
}

/** Client-only random message to avoid SSR hydration mismatch */
function RandomMessageDisplay({ messages, subtitle, prefix }: { messages: string[]; subtitle: string; prefix?: string }) {
  const [msg, setMsg] = useState(messages[0])
  useEffect(() => { setMsg(messages[Math.floor(Math.random() * messages.length)]) }, [messages])
  return (
    <div className="text-gray-300 space-y-2">
      {prefix && <div className="text-2xl text-center py-1">{prefix}</div>}
      <div className={`${prefix ? '' : 'text-lg'} text-center py-2`}>{msg}</div>
      <div className="text-xs text-gray-500 text-center">{subtitle}</div>
    </div>
  )
}

function FurnitureContent({ type, data }: { type: string; data: unknown }) {
  if (type === 'whiteboard' && Array.isArray(data)) {
    return (
      <ul className="space-y-1">
        {data.map((p: { id: string; name: string; status: string }) => (
          <li key={p.id} className="flex items-center justify-between text-gray-300">
            <span>{p.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              p.status === 'active' ? 'bg-green-500/20 text-green-400' :
              p.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>{p.status}</span>
          </li>
        ))}
        {data.length === 0 && <li className="text-gray-500">尚無專案</li>}
      </ul>
    )
  }

  if ((type === 'pc' || type === 'pc_back') && Array.isArray(data)) {
    return (
      <ul className="space-y-1">
        {data.map((t: { id: string; summary?: string; status: string; completedAt?: string }) => (
          <li key={t.id} className="text-gray-300">
            <div className="truncate">{t.summary || '(no summary)'}</div>
            <div className="text-xs text-gray-500">{t.completedAt ? new Date(t.completedAt).toLocaleString() : ''}</div>
          </li>
        ))}
        {data.length === 0 && <li className="text-gray-500">尚無任務</li>}
      </ul>
    )
  }

  if (type === 'ts_clock' && Array.isArray(data)) {
    return (
      <ul className="space-y-1">
        {data.map((s: { id: string; name: string; enabled: boolean; cronExpr: string }) => (
          <li key={s.id} className="flex items-center justify-between text-gray-300">
            <span className="truncate">{s.name}</span>
            <span className={`text-xs ${s.enabled ? 'text-green-400' : 'text-gray-500'}`}>
              {s.enabled ? '啟用' : '停用'}
            </span>
          </li>
        ))}
        {data.length === 0 && <li className="text-gray-500">尚無排程</li>}
      </ul>
    )
  }

  if (type === 'server_rack' && typeof data === 'object' && data !== null) {
    const health = data as { status: string; uptime?: number; services?: Record<string, { status: string }> }
    return (
      <div className="space-y-1 text-gray-300">
        <div>狀態：<span className={health.status === 'healthy' ? 'text-green-400' : 'text-red-400'}>{health.status}</span></div>
        {health.uptime && <div>運行時間：{Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</div>}
        {health.services && Object.entries(health.services).map(([name, svc]) => (
          <div key={name} className="flex justify-between">
            <span>{name}</span>
            <span className={svc.status === 'ok' ? 'text-green-400' : 'text-red-400'}>{svc.status}</span>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'coffee_machine') {
    return <RandomMessageDisplay messages={[
      '正在沖泡完美的一杯... 請稍候 ☕',
      '今日特調：Debug 拿鐵，加倍濃縮！',
      'Error 418: I\'m a teapot... 開玩笑的，我是咖啡機！',
      '咖啡因注入中... 生產力 +100%',
      'git commit -m "需要更多咖啡"',
      '第 87 杯咖啡，誰在算呢？',
      '正在將咖啡豆編譯為美式咖啡...',
    ]} subtitle="點擊補充咖啡因，繼續奮鬥！" />
  }

  if (type === 'sofa' && Array.isArray(data)) {
    const agents = data as Array<{ agentName: string; status: string; lastActive?: string }>
    return (
      <div className="space-y-1.5 text-gray-300">
        <div className="text-xs text-gray-500 mb-1">Agent 近 24 小時活動狀態</div>
        {agents.map((a) => (
          <div key={a.agentName} className="flex items-center justify-between">
            <span className="text-xs">{a.agentName}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              a.status === 'working' ? 'bg-green-500/20 text-green-400' :
              a.status === 'idle' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-500'
            }`}>{a.status}</span>
          </div>
        ))}
        {agents.length === 0 && <div className="text-gray-500 text-xs">無 Agent 活動資料</div>}
      </div>
    )
  }

  if ((type === 'bookshelf' || type === 'library')) {
    return (
      <div className="text-gray-300 space-y-2">
        <div className="text-center py-2">📖 記憶庫瀏覽</div>
        <div className="text-xs text-gray-500 text-center">Agent 的長期記憶儲存在這裡</div>
        <div className="text-xs text-gray-400 text-center italic">&quot;知識就是力量&quot;</div>
      </div>
    )
  }

  if (type === 'fridge' || type === 'ts_fridge') {
    return <RandomMessageDisplay messages={[
      '冰箱裡只有昨天的便當和過期的牛奶...',
      '發現一罐能量飲料！HP+50 🥤',
      '冰箱說：「我很冷，但我很酷」',
      '有人放了一張紙條：「這是我的午餐，請不要動！」',
      '裡面有一個神秘的保鮮盒，上面寫著 v0.1.0-alpha',
      '冰箱溫度正常，但裡面的東西看起來不太正常...',
      'npm install --save fresh-food 安裝失敗',
      '發現一包零食，保存期限是 2077 年',
      '冰箱正在進行自我除霜... 請稍候',
      '裡面有人寫的 TODO：「買更多零食」',
      '404: Food Not Found',
    ]} subtitle="辦公室冰箱，充滿驚喜" />
  }

  if (type === 'plant' || type === 'potted_plant' || type === 'ts_plant_small') {
    return <RandomMessageDisplay
      prefix="💧🌱"
      messages={[
        '你今天做得很好！繼續加油 🌟',
        '休息一下也沒關係，植物也需要陽光 ☀️',
        '每一行程式碼都是一片新葉子 🍃',
        '澆水完成！植物看起來更精神了',
        '感謝你的照顧，我會努力長大 🌿',
        '今天的 bug 都會被解決的，就像雜草一樣',
      ]}
      subtitle="點擊澆水，植物感謝你！"
    />
  }

  return <div className="text-gray-500">無法顯示此家具資訊</div>
}

// ── Agent Info Popover ─────────────────────────────────────────

interface AgentPopoverProps {
  agentId: string
  position: { x: number; y: number }
  onClose: () => void
}

function AgentPopover({ agentId, position, onClose }: AgentPopoverProps) {
  const [agent, setAgent] = useState<{ agentName: string; status: string; currentProject?: string } | null>(null)
  const [tasks, setTasks] = useState<Array<{ id: string; summary?: string; status: string; completedAt?: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [actRes, taskRes] = await Promise.all([
          fetch('/api/agents/activity').then(r => r.json()).catch(() => []),
          api.tasks.list({ limit: 3 }),
        ])
        if (cancelled) return
        const acts = actRes as Array<{ agentId: string; agentName: string; status: string; currentProject?: string }>
        const found = acts.find((a: { agentId: string }) => a.agentId === agentId)
        if (found) setAgent(found)
        const agentTasks = (taskRes as Array<{ id: string; summary?: string; status: string; completedAt?: string; agentId?: string }>)
          .filter((t) => t.agentId === agentId)
          .slice(0, 3)
        setTasks(agentTasks)
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [agentId])

  return (
    <div
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 min-w-64 max-w-80 max-h-72 overflow-y-auto text-sm"
      style={{ left: Math.min(position.x, window.innerWidth - 340), top: Math.min(position.y, window.innerHeight - 300) }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-white">🤖 Agent 狀態</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      {loading ? (
        <div className="text-gray-400">載入中...</div>
      ) : agent ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{agent.agentName}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              agent.status === 'working' ? 'bg-green-500/20 text-green-400' :
              agent.status === 'idle' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-500'
            }`}>{agent.status === 'working' ? 'WORKING' : agent.status === 'idle' ? 'IDLE' : 'OFFLINE'}</span>
          </div>
          {agent.currentProject && (
            <div className="text-xs text-gray-400">專案：{agent.currentProject}</div>
          )}
          {tasks.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">最近任務</div>
              <ul className="space-y-1">
                {tasks.map(t => (
                  <li key={t.id} className="text-xs text-gray-300 truncate">
                    {t.summary || '(no summary)'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500">找不到此 Agent</div>
      )}
    </div>
  )
}

// ── 匯出佈局（下載 JSON 檔案） ────────────────────────────────

function exportLayout(layout: OfficeLayout) {
  const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pixel-office-layout-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Editor Toolbar ─────────────────────────────────────────────

interface EditorToolbarProps {
  onExport: () => void
  onImport: () => void
  onReset: () => void
  onFinish: () => void
}

function EditorToolbar({ onExport, onImport, onReset, onFinish }: EditorToolbarProps) {
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-gray-900/95 border border-white/10 rounded-lg shadow-xl z-40">
      <button
        onClick={onExport}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10 transition-colors"
        title="匯出佈局 JSON 檔案"
      >
        📥 匯出
      </button>
      <button
        onClick={onImport}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10 transition-colors"
        title="匯入佈局 JSON 檔案"
      >
        📤 匯入
      </button>
      <button
        onClick={onReset}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-white/5 text-gray-300 hover:bg-red-500/20 hover:text-red-300 border border-transparent hover:border-red-500/30 transition-colors"
        title="重置為預設佈局"
      >
        🔄 重置
      </button>
      <div className="w-px h-4 bg-white/10" />
      <button
        onClick={onFinish}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded bg-green-600/80 text-white hover:bg-green-500/80 border border-green-500/50 transition-colors"
        title="完成編輯"
      >
        ✅ 完成
      </button>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────

export default function PixelOfficePage() {
  // SSR guard: this page is purely canvas-based, skip server render entirely
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="flex flex-col md:flex-row -mx-4 sm:-mx-6 lg:-mx-8 -my-6" style={{ height: 'calc(100vh - 56px)' }}>
        <div className="flex-1 bg-gray-950" />
      </div>
    )
  }

  return <PixelOfficeContent />
}

function PixelOfficeContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const officeRef = useRef<OfficeState | null>(null)
  const [activities, setActivities] = useState<CCAgentActivity[]>([])
  const [popover, setPopover] = useState<{ type: string; x: number; y: number; agentId?: string } | null>(null)
  const [wsConnected, setWsConnected] = useState(true)
  const photographRef = useRef<HTMLImageElement | null>(null)
  const coffeeMachineRef = useRef<HTMLImageElement | null>(null)
  const catSheetRef = useRef<HTMLImageElement | null>(null)
  const agentCatSheetRef = useRef<HTMLImageElement | null>(null)
  const furnitureTilesetRef = useRef<HTMLImageElement | null>(null)
  const viewportRef = useRef(new Viewport())
  const dayNightRef = useRef(new DayNightCycle())
  const particlesRef = useRef<ParticleSystem | null>(null)
  const lastOffsetRef = useRef({ offsetX: 0, offsetY: 0 })
  const [dayNightEnabled, setDayNightEnabled] = useState(true)
  const editorRef = useRef(new EditorState())
  const [editMode, setEditMode] = useState(false)
  const [placingType, setPlacingType] = useState<string | null>(null)
  const [selectedFurnitureUid, setSelectedFurnitureUid] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [pipActive, setPipActive] = useState(false)
  const [pipSupported, setPipSupported] = useState(false)

  // Check PiP support on mount
  useEffect(() => {
    setPipSupported(isPipSupported())
  }, [])

  // ── 匯出/匯入/重置 callbacks ──────────────────────────────────

  const handleExport = useCallback(() => {
    const office = officeRef.current
    if (!office) return
    exportLayout(office.layout)
  }, [])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = reader.result as string
        const layout = deserializeLayout(raw)
        if (!layout) return
        saveLayout(layout)
        const office = officeRef.current
        if (office) {
          office.rebuildFromLayout(layout)
          // 重新指派 tileset 圖片
          if (furnitureTilesetRef.current) {
            assignTilesetImage(office.furniture, furnitureTilesetRef.current)
          }
        }
      } catch {
        // JSON 解析失敗，靜默忽略
      }
    }
    reader.readAsText(file)
    // 清空 input 以允許重複匯入同一檔案
    e.target.value = ''
  }, [])

  const handleReset = useCallback(() => {
    if (!window.confirm('確定要重置佈局嗎？所有修改將會遺失。')) return
    localStorage.removeItem(LAYOUT_STORAGE_KEY)
    const layout = createDefaultLayout()
    saveLayout(layout)
    const office = officeRef.current
    if (office) {
      office.rebuildFromLayout(layout)
      if (furnitureTilesetRef.current) {
        assignTilesetImage(office.furniture, furnitureTilesetRef.current)
      }
    }
    // 取消選取/放置狀態
    const ed = editorRef.current
    ed.deselect()
    ed.cancelPlacing()
    setPlacingType(null)
    setSelectedFurnitureUid(null)
  }, [])

  // ── PiP 子母畫面 ─────────────────────────────────────────────

  // Native mouse handlers for PiP window (React events don't follow DOM moves)
  const pipMouseDown = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas || !(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    viewportRef.current.startDrag(
      (e.clientX - rect.left) * dpr,
      (e.clientY - rect.top) * dpr,
    )
    canvas.style.cursor = 'grabbing'
  }, [])

  const pipMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas || !viewportRef.current.isDragging) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    viewportRef.current.drag(
      (e.clientX - rect.left) * dpr,
      (e.clientY - rect.top) * dpr,
    )
  }, [])

  const pipMouseUp = useCallback(() => {
    const canvas = canvasRef.current
    if (!viewportRef.current.isDragging) return
    viewportRef.current.endDrag()
    if (canvas) canvas.style.cursor = ''
  }, [])

  const handleLaunchPip = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const success = await launchPip(canvas, {
      width: 400,
      height: 300,
      onMouseDown: pipMouseDown,
      onMouseMove: pipMouseMove,
      onMouseUp: pipMouseUp,
      onClose: () => {
        setPipActive(false)
        // Restore canvas size after returning to page
        requestAnimationFrame(() => {
          const c = canvasRef.current
          if (c) {
            const dpr = window.devicePixelRatio || 1
            const rect = c.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
              c.width = rect.width * dpr
              c.height = rect.height * dpr
            }
          }
        })
      },
    })
    if (success) {
      setPipActive(true)
      // Exit edit mode when entering PiP
      if (editorRef.current.mode === 'edit') {
        editorRef.current.toggleMode()
        setEditMode(false)
        setPlacingType(null)
        setSelectedFurnitureUid(null)
      }
    }
  }, [pipMouseDown, pipMouseMove, pipMouseUp])

  const handleClosePip = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    closePip(canvas)
    setPipActive(false)
  }, [])

  const handleFinishEdit = useCallback(() => {
    const ed = editorRef.current
    ed.toggleMode()
    setEditMode(false)
    setPlacingType(null)
    setSelectedFurnitureUid(null)
    const canvas = canvasRef.current
    if (canvas) canvas.style.cursor = ''
  }, [])

  // Initialize office
  useEffect(() => {
    // 從 localStorage 載入佈局，若無則使用預設佈局
    const savedLayout = loadLayoutFromStorage()
    const office = new OfficeState(savedLayout ?? undefined, 'zh-TW')
    officeRef.current = office

    // Load photograph for right room wall
    const photoPool = Array.from({ length: 13 }, (_, i) => `/assets/pixel-office/my-photographic-works/${i + 1}.webp`)
    const photoSrc = photoPool[Math.floor(Math.random() * photoPool.length)]
    const img = new Image()
    img.onload = () => { photographRef.current = img }
    img.src = photoSrc

    // Load coffee machine GIF
    const coffeeImg = new Image()
    coffeeImg.onload = () => { coffeeMachineRef.current = coffeeImg }
    coffeeImg.src = '/assets/pixel-office/coffee-machine.gif'

    // Load pet cat sprite sheet — try Last tick first, fallback to LPC
    const catImg = new Image()
    catImg.onload = () => {
      catSheetRef.current = catImg
      catSpriteSheet.setUseLastTickSheet(true)
    }
    catImg.onerror = () => {
      // Fallback to LPC cats
      const fallbackImg = new Image()
      fallbackImg.onload = () => {
        catSheetRef.current = fallbackImg
        catSpriteSheet.setUseLastTickSheet(false)
      }
      fallbackImg.src = catSpriteSheet.CAT_SHEET_URL_FALLBACK
    }
    catImg.src = catSpriteSheet.CAT_SHEET_URL_PRIMARY

    // Load agent cat NPC sprite sheet (Neko Cafe Asset Pack, HelloRumin)
    const agentCatImg = new Image()
    agentCatImg.onload = () => { agentCatSheetRef.current = agentCatImg }
    agentCatImg.src = '/assets/pixel-office/neko-cafe/cats.png'

    // Load Neko Cafe furniture tileset
    const furnitureImg = new Image()
    furnitureImg.onload = () => {
      furnitureTilesetRef.current = furnitureImg
      if (officeRef.current) {
        assignTilesetImage(officeRef.current.furniture, furnitureImg)
      }
    }
    furnitureImg.src = '/assets/pixel-office/neko-cafe/furnitures.png'

    return () => {
      resetBridge()
    }
  }, [])

  // Sync activities to office
  const syncToOffice = useCallback((acts: CCAgentActivity[]) => {
    setActivities(acts)
    if (officeRef.current) {
      syncAgentsToOffice(acts, officeRef.current)
    }
  }, [])

  // Initial fetch + polling fallback
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null

    async function initialFetch() {
      const acts = await fetchAgentActivity()
      syncToOffice(acts)
    }
    initialFetch()

    // Polling fallback (every 15s)
    pollTimer = setInterval(async () => {
      const acts = await fetchAgentActivity()
      syncToOffice(acts)
    }, 15_000)

    return () => {
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [syncToOffice])

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = createWebSocket((msg: WSMessage) => {
      if (msg.type === 'agent:activity' && Array.isArray(msg.payload)) {
        syncToOffice(msg.payload as CCAgentActivity[])
      }
    })

    // Track connection state via periodic check
    const checkInterval = setInterval(async () => {
      try {
        const acts = await fetchAgentActivity()
        setWsConnected(true)
        syncToOffice(acts)
      } catch {
        setWsConnected(false)
      }
    }, 60_000)

    return () => {
      ws.close()
      clearInterval(checkInterval)
    }
  }, [syncToOffice])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    const office = officeRef.current
    if (!canvas || !office) return

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      particlesRef.current?.resize(canvas.width, canvas.height)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize particle system with canvas dimensions
    if (!particlesRef.current) {
      particlesRef.current = new ParticleSystem(canvas.width, canvas.height)
    }

    const stop = startGameLoop(canvas, {
      update: (dt) => {
        office.update(dt)
        dayNightRef.current.update(dt)
        particlesRef.current?.update(dt)
      },
      render: (ctx) => {
        // Re-assign furniture tileset image each frame (handles furniture array recreation)
        if (furnitureTilesetRef.current) {
          assignTilesetImage(office.furniture, furnitureTilesetRef.current)
        }
        const vp = viewportRef.current
        // 編輯模式：傳遞網格覆蓋層狀態（含 ghost 預覽與選取高亮）
        const ed = editorRef.current
        // 取得 ghost 預覽資訊（放置模式或拖曳模式時）
        let ghostSprite = null as import('@/lib/pixel-office/types').SpriteData | null
        let ghostFootprintW: number | undefined
        let ghostFootprintH: number | undefined
        let ghostEmoji: string | null = null
        const ghostType = ed.isDragging && ed.selectedUid
          ? office.layout.furniture.find((f: PlacedFurniture) => f.uid === ed.selectedUid)?.type ?? null
          : ed.placingType
        if (ghostType && ed.ghostCol >= 0) {
          const ghostEntry = getCatalogEntry(ghostType)
          if (ghostEntry) {
            if (ghostEntry.sprite && ghostEntry.sprite.length > 0 && ghostEntry.sprite[0].length > 0) {
              ghostSprite = ghostEntry.sprite
            }
            ghostFootprintW = ghostEntry.footprintW
            ghostFootprintH = ghostEntry.footprintH
            ghostEmoji = ghostEntry.emoji ?? null
          }
        }
        // 取得選中家具的位置與尺寸
        let selCol = 0, selRow = 0, selW = 0, selH = 0, hasSel = false, selRotatable = false
        if (ed.selectedUid && office) {
          const selItem = office.layout.furniture.find((f: PlacedFurniture) => f.uid === ed.selectedUid)
          if (selItem) {
            const selEntry = getCatalogEntry(selItem.type)
            selCol = selItem.col
            selRow = selItem.row
            selW = selEntry?.footprintW ?? 1
            selH = selEntry?.footprintH ?? 1
            hasSel = true
            selRotatable = isRotatable(selItem.type)
          }
        }
        const editorRenderState = ed.mode === 'edit' ? {
          showGrid: true,
          ghostSprite,
          ghostFootprintW,
          ghostFootprintH,
          ghostEmoji,
          ghostCol: ed.ghostCol,
          ghostRow: ed.ghostRow,
          ghostValid: !ed.isColliding,
          selectedCol: selCol,
          selectedRow: selRow,
          selectedW: selW,
          selectedH: selH,
          hasSelection: hasSel,
          isRotatable: selRotatable,
          deleteButtonBounds: null,
          rotateButtonBounds: null,
          showGhostBorder: false,
          ghostBorderHoverCol: -1,
          ghostBorderHoverRow: -1,
        } : undefined

        const result = renderFrame(
          ctx,
          canvas.width,
          canvas.height,
          office.tileMap,
          office.furniture,
          Array.from(office.characters.values()),
          vp.zoom,
          vp.offsetX,
          vp.offsetY,
          undefined, // no selection
          editorRenderState,
          office.layout.tileColors,
          office.layout.cols,
          office.layout.rows,
          office.getBugs(),
          undefined, // no contributions
          photographRef.current ?? undefined,
          undefined, // no gatewayHealthy
          coffeeMachineRef.current ?? undefined,
          catSheetRef.current ?? undefined,
          agentCatSheetRef.current ?? undefined,
        )
        lastOffsetRef.current = result

        // Night glow on furniture (in world coordinates, using layout furniture with type/col/row)
        dayNightRef.current.renderGlow(
          ctx,
          office.layout.furniture,
          vp.zoom,
          result.offsetX,
          result.offsetY,
        )

        // Particles (screen space)
        particlesRef.current?.render(ctx, vp.zoom, result.offsetX, result.offsetY)

        // Day-night overlay (screen space, on top of everything)
        dayNightRef.current.renderOverlay(ctx, canvas.width, canvas.height)
      },
    })

    // Pause when not visible
    const handleVisibility = () => {
      // gameLoop already handles this via requestAnimationFrame
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stop()
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // ── 家具選取回呼（palette → 進入放置模式） ──────────────────
  const handleSelectFurnitureFromPalette = useCallback((type: string) => {
    const ed = editorRef.current
    ed.startPlacing(type)
    setPlacingType(type)
    setSelectedFurnitureUid(null)
    // 設定游標為十字
    const canvas = canvasRef.current
    if (canvas) canvas.style.cursor = 'crosshair'
  }, [])

  // ── 刪除選中家具 ──────────────────────────────────────────────
  const handleDeleteSelected = useCallback(() => {
    const ed = editorRef.current
    const office = officeRef.current
    if (!ed.selectedUid || !office) return
    office.layout.furniture = office.layout.furniture.filter(
      (f: PlacedFurniture) => f.uid !== ed.selectedUid,
    )
    saveLayout(office.layout)
    // 重新建構 officeState（刷新 tileMap、seats 等）
    office.rebuildFromLayout(office.layout)
    ed.deselect()
    setSelectedFurnitureUid(null)
  }, [])

  // Canvas click → furniture interaction (viewport-aware)
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // PiP 模式下不處理互動
    if (isPipActive()) return
    const canvas = canvasRef.current
    const office = officeRef.current
    if (!canvas || !office) return

    // 拖曳後不觸發 click
    if (viewportRef.current.isDragging) return
    // 編輯模式拖曳家具後不觸發 click
    if (editorRef.current.isDragging) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const canvasX = (e.clientX - rect.left) * dpr
    const canvasY = (e.clientY - rect.top) * dpr

    // 使用上一幀的渲染偏移量（含置中 + viewport pan）
    const { offsetX, offsetY } = lastOffsetRef.current
    const vp = viewportRef.current

    // 轉換為 tile 座標
    const tileCol = Math.floor((canvasX - offsetX) / (TILE_SIZE * vp.zoom))
    const tileRow = Math.floor((canvasY - offsetY) / (TILE_SIZE * vp.zoom))

    const ed = editorRef.current

    // ── 編輯模式：放置家具 ──
    if (ed.mode === 'edit' && ed.tool === 'place' && ed.placingType) {
      if (ed.isColliding) return // 碰撞中不可放置
      const entry = getCatalogEntry(ed.placingType)
      if (!entry) return

      // 檢查是否在地圖範圍內
      if (ed.ghostCol < 0 || ed.ghostRow < 0) return
      if (ed.ghostCol + entry.footprintW > office.layout.cols) return
      if (ed.ghostRow + entry.footprintH > office.layout.rows) return

      // 檢查 tile 類型（牆壁 vs 地板）
      if (!entry.canPlaceOnWalls) {
        for (let r = ed.ghostRow; r < ed.ghostRow + entry.footprintH; r++) {
          for (let c = ed.ghostCol; c < ed.ghostCol + entry.footprintW; c++) {
            const tileVal = office.tileMap[r]?.[c]
            if (tileVal === TileType.WALL || tileVal === TileType.VOID) return
          }
        }
      }

      // 建立新家具
      const newFurniture: PlacedFurniture = {
        uid: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: ed.placingType,
        col: ed.ghostCol,
        row: ed.ghostRow,
      }
      office.layout.furniture.push(newFurniture)
      saveLayout(office.layout)
      office.rebuildFromLayout(office.layout)
      // 繼續放置模式（可連續放）
      return
    }

    // ── 編輯模式：選取家具 ──
    if (ed.mode === 'edit' && ed.tool === 'select') {
      const hitFurniture = office.layout.furniture.find((f: PlacedFurniture) => {
        const fEntry = getCatalogEntry(f.type)
        const fw = fEntry?.footprintW ?? 1
        const fh = fEntry?.footprintH ?? 1
        return tileCol >= f.col && tileCol < f.col + fw && tileRow >= f.row && tileRow < f.row + fh
      })
      if (hitFurniture) {
        ed.select(hitFurniture.uid)
        setSelectedFurnitureUid(hitFurniture.uid)
        setPlacingType(null)
        return
      }
      // 點空白處取消選取
      ed.deselect()
      setSelectedFurnitureUid(null)
      return
    }

    // ── 檢視模式：原有互動邏輯 ──

    // 檢查是否點到角色
    for (const ch of office.characters.values()) {
      const chCol = Math.floor(ch.x / TILE_SIZE)
      const chRow = Math.floor(ch.y / TILE_SIZE)
      if (chCol === tileCol && chRow === tileRow) {
        const ccAgentId = getAgentIdByCharId(ch.id)
        if (ccAgentId) {
          setPopover({ type: 'agent', x: e.clientX, y: e.clientY, agentId: ccAgentId })
          return
        }
      }
    }

    // 檢查是否點到可互動家具
    const interactable = ['whiteboard', 'pc', 'pc_back', 'ts_clock', 'server_rack', 'coffee_machine', 'sofa', 'bookshelf', 'library', 'fridge', 'ts_fridge', 'plant', 'potted_plant', 'ts_plant_small']
    const hit = office.layout.furniture.find((f: PlacedFurniture) => {
      if (!interactable.includes(f.type)) return false
      const entry = getCatalogEntry(f.type)
      const fw = entry?.footprintW ?? 2
      const fh = entry?.footprintH ?? 2
      return tileCol >= f.col && tileCol < f.col + fw && tileRow >= f.row && tileRow < f.row + fh
    })
    if (hit) {
      setPopover({ type: hit.type, x: e.clientX, y: e.clientY })
      return
    }

    // 點空白處關閉彈窗
    setPopover(null)
  }, [])

  // Ctrl+drag pan (Task 6.3) + 編輯模式拖曳
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const office = officeRef.current
    if (!canvas || !office) return

    // Ctrl+拖曳 = 視角平移
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      viewportRef.current.startDrag(
        (e.clientX - rect.left) * dpr,
        (e.clientY - rect.top) * dpr,
      )
      canvas.style.cursor = 'grabbing'
      return
    }

    // 編輯模式：選取工具時按下滑鼠 → 開始拖曳選中家具
    const ed = editorRef.current
    if (ed.mode === 'edit' && ed.tool === 'select' && ed.selectedUid) {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const canvasX = (e.clientX - rect.left) * dpr
      const canvasY = (e.clientY - rect.top) * dpr
      const { offsetX, offsetY } = lastOffsetRef.current
      const vp = viewportRef.current
      const tileCol = Math.floor((canvasX - offsetX) / (TILE_SIZE * vp.zoom))
      const tileRow = Math.floor((canvasY - offsetY) / (TILE_SIZE * vp.zoom))

      // 檢查是否按在選中家具上
      const selItem = office.layout.furniture.find((f: PlacedFurniture) => f.uid === ed.selectedUid)
      if (selItem) {
        const selEntry = getCatalogEntry(selItem.type)
        const fw = selEntry?.footprintW ?? 1
        const fh = selEntry?.footprintH ?? 1
        if (tileCol >= selItem.col && tileCol < selItem.col + fw &&
            tileRow >= selItem.row && tileRow < selItem.row + fh) {
          ed.isDragging = true
          ed.dragStartCol = selItem.col
          ed.dragStartRow = selItem.row
          ed.ghostCol = selItem.col
          ed.ghostRow = selItem.row
          canvas.style.cursor = 'grabbing'
        }
      }
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const office = officeRef.current
    if (!canvas || !office) return

    // 視角平移拖曳
    if (viewportRef.current.isDragging) {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      viewportRef.current.drag(
        (e.clientX - rect.left) * dpr,
        (e.clientY - rect.top) * dpr,
      )
      return
    }

    const ed = editorRef.current
    if (ed.mode !== 'edit') return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left) * dpr
    const canvasY = (e.clientY - rect.top) * dpr
    const { offsetX, offsetY } = lastOffsetRef.current
    const vp = viewportRef.current

    // 轉換為 tile 座標
    const tileCol = Math.floor((canvasX - offsetX) / (TILE_SIZE * vp.zoom))
    const tileRow = Math.floor((canvasY - offsetY) / (TILE_SIZE * vp.zoom))

    // ── 放置模式：ghost 預覽跟隨滑鼠 ──
    if (ed.tool === 'place' && ed.placingType) {
      ed.ghostCol = tileCol
      ed.ghostRow = tileRow
      // 碰撞檢測
      const entry = getCatalogEntry(ed.placingType)
      if (entry) {
        ed.isColliding = ed.checkCollision(
          tileCol, tileRow, entry.footprintW, entry.footprintH,
          office.layout.furniture,
        )
        // 範圍外也視為碰撞
        if (tileCol < 0 || tileRow < 0 ||
            tileCol + entry.footprintW > office.layout.cols ||
            tileRow + entry.footprintH > office.layout.rows) {
          ed.isColliding = true
        }
        // 牆壁/void 檢查
        if (!entry.canPlaceOnWalls && !ed.isColliding) {
          for (let r = tileRow; r < tileRow + entry.footprintH; r++) {
            for (let c = tileCol; c < tileCol + entry.footprintW; c++) {
              const tv = office.tileMap[r]?.[c]
              if (tv === TileType.WALL || tv === TileType.VOID || tv === undefined) {
                ed.isColliding = true
                break
              }
            }
            if (ed.isColliding) break
          }
        }
      }
      return
    }

    // ── 拖曳模式：移動選中家具的 ghost ──
    if (ed.isDragging && ed.selectedUid) {
      ed.ghostCol = tileCol
      ed.ghostRow = tileRow
      const selItem = office.layout.furniture.find((f: PlacedFurniture) => f.uid === ed.selectedUid)
      if (selItem) {
        const selEntry = getCatalogEntry(selItem.type)
        if (selEntry) {
          ed.isColliding = ed.checkCollision(
            tileCol, tileRow, selEntry.footprintW, selEntry.footprintH,
            office.layout.furniture, ed.selectedUid,
          )
          if (tileCol < 0 || tileRow < 0 ||
              tileCol + selEntry.footprintW > office.layout.cols ||
              tileRow + selEntry.footprintH > office.layout.rows) {
            ed.isColliding = true
          }
        }
      }
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    const canvas = canvasRef.current
    const office = officeRef.current

    // 視角平移結束
    if (viewportRef.current.isDragging) {
      viewportRef.current.endDrag()
      if (canvas) canvas.style.cursor = ''
      return
    }

    // 編輯模式拖曳結束：移動家具
    const ed = editorRef.current
    if (ed.isDragging && ed.selectedUid && office) {
      if (!ed.isColliding) {
        const selItem = office.layout.furniture.find((f: PlacedFurniture) => f.uid === ed.selectedUid)
        if (selItem) {
          selItem.col = ed.ghostCol
          selItem.row = ed.ghostRow
          saveLayout(office.layout)
          office.rebuildFromLayout(office.layout)
        }
      }
      ed.isDragging = false
      if (canvas) canvas.style.cursor = ''
    }
  }, [])

  // Ctrl+wheel zoom (Task 6.4)
  // We compute zoom manually instead of using viewport.zoomAt because
  // renderFrame adds centering offsets on top of panX/panY, so we need to
  // account for the centering shift when zoom changes.
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const canvas = canvasRef.current
    const office = officeRef.current
    if (!canvas || !office) return

    const vp = viewportRef.current
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left) * dpr
    const canvasY = (e.clientY - rect.top) * dpr

    const oldZoom = vp.zoom
    const delta = e.deltaY < 0 ? 1 : -1
    const newZoom = Math.min(6, Math.max(1, oldZoom + delta * 0.25))
    if (newZoom === oldZoom) return

    const TILE_SIZE = 16
    const cols = office.layout.cols
    const rows = office.layout.rows

    // Current render offset = centering + pan
    const { offsetX: oldRenderX, offsetY: oldRenderY } = lastOffsetRef.current

    // World point under cursor at old zoom
    const worldX = (canvasX - oldRenderX) / (TILE_SIZE * oldZoom)
    const worldY = (canvasY - oldRenderY) / (TILE_SIZE * oldZoom)

    // New centering at new zoom (same formula as renderFrame)
    const newMapW = cols * TILE_SIZE * newZoom
    const newMapH = rows * TILE_SIZE * newZoom
    const newCenterX = Math.floor((canvas.width - newMapW) / 2)
    const newCenterY = Math.floor((canvas.height - newMapH) / 2) + Math.round(TILE_SIZE * newZoom * 0.6)

    // New pan so that cursor stays on the same world point
    // canvasX = worldX * TILE_SIZE * newZoom + newCenterX + newPanX
    vp.offsetX = canvasX - worldX * TILE_SIZE * newZoom - newCenterX
    vp.offsetY = canvasY - worldY * TILE_SIZE * newZoom - newCenterY
    vp.zoom = newZoom
  }, [])

  // Attach wheel handler with { passive: false } to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // 鍵盤事件：Delete/Backspace 刪除選中家具、Escape 取消放置
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ed = editorRef.current
      if (ed.mode !== 'edit') return

      if (e.key === 'Escape') {
        if (ed.placingType) {
          ed.cancelPlacing()
          setPlacingType(null)
          const canvas = canvasRef.current
          if (canvas) canvas.style.cursor = ''
        } else if (ed.selectedUid) {
          ed.deselect()
          setSelectedFurnitureUid(null)
        }
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && ed.selectedUid) {
        // 避免在 input 元素內觸發
        if ((e.target as HTMLElement)?.tagName === 'INPUT') return
        e.preventDefault()
        handleDeleteSelected()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleDeleteSelected])

  // Reset viewport (Task 6.6)
  const handleResetViewport = useCallback(() => {
    viewportRef.current.reset()
  }, [])

  return (
    <div className="flex flex-col md:flex-row -mx-4 sm:-mx-6 lg:-mx-8 -my-6" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Agent Chip Panel — top on mobile, left sidebar on desktop */}
      <div className="md:w-52 flex-shrink-0 bg-gray-900/90 md:border-r border-b md:border-b-0 border-white/10 flex md:flex-col">
        <div className="px-3 py-2 md:border-b border-white/10 flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-white tracking-wide">AGENTS</span>
          {!wsConnected && (
            <span className="ml-auto text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full">
              離線
            </span>
          )}
        </div>
        <div className="flex-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto px-2 py-2 flex md:flex-col gap-1.5 flex-row md:flex-nowrap">
          {activities.length === 0 ? (
            <span className="text-xs text-gray-500 text-center py-1 md:py-3 whitespace-nowrap">等待 Agent 活動資料...</span>
          ) : (
            [...activities].sort((a, b) => {
              const pri = (s: string) => s === 'working' ? 0 : s === 'idle' ? 1 : 2
              const d = pri(a.status) - pri(b.status)
              return d !== 0 ? d : a.agentName.localeCompare(b.agentName)
            }).map(a => <AgentChip key={a.agentId} activity={a} />)
          )}
        </div>
      </div>

      {/* Canvas — fills remaining space */}
      <div ref={canvasContainerRef} className="flex-1 relative min-h-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full bg-gray-950"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* PiP 彈出後的佔位提示 */}
        {pipActive && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-950/90">
            <div className="text-6xl mb-4">🖥️</div>
            <p className="text-white/70 text-sm mb-4">已彈出至子母畫面</p>
            <button
              onClick={handleClosePip}
              className="px-4 py-2 text-sm font-bold rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              收回
            </button>
          </div>
        )}

        {/* Viewport controls (top-right) */}
        {!pipActive && (
        <div className="absolute top-2 right-2 flex gap-1.5">
          {pipSupported && (
            <button
              onClick={handleLaunchPip}
              className="px-2 py-1 text-[10px] font-bold rounded bg-black/50 text-white/70 hover:text-white hover:bg-black/70 border border-white/10 transition-colors"
              title="彈出子母畫面 (Picture-in-Picture)"
            >
              ⧉ 子母畫面
            </button>
          )}
          <button
            onClick={() => {
              const ed = editorRef.current
              ed.toggleMode()
              const isEdit = ed.mode === 'edit'
              setEditMode(isEdit)
              if (!isEdit) {
                setPlacingType(null)
                setSelectedFurnitureUid(null)
                const canvas = canvasRef.current
                if (canvas) canvas.style.cursor = ''
              }
            }}
            className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
              editMode
                ? 'bg-green-600/80 text-white border-green-500/50 hover:bg-green-500/80'
                : 'bg-black/50 text-white/70 hover:text-white hover:bg-black/70 border-white/10'
            }`}
            title={editMode ? '完成編輯' : '進入編輯模式'}
          >
            {editMode ? '✓ 完成編輯' : '✏️ 編輯'}
          </button>
          <button
            onClick={() => {
              const dnc = dayNightRef.current
              dnc.enabled = !dnc.enabled
              setDayNightEnabled(dnc.enabled)
            }}
            className="px-2 py-1 text-[10px] font-bold rounded bg-black/50 text-white/70 hover:text-white hover:bg-black/70 border border-white/10 transition-colors"
            title="切換日夜循環"
          >
            {dayNightEnabled ? '🌙' : '☀️'}
          </button>
          <button
            onClick={handleResetViewport}
            className="px-2 py-1 text-[10px] font-bold rounded bg-black/50 text-white/70 hover:text-white hover:bg-black/70 border border-white/10 transition-colors"
            title="重置視角 (zoom 3×, 置中)"
          >
            ⟲ 重置
          </button>
        </div>
        )}

        {/* Popover (furniture or agent) */}
        {popover && popover.type === 'agent' && popover.agentId != null && (
          <AgentPopover
            agentId={popover.agentId}
            position={{ x: popover.x, y: popover.y }}
            onClose={() => setPopover(null)}
          />
        )}
        {popover && popover.type !== 'agent' && (
          <FurniturePopover
            type={popover.type}
            position={{ x: popover.x, y: popover.y }}
            onClose={() => setPopover(null)}
          />
        )}

        {/* 家具面板（編輯模式時顯示，PiP 時隱藏） */}
        <FurniturePalette
          visible={editMode && !pipActive}
          selectedType={placingType}
          onSelectFurniture={handleSelectFurnitureFromPalette}
        />

        {/* 編輯工具列（編輯模式時顯示，PiP 時隱藏） */}
        {editMode && !pipActive && (
          <EditorToolbar
            onExport={handleExport}
            onImport={handleImport}
            onReset={handleReset}
            onFinish={handleFinishEdit}
          />
        )}

        {/* 隱藏的檔案輸入（匯入用） */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
    </div>
  )
}
