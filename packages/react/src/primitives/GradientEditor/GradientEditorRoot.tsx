import { useMemo, type ReactNode } from 'react'

import { useGradientStops } from '#react/primitives/GradientEditor/useGradientStops'

import type { Fill, GradientStop } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

type GradientSubtype = 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND'

interface GradientEditorRootSlotProps {
  stops: GradientStop[]
  subtype: GradientSubtype
  subtypes: { value: GradientSubtype; label: string }[]
  activeStopIndex: number
  activeColor: Color | undefined
  barBackground: string
  actions: {
    setSubtype: (type: GradientSubtype) => void
    selectStop: (index: number) => void
    addStop: () => void
    removeStop: (index: number) => void
    updateStopPosition: (index: number, position: number) => void
    updateStopColor: (index: number, hex: string) => void
    updateStopOpacity: (index: number, opacity: number) => void
    updateActiveColor: (color: Color) => void
    dragStop: (index: number, position: number) => void
  }
}

interface GradientEditorRootProps {
  fill: Fill
  onUpdate?: (fill: Fill) => void
  children?: ReactNode | ((props: GradientEditorRootSlotProps) => ReactNode)
}

export function GradientEditorRoot({ fill, onUpdate, children }: GradientEditorRootProps) {
  const fillRef = useMemo(() => ({ value: fill }), [fill])

  const {
    activeStopIndex,
    stops,
    subtype,
    subtypes,
    activeColor,
    barBackground,
    setSubtype,
    selectStop,
    addStop,
    removeStop,
    updateStopPosition,
    updateStopColor,
    updateStopOpacity,
    updateActiveColor,
    dragStop
  } = useGradientStops(fillRef, (updated) => onUpdate?.(updated))

  const actions = {
    setSubtype,
    selectStop,
    addStop,
    removeStop,
    updateStopPosition,
    updateStopColor,
    updateStopOpacity,
    updateActiveColor,
    dragStop
  }

  const slotProps: GradientEditorRootSlotProps = {
    stops: stops.value,
    subtype: subtype.value,
    subtypes,
    activeStopIndex: activeStopIndex.value,
    activeColor: activeColor.value,
    barBackground: barBackground.value,
    actions
  }

  return typeof children === 'function' ? <>{children(slotProps)}</> : <>{children}</>
}
