/**
 * Document Picture-in-Picture API 封裝
 * 將 Pixel Office Canvas 彈出為 OS 層級的 always-on-top 浮動視窗
 */

// ── Feature Detection ────────────────────────────────────────

export function isPipSupported(): boolean {
  return 'documentPictureInPicture' in window
}

// ── PiP State ────────────────────────────────────────────────

let pipWindow: Window | null = null
let originalParent: HTMLElement | null = null
let cleanupFns: (() => void)[] = []

export function isPipActive(): boolean {
  return pipWindow !== null && !pipWindow.closed
}

// ── Launch PiP ───────────────────────────────────────────────

export interface PipOptions {
  width?: number
  height?: number
  onClose?: () => void
  onMouseDown?: (e: MouseEvent) => void
  onMouseMove?: (e: MouseEvent) => void
  onMouseUp?: (e: MouseEvent) => void
}

export async function launchPip(
  canvas: HTMLCanvasElement,
  options: PipOptions = {},
): Promise<boolean> {
  if (!isPipSupported()) return false
  if (isPipActive()) return false

  const { width = 400, height = 300, onClose, onMouseDown, onMouseMove, onMouseUp } = options

  // Remember where the canvas was
  originalParent = canvas.parentElement

  try {
    // Request PiP window
    const docPip = (window as unknown as { documentPictureInPicture: DocumentPictureInPicture }).documentPictureInPicture
    pipWindow = await docPip.requestWindow({ width, height })

    // Inject styles into PiP window
    const style = pipWindow.document.createElement('style')
    style.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: #030712;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100vw;
        height: 100vh;
      }
      canvas {
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
      }
    `
    pipWindow.document.head.appendChild(style)

    // Move canvas into PiP window
    pipWindow.document.body.appendChild(canvas)

    // Re-bindmouse events on the canvas within PiP window (React events don't follow)
    if (onMouseDown) {
      canvas.addEventListener('mousedown', onMouseDown)
      cleanupFns.push(() => canvas.removeEventListener('mousedown', onMouseDown))
    }
    if (onMouseMove) {
      canvas.addEventListener('mousemove', onMouseMove)
      cleanupFns.push(() => canvas.removeEventListener('mousemove', onMouseMove))
    }
    if (onMouseUp) {
      canvas.addEventListener('mouseup', onMouseUp)
      canvas.addEventListener('mouseleave', onMouseUp)
      cleanupFns.push(() => {
        canvas.removeEventListener('mouseup', onMouseUp)
        canvas.removeEventListener('mouseleave', onMouseUp)
      })
    }

    // Handle resize: adjust canvas pixel dimensions
    const handleResize = () => {
      if (!pipWindow || pipWindow.closed) return
      const dpr = pipWindow.devicePixelRatio || 1
      const w = pipWindow.innerWidth
      const h = pipWindow.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    pipWindow.addEventListener('resize', handleResize)
    cleanupFns.push(() => pipWindow?.removeEventListener('resize', handleResize))

    // Trigger initial resize
    handleResize()

    // Handle PiP window close (user clicks X or browser tab closes)
    const handlePageHide = () => {
      restoreCanvas(canvas)
      // Defer onClose to next tick so React state updates after DOM is restored
      setTimeout(() => onClose?.(), 0)
    }
    pipWindow.addEventListener('pagehide', handlePageHide)
    cleanupFns.push(() => pipWindow?.removeEventListener('pagehide', handlePageHide))

    return true
  } catch (err) {
    console.error('[PiP] Failed to launch:', err)
    return false
  }
}

// ── Close PiP ────────────────────────────────────────────────

export function closePip(canvas: HTMLCanvasElement): void {
  if (!pipWindow || pipWindow.closed) {
    // Already closed, just restore canvas if needed
    restoreCanvas(canvas)
    return
  }
  // Closing the window triggers pagehide which calls restoreCanvas
  pipWindow.close()
}

// ── Internal: Restore Canvas ─────────────────────────────────

function restoreCanvas(canvas: HTMLCanvasElement): void {
  // Move canvas back to original parent
  if (originalParent && canvas.parentElement !== originalParent) {
    originalParent.appendChild(canvas)

    // Restore canvas size to fill parent
    requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
      }
    })
  }

  // Cleanup
  for (const fn of cleanupFns) {
    try { fn() } catch { /* ignore */ }
  }
  cleanupFns = []
  pipWindow = null
  originalParent = null
}

// ── TypeScript Declarations ──────────────────────────────────

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
  readonly window: Window | null
}
