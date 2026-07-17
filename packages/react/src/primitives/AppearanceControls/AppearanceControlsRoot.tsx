import { type ReactNode } from 'react'

import { useAppearance } from '#react/controls/appearance/use'
import type {
  AppearanceControlsActions,
  AppearanceControlsRootSlotProps,
  AppearanceControlsRootSlots
} from '#react/primitives/AppearanceControls/types'

interface AppearanceControlsRootProps {
  children?: AppearanceControlsRootSlots | ReactNode
}

export function AppearanceControlsRoot({ children }: AppearanceControlsRootProps) {
  const ctx = useAppearance()

  const actions: AppearanceControlsActions = {
    updateProp: ctx.updateProp,
    commitProp: ctx.commitProp,
    setBlendMode: ctx.setBlendMode,
    toggleVisibility: ctx.toggleVisibility,
    toggleIndependentCorners: ctx.toggleIndependentCorners,
    updateCornerProp: ctx.updateCornerProp,
    commitCornerProp: ctx.commitCornerProp
  }

  const slotProps: AppearanceControlsRootSlotProps = {
    node: ctx.node.value,
    isMulti: ctx.isMulti.value,
    active: ctx.active.value,
    hasCornerRadius: ctx.hasCornerRadius.value,
    independentCorners: ctx.independentCorners.value,
    showIndependentCorners: ctx.showIndependentCorners.value,
    cornerRadiusValue: ctx.cornerRadiusValue.value,
    opacityPercent: ctx.opacityPercent.value,
    blendModeValue: ctx.blendModeValue.value,
    visibilityState: ctx.visibilityState.value,
    actions
  }

  if (typeof children === 'function') {
    return <>{(children as (props: AppearanceControlsRootSlotProps) => ReactNode)(slotProps)}</>
  }
  return <>{children}</>
}
