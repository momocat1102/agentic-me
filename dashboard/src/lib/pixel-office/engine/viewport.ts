const MIN_ZOOM = 1
const MAX_ZOOM = 6
const ZOOM_STEP = 0.25
const DEFAULT_ZOOM = 3

export interface ViewportState {
  offsetX: number
  offsetY: number
  zoom: number
}

export class Viewport {
  offsetX = 0
  offsetY = 0
  zoom = DEFAULT_ZOOM

  private dragging = false
  private lastMouseX = 0
  private lastMouseY = 0

  /** Convert screen (canvas) coordinates to world (pixel) coordinates */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.offsetX) / this.zoom,
      y: (screenY - this.offsetY) / this.zoom,
    }
  }

  /** Convert world coordinates to screen coordinates */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.zoom + this.offsetX,
      y: worldY * this.zoom + this.offsetY,
    }
  }

  /** Apply transform to canvas context before rendering */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, this.offsetX, this.offsetY)
  }

  /** Reset canvas transform (for UI elements drawn in screen space) */
  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.resetTransform()
  }

  /** Zoom towards a point (screen coordinates) */
  zoomAt(screenX: number, screenY: number, delta: number): void {
    const oldZoom = this.zoom
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom + delta * ZOOM_STEP))
    if (newZoom === oldZoom) return

    // Adjust offset so the point under the cursor stays fixed
    const worldX = (screenX - this.offsetX) / oldZoom
    const worldY = (screenY - this.offsetY) / oldZoom
    this.zoom = newZoom
    this.offsetX = screenX - worldX * newZoom
    this.offsetY = screenY - worldY * newZoom
  }

  /** Start dragging (call on Ctrl+mousedown) */
  startDrag(screenX: number, screenY: number): void {
    this.dragging = true
    this.lastMouseX = screenX
    this.lastMouseY = screenY
  }

  /** Update drag (call on mousemove while dragging) */
  drag(screenX: number, screenY: number): void {
    if (!this.dragging) return
    this.offsetX += screenX - this.lastMouseX
    this.offsetY += screenY - this.lastMouseY
    this.lastMouseX = screenX
    this.lastMouseY = screenY
  }

  /** End dragging */
  endDrag(): void {
    this.dragging = false
  }

  get isDragging(): boolean {
    return this.dragging
  }

  /** Reset to default viewport */
  reset(): void {
    this.offsetX = 0
    this.offsetY = 0
    this.zoom = DEFAULT_ZOOM
    this.dragging = false
  }

  /** Get state snapshot */
  getState(): ViewportState {
    return { offsetX: this.offsetX, offsetY: this.offsetY, zoom: this.zoom }
  }
}
