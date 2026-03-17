'use client'

import { useMemo } from 'react'
import {
  getActiveCatalog,
  getActiveCategories,
} from '@/lib/pixel-office/layout/furnitureCatalog'
import type { CatalogEntryWithCategory } from '@/lib/pixel-office/layout/furnitureCatalog'

// ── 家具調色盤面板 ──────────────────────────────────────────────

interface FurniturePaletteProps {
  /** 選取家具回呼 */
  onSelectFurniture: (type: string) => void
  /** 目前選中的家具類型（放置中高亮顯示） */
  selectedType: string | null
  /** 是否可見（editMode 時才顯示） */
  visible: boolean
}

/** 顯示家具尺寸文字 */
function footprintLabel(entry: CatalogEntryWithCategory): string {
  return `${entry.footprintW}×${entry.footprintH}`
}

/** 取得家具的視覺指示（emoji 或顏色方塊） */
function visualIndicator(entry: CatalogEntryWithCategory): string {
  if (entry.emoji) return entry.emoji
  if (entry.spriteSource === 'tileset') return '🖼️'
  // 有 sprite 資料的用色塊符號表示
  if (entry.sprite && entry.sprite.length > 0 && entry.sprite[0].length > 0) return '▦'
  return '□'
}

export default function FurniturePalette({ onSelectFurniture, selectedType, visible }: FurniturePaletteProps) {
  // 依 category 分組
  const grouped = useMemo(() => {
    const catalog = getActiveCatalog()
    const categories = getActiveCategories()
    const map = new Map<string, { label: string; items: CatalogEntryWithCategory[] }>()

    for (const cat of categories) {
      map.set(cat.id, { label: cat.label, items: [] })
    }

    for (const entry of catalog) {
      const catId = entry.category ?? 'misc'
      const group = map.get(catId)
      if (group) {
        group.items.push(entry)
      } else {
        // 未知分類歸 misc
        const misc = map.get('misc')
        if (misc) misc.items.push(entry)
      }
    }

    // 過濾空分類
    return Array.from(map.entries())
      .filter(([, g]) => g.items.length > 0)
      .map(([id, g]) => ({ id, ...g }))
  }, [])

  if (!visible) return null

  return (
    <div className="absolute right-2 top-14 bottom-2 w-52 bg-gray-900/95 border border-white/10 rounded-lg shadow-xl overflow-hidden flex flex-col z-40">
      {/* 標題列 */}
      <div className="px-3 py-2 border-b border-white/10 flex-shrink-0">
        <span className="text-xs font-bold text-white tracking-wide">家具面板</span>
      </div>

      {/* 可捲動的家具列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-2">
        {grouped.map((group) => (
          <div key={group.id}>
            {/* 分類標題 */}
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 py-0.5 sticky top-0 bg-gray-900/95">
              {group.label}
            </div>

            {/* 家具項目 */}
            <div className="grid grid-cols-2 gap-1 mt-0.5">
              {group.items.map((entry) => {
                const isSelected = selectedType === entry.type
                return (
                  <button
                    key={entry.type}
                    onClick={() => onSelectFurniture(entry.type)}
                    className={`flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded text-[10px] transition-colors border ${
                      isSelected
                        ? 'bg-blue-600/40 border-blue-400/60 text-white'
                        : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-300 hover:text-white'
                    }`}
                    title={`${entry.label} (${footprintLabel(entry)})`}
                  >
                    {/* 視覺指示 */}
                    <span className="text-base leading-none">{visualIndicator(entry)}</span>
                    {/* 名稱 */}
                    <span className="truncate w-full text-center leading-tight">{entry.label}</span>
                    {/* 尺寸 */}
                    <span className="text-gray-500 text-[8px]">{footprintLabel(entry)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
