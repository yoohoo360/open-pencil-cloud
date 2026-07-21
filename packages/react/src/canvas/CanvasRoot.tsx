import { memo, useMemo, useRef, useState, type ReactNode } from 'react'

import { useCanvas, type UseCanvasOptions } from '#react/canvas/surface/use'
import { CanvasContextProvider } from '#react/canvas/context'
import { useEditor } from '#react/editor/context'

export type CanvasRootProps = UseCanvasOptions & {
  children: ReactNode
}

/** Provides the canvas surface and renderer-backed interaction helpers. */
export const CanvasRoot = memo(function CanvasRoot({
  children,
  showRulers,
  preserveDrawingBuffer
}: CanvasRootProps) {
  const editor = useEditor()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ready, setReady] = useState(false)
  const { renderNow, hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = useCanvas(
    canvasRef,
    editor,
    { showRulers, preserveDrawingBuffer, onReady: () => setReady(true) }
  )

  const context = useMemo(
    () => ({
      canvasRef,
      ready,
      renderNow,
      hitTestSectionTitle,
      hitTestComponentLabel,
      hitTestFrameTitle
    }),
    [ready, renderNow, hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle]
  )

  return <CanvasContextProvider value={context}>{children}</CanvasContextProvider>
})
