import { useRef, useState, type ReactNode } from 'react'

import type { GradientStop } from '@open-pencil/scene-graph'

interface GradientEditorBarSlotProps {
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  draggingIndex: number | null
  actions: {
    stopPointerDown: (index: number, e: PointerEvent) => void
  }
}

interface GradientEditorBarProps {
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  ui?: { bar?: string }
  onSelectStop?: (index: number) => void
  onDragStop?: (index: number, position: number) => void
  children?: ReactNode | ((props: GradientEditorBarSlotProps) => ReactNode)
}

export function GradientEditorBar({
  stops,
  activeStopIndex,
  barBackground,
  ui,
  onSelectStop,
  onDragStop,
  children
}: GradientEditorBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  function stopPointerDown(index: number, e: PointerEvent) {
    onSelectStop?.(index)
    setDraggingIndex(index)
    barRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const el = barRef.current
    if (!el || draggingIndex === null || !el.hasPointerCapture(e.pointerId)) return
    const rect = el.getBoundingClientRect()
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onDragStop?.(draggingIndex, pos)
  }

  function onPointerUp() {
    setDraggingIndex(null)
  }

  const slotProps: GradientEditorBarSlotProps = {
    stops,
    activeStopIndex,
    barBackground,
    draggingIndex,
    actions: { stopPointerDown }
  }

  return (
    <div
      ref={barRef}
      className={ui?.bar}
      style={{ background: barBackground }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {typeof children === 'function' ? children(slotProps) : children}
    </div>
  )
}
