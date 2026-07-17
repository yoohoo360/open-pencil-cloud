import { useRef, useState, type ReactNode } from 'react'

import { useEditor } from '#react/editor/context'
import { useCanvas, type UseCanvasOptions } from '#react/canvas/surface/use'
import { CanvasContextProvider } from '#react/canvas/context'
import type { CanvasContext } from '#react/canvas/context'
import type { SceneNode } from '@open-pencil/scene-graph'

interface CanvasRootSlotProps {
  canvasRef: { value: HTMLCanvasElement | null }
  ready: boolean
  renderNow: () => void
}

type CanvasRootProps = UseCanvasOptions & {
  children?: ReactNode | ((props: CanvasRootSlotProps) => ReactNode)
}

export function CanvasRoot({ children, showRulers, preserveDrawingBuffer, onReady }: CanvasRootProps) {
  const editor = useEditor()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ready, setReady] = useState(false)

  const canvasRefReactive = {
    get value() { return canvasRef.current },
    set value(v: HTMLCanvasElement | null) { canvasRef.current = v }
  }
  const readyReactive = {
    get value() { return ready }
  }

  const { renderNow, hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = useCanvas(
    canvasRefReactive,
    editor,
    {
      showRulers,
      preserveDrawingBuffer,
      onReady: () => {
        setReady(true)
        onReady?.()
      }
    }
  )

  const ctx: CanvasContext = {
    canvasRef: canvasRefReactive,
    ready: readyReactive,
    renderNow,
    hitTestSectionTitle: hitTestSectionTitle as (cx: number, cy: number) => SceneNode | null,
    hitTestComponentLabel: hitTestComponentLabel as (cx: number, cy: number) => SceneNode | null,
    hitTestFrameTitle: hitTestFrameTitle as (cx: number, cy: number) => SceneNode | null
  }

  const slotProps: CanvasRootSlotProps = {
    canvasRef: canvasRefReactive,
    ready,
    renderNow
  }

  return (
    <CanvasContextProvider value={ctx}>
      {typeof children === 'function' ? children(slotProps) : children}
    </CanvasContextProvider>
  )
}
