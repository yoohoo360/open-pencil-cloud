import { useRef, useState, type ReactNode } from 'react'

import type { GradientStop } from '@open-pencil/core'

export interface GradientEditorBarProps {
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  onSelectStop: (index: number) => void
  onDragStop: (index: number, position: number) => void
  children: (ctx: {
    stops: GradientStop[]
    activeStopIndex: number
    barBackground: string
    barRef: React.RefObject<HTMLElement | null>
    draggingIndex: number | null
    onStopPointerDown: (index: number, e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: () => void
  }) => ReactNode
}

export function GradientEditorBar({
  stops,
  activeStopIndex,
  barBackground,
  onSelectStop,
  onDragStop,
  children
}: GradientEditorBarProps) {
  const barRef = useRef<HTMLElement | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  function onStopPointerDown(index: number, e: React.PointerEvent) {
    onSelectStop(index)
    setDraggingIndex(index)
    barRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const el = barRef.current
    if (!el || draggingIndex === null || !el.hasPointerCapture(e.pointerId)) return
    const rect = el.getBoundingClientRect()
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onDragStop(draggingIndex, pos)
  }

  function onPointerUp() {
    setDraggingIndex(null)
  }

  return (
    <>
      {children({
        stops,
        activeStopIndex,
        barBackground,
        barRef,
        draggingIndex,
        onStopPointerDown,
        onPointerMove,
        onPointerUp
      })}
    </>
  )
}

export default GradientEditorBar
