import { useRef, useState, type ReactNode, type RefObject } from 'react'

import { useEditor } from '../context/editorContext'
import { useCanvas, type UseCanvasOptions } from '../shared/useCanvas'
import { CanvasProvider, type CanvasContext } from './context'

export interface CanvasRootSlotProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  ready: boolean
  renderNow: () => void
}

export interface CanvasRootProps extends UseCanvasOptions {
  children?: ReactNode | ((state: CanvasRootSlotProps) => ReactNode)
}

export function CanvasRoot({
  children,
  showRulers,
  preserveDrawingBuffer,
  onReady
}: CanvasRootProps) {
  const editor = useEditor()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ready, setReady] = useState(false)

  const { renderNow, hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = useCanvas(
    canvasRef,
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
    canvasRef,
    ready,
    renderNow,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }

  const slot: CanvasRootSlotProps = { canvasRef, ready, renderNow }
  const content = typeof children === 'function' ? children(slot) : children

  return <CanvasProvider value={ctx}>{content}</CanvasProvider>
}
