import { useGradientStops } from '#react/primitives/GradientEditor/useGradientStops'
import { memo, useMemo, type ReactNode } from 'react'

import type { Fill } from '@open-pencil/scene-graph'

export type GradientEditorRootSlotProps = ReturnType<typeof useGradientStops>
export type GradientEditorRootProps = {
  fill: Fill
  children?: ReactNode | ((props: GradientEditorRootSlotProps) => ReactNode)
  onUpdate?: (fill: Fill) => void
}

export const GradientEditorRoot = memo(function GradientEditorRoot({
  fill,
  children,
  onUpdate
}: GradientEditorRootProps) {
  const gradient = useGradientStops(fill, (nextFill) => onUpdate?.(nextFill))
  const slotProps = useMemo(() => gradient, [gradient])

  return <>{typeof children === 'function' ? children(slotProps) : children}</>
})

GradientEditorRoot.displayName = 'GradientEditorRoot'
