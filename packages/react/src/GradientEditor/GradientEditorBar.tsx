import { useRef, useState, type ReactNode, type Ref } from 'react'

import type { GradientStop } from '@open-pencil/core'

export interface GradientEditorBarSlotProps {
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  barRef: Ref<HTMLElement | null>
  onStopPointerDown: (index: number, e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: () => void
  draggingIndex: number | null
}

export interface GradientEditorBarProps {
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  onSelectStop?: (index: number) => void
  onDragStop?: (index: number, position: number) => void
  children?: ReactNode | ((state: GradientEditorBarSlotProps) => ReactNode)
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

  function onStopPointerDown(index: number, e: PointerEvent) {
    onSelectStop?.(index)
    setDraggingIndex(index)
    barRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    const el = barRef.current
    if (!el || draggingIndex === null || !el.hasPointerCapture(e.pointerId)) return
    const rect = el.getBoundingClientRect()
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onDragStop?.(draggingIndex, pos)
  }

  function onPointerUp() {
    setDraggingIndex(null)
  }

  const slot: GradientEditorBarSlotProps = {
    stops,
    activeStopIndex,
    barBackground,
    barRef,
    onStopPointerDown,
    onPointerMove,
    onPointerUp,
    draggingIndex
  }

  return <>{typeof children === 'function' ? children(slot) : children}</>
}
