import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from 'react'

import type { GradientStop } from '@open-pencil/scene-graph'

export type GradientEditorBarSlotProps = {
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  draggingIndex: number | null
  actions: { stopPointerDown: (index: number, event: React.PointerEvent<HTMLDivElement>) => void }
}

export type GradientEditorBarProps = {
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  ui?: { bar?: string }
  children?: ReactNode | ((props: GradientEditorBarSlotProps) => ReactNode)
  onSelectStop?: (index: number) => void
  onDragStop?: (index: number, position: number) => void
}

export const GradientEditorBar = memo(function GradientEditorBar({
  stops,
  activeStopIndex,
  barBackground,
  ui,
  children,
  onSelectStop,
  onDragStop
}: GradientEditorBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const stopPointerDown = useCallback(
    (index: number, event: React.PointerEvent<HTMLDivElement>) => {
      onSelectStop?.(index)
      setDraggingIndex(index)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [onSelectStop]
  )
  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const element = barRef.current
      if (!element || draggingIndex === null || !element.hasPointerCapture(event.pointerId)) return
      const rect = element.getBoundingClientRect()
      onDragStop?.(
        draggingIndex,
        Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      )
    },
    [draggingIndex, onDragStop]
  )
  const slotProps = useMemo<GradientEditorBarSlotProps>(
    () => ({
      stops,
      activeStopIndex,
      barBackground,
      draggingIndex,
      actions: { stopPointerDown }
    }),
    [activeStopIndex, barBackground, draggingIndex, stopPointerDown, stops]
  )

  return (
    <div
      className={ui?.bar}
      onPointerMove={onPointerMove}
      onPointerUp={() => setDraggingIndex(null)}
      ref={barRef}
      style={{ background: barBackground } as CSSProperties}
    >
      {typeof children === 'function' ? children(slotProps) : children}
    </div>
  )
})

GradientEditorBar.displayName = 'GradientEditorBar'
