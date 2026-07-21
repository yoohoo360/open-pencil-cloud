import { memo, useCallback, useMemo, type ReactNode } from 'react'

import type { Fill } from '@open-pencil/scene-graph'

import { useFill } from '#react/primitives/Fill/useFill'
import type { FillRootSlotProps } from '#react/primitives/Fill/types'

export type FillRootProps = {
  fill: Fill
  children?: ReactNode | ((props: FillRootSlotProps) => ReactNode)
  onUpdate?: (fill: Fill) => void
}

export const FillRoot = memo(function FillRoot({ fill, children, onUpdate }: FillRootProps) {
  const update = useCallback((next: Fill) => onUpdate?.(next), [onUpdate])
  const model = useFill(fill, update)
  const slotProps = useMemo<FillRootSlotProps>(
    () => ({
      fill,
      category: model.category,
      swatchBackground: model.swatchBackground,
      transparent: model.transparent,
      actions: model.actions
    }),
    [fill, model.actions, model.category, model.swatchBackground, model.transparent]
  )

  return <>{typeof children === 'function' ? children(slotProps) : children}</>
})

FillRoot.displayName = 'FillRoot'
