import type { CanvasKit } from 'canvaskit-wasm'
import { useEffect, type RefObject } from 'react'

type ResizeObserverOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  getCanvasKitValue: () => CanvasKit | null
  resizeCanvas: (canvas: HTMLCanvasElement) => void
}

export function useCanvasResizeObserver({
  canvasRef,
  getCanvasKitValue,
  resizeCanvas
}: ResizeObserverOptions) {
  let resizeRaf = 0

  function cancelResize() {
    cancelAnimationFrame(resizeRaf)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      if (!getCanvasKitValue() || resizeRaf) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        resizeCanvas(canvas)
      })
    })
    observer.observe(canvas)
    return () => {
      observer.disconnect()
      cancelResize()
    }
  }, [canvasRef, getCanvasKitValue, resizeCanvas])

  return { cancelResize }
}
