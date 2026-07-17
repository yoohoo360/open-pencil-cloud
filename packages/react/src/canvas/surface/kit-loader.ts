import type { CanvasKit } from 'canvaskit-wasm'
import { useEffect } from 'react'
import type { ReactiveRef as Ref } from '#react/internal/reactive'
import { getCanvasKit } from '@open-pencil/core/canvaskit'

type CanvasKitLoaderOptions = {
  canvasRef: Ref<HTMLCanvasElement | null>
  lifecycle: { destroyed: boolean }
  setCanvasKit: (ck: CanvasKit | null) => void
  createSurface: (canvas: HTMLCanvasElement) => void
  loadFonts: () => Promise<unknown> | undefined
  renderNow: () => void
  onReady?: () => void
}

export function useCanvasKitLoader({
  canvasRef,
  lifecycle,
  setCanvasKit,
  createSurface,
  loadFonts,
  renderNow,
  onReady
}: CanvasKitLoaderOptions) {
  const isDestroyed = () => lifecycle.destroyed

  async function init() {
    const canvas = canvasRef.value
    if (!canvas || isDestroyed()) return

    setCanvasKit(await getCanvasKit())
    if (isDestroyed()) return

    await new Promise((resolve) => {
      requestAnimationFrame(resolve)
    })
    createSurface(canvas)
    await loadFonts()
    if (isDestroyed()) return
    renderNow()
    onReady?.()
  }

  useEffect(() => {
    void init()
    return () => {
      lifecycle.destroyed = true
    }
  }, [])
}
