import type { CanvasKit } from 'canvaskit-wasm'
import { useRef, type RefObject } from 'react'

import type { Editor } from '@open-pencil/core/editor'

import {
  createCanvasSurfaceManager,
  useCanvasSurfaceLifecycle
} from '#react/canvas/surface/lifecycle'
import { createCanvasHitTests, createRulerVisibility } from '#react/canvas/surface/overlays'
import type { UseCanvasOptions } from '#react/canvas/surface/types'

export type { UseCanvasOptions } from '#react/canvas/surface/types'

/**
 * Connects an OpenPencil editor to a real canvas element using CanvasKit.
 *
 * This composable owns renderer creation, surface recreation on resize,
 * render scheduling, and renderer-backed hit testing helpers used by higher-
 * level canvas interaction code.
 */
export function useCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  editor: Editor,
  options?: UseCanvasOptions
) {
  const canvasKit = useRef<CanvasKit | null>(null)
  const lifecycle = useRef({ destroyed: false })
  const ck = () => canvasKit.current
  const isDestroyed = () => lifecycle.current.destroyed
  const shouldShowRulers = createRulerVisibility(options)

  const surface = createCanvasSurfaceManager({
    editor,
    canvasRef,
    options,
    getCanvasKit: ck,
    isDestroyed,
    shouldShowRulers
  })

  useCanvasSurfaceLifecycle({
    canvasRef,
    surface,
    lifecycle: lifecycle.current,
    getCanvasKitValue: ck,
    setCanvasKit: (value) => {
      canvasKit.current = value
    },
    onReady: options?.onReady
  })

  const { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = createCanvasHitTests(
    editor,
    surface.getRenderer
  )

  return {
    render: surface.markDirty,
    renderNow: surface.renderNow,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }
}
