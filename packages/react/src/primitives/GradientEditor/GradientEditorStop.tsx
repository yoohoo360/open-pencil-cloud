import type {
  GradientEditorStopActions,
  GradientEditorStopProps,
  GradientEditorStopSlotProps
} from '#react/primitives/GradientEditor/types'
import { memo, useCallback, useMemo, type KeyboardEvent, type ReactNode } from 'react'

import { colorToCSS, colorToHexRaw } from '@open-pencil/core/color'

export type GradientEditorStopComponentProps = GradientEditorStopProps & {
  children?: ReactNode | ((props: GradientEditorStopSlotProps) => ReactNode)
  onSelect?: (index: number) => void
  onUpdatePosition?: (index: number, position: number) => void
  onUpdateColor?: (index: number, hex: string) => void
  onUpdateOpacity?: (index: number, opacity: number) => void
  onRemove?: (index: number) => void
}

export const GradientEditorStop = memo(function GradientEditorStop({
  stop,
  index,
  active,
  dragging = false,
  interactive = true,
  removable = true,
  positionStep = 1,
  label,
  children,
  onSelect,
  onUpdatePosition,
  onUpdateColor,
  onUpdateOpacity,
  onRemove,
  ...props
}: GradientEditorStopComponentProps) {
  const positionPercent = Math.round(stop.position * 100)
  const opacityPercent = Math.round(stop.color.a * 100)
  const accessibleLabel = label ?? `Gradient stop ${index + 1}`
  const actions = useMemo<GradientEditorStopActions>(
    () => ({
      select: () => onSelect?.(index),
      updatePosition: (position) => onUpdatePosition?.(index, position),
      updateColor: (hex) => onUpdateColor?.(index, hex),
      updateOpacity: (opacity) => onUpdateOpacity?.(index, opacity),
      remove: () => onRemove?.(index)
    }),
    [index, onRemove, onSelect, onUpdateColor, onUpdateOpacity, onUpdatePosition]
  )
  const slotProps = useMemo<GradientEditorStopSlotProps>(
    () => ({
      stop,
      index,
      active,
      selected: active,
      dragging,
      positionPercent,
      opacityPercent,
      hex: colorToHexRaw(stop.color),
      css: colorToCSS(stop.color),
      actions
    }),
    [actions, active, dragging, index, opacityPercent, positionPercent, stop]
  )
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!interactive) return
      const amount = positionStep * (event.shiftKey ? 10 : 1)
      let nextPosition: number | undefined
      if (event.code === 'ArrowLeft' || event.code === 'ArrowDown')
        nextPosition = positionPercent - amount
      else if (event.code === 'ArrowRight' || event.code === 'ArrowUp')
        nextPosition = positionPercent + amount
      else if (event.code === 'Home') nextPosition = 0
      else if (event.code === 'End') nextPosition = 100
      else if ((event.code === 'Delete' || event.code === 'Backspace') && removable) {
        event.preventDefault()
        event.stopPropagation()
        actions.remove()
        return
      }
      if (nextPosition === undefined) return
      event.preventDefault()
      event.stopPropagation()
      actions.updatePosition(Math.max(0, Math.min(100, nextPosition)))
    },
    [actions, interactive, positionPercent, positionStep, removable]
  )

  return (
    <div
      {...props}
      aria-label={interactive ? accessibleLabel : undefined}
      aria-valuemax={interactive ? 100 : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuenow={interactive ? positionPercent : undefined}
      aria-valuetext={interactive ? `${positionPercent}%` : undefined}
      data-dragging={dragging ? '' : undefined}
      data-selected={active ? '' : undefined}
      data-slot="stop"
      onClick={actions.select}
      onFocus={actions.select}
      onKeyDown={onKeyDown}
      role={interactive ? 'slider' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {typeof children === 'function' ? children(slotProps) : children}
    </div>
  )
})

GradientEditorStop.displayName = 'GradientEditorStop'
