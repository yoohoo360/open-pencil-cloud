import { useEffect } from 'react'
import type { CanvasKit } from 'canvaskit-wasm'
import type { ReactiveRef as Ref } from '#react/internal/reactive'

type ResizeObserverOptions = {
  canvasRef: Ref<HTMLCanvasElement | null>
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
    resizeRaf = 0
  }

  useEffect(() => {
    const canvas = canvasRef.value
    if (!canvas || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(() => {
      const el = canvasRef.value
      if (!el || !getCanvasKitValue() || resizeRaf) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        resizeCanvas(el)
      })
    })
    observer.observe(canvas)

    return () => {
      observer.disconnect()
      cancelResize()
    }
  })

  return { cancelResize }
}
