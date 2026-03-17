import type { PlacedFurniture } from '../types'
import { getCatalogEntry } from '../layout/furnitureCatalog'

// ── 編輯模式與工具型別 ─────────────────────────────────────────

export type EditorMode = 'view' | 'edit'
export type EditorTool = 'select' | 'place' | 'erase'

// ── 編輯器狀態管理 ──────────────────────────────────────────────

export class EditorState {
  mode: EditorMode = 'view'
  tool: EditorTool = 'select'

  /** 正在放置的家具類型（null = 未選擇） */
  placingType: string | null = null

  /** 目前選中的家具 uid（null = 未選中） */
  selectedUid: string | null = null

  /** 是否正在拖曳家具 */
  isDragging = false
  dragStartCol = 0
  dragStartRow = 0

  /** 預覽位置（ghost） */
  ghostCol = 0
  ghostRow = 0

  /** 預覽位置是否碰撞（紅色提示） */
  isColliding = false

  // ── 模式切換 ──

  /** 切換 view/edit 模式 */
  toggleMode(): void {
    if (this.mode === 'view') {
      this.mode = 'edit'
      this.tool = 'select'
    } else {
      this.mode = 'view'
      this.cancelPlacing()
      this.deselect()
    }
  }

  // ── 放置家具 ──

  /** 開始放置指定類型的家具 */
  startPlacing(type: string): void {
    this.placingType = type
    this.tool = 'place'
    this.deselect()
    this.isColliding = false
  }

  /** 取消放置 */
  cancelPlacing(): void {
    this.placingType = null
    if (this.tool === 'place') {
      this.tool = 'select'
    }
    this.isColliding = false
  }

  // ── 選取家具 ──

  /** 選取指定 uid 的家具 */
  select(uid: string): void {
    this.selectedUid = uid
    this.tool = 'select'
    this.placingType = null
  }

  /** 取消選取 */
  deselect(): void {
    this.selectedUid = null
    this.isDragging = false
  }

  // ── 碰撞檢測 ──

  /**
   * 檢查指定位置是否與現有家具碰撞
   * @param col 要放置的欄
   * @param row 要放置的列
   * @param footprintW 家具寬度（tile 數）
   * @param footprintH 家具高度（tile 數）
   * @param furniture 現有的家具列表
   * @param excludeUid 排除的家具 uid（拖曳時排除自身）
   * @returns true = 有碰撞
   */
  checkCollision(
    col: number,
    row: number,
    footprintW: number,
    footprintH: number,
    furniture: PlacedFurniture[],
    excludeUid?: string,
  ): boolean {
    for (const item of furniture) {
      if (excludeUid && item.uid === excludeUid) continue
      const entry = getCatalogEntry(item.type)
      if (!entry) continue

      const itemW = entry.footprintW
      const itemH = entry.footprintH

      // AABB 碰撞檢測
      const noOverlap =
        col + footprintW <= item.col ||
        item.col + itemW <= col ||
        row + footprintH <= item.row ||
        item.row + itemH <= row

      if (!noOverlap) return true
    }
    return false
  }
}
