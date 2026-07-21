import { useAppearance } from '#react/controls/appearance/use'
import type { AppearanceControlsRootSlotProps } from '#react/primitives/AppearanceControls/types'
import { memo, useMemo, type ReactNode } from 'react'

export type AppearanceControlsRootProps = {
  children?: ReactNode | ((props: AppearanceControlsRootSlotProps) => ReactNode)
}

export const AppearanceControlsRoot = memo(function AppearanceControlsRoot({
  children
}: AppearanceControlsRootProps) {
  const ctx = useAppearance()
  const slotProps = useMemo<AppearanceControlsRootSlotProps>(
    () => ({
      node: ctx.node,
      isMulti: ctx.isMulti,
      active: ctx.active,
      hasCornerRadius: ctx.hasCornerRadius,
      independentCorners: ctx.independentCorners,
      showIndependentCorners: ctx.showIndependentCorners,
      cornerRadiusValue: ctx.cornerRadiusValue,
      cornerSmoothingPercent: ctx.cornerSmoothingPercent,
      opacityPercent: ctx.opacityPercent,
      blendModeValue: ctx.blendModeValue,
      visibilityState: ctx.visibilityState,
      actions: {
        updateProp: ctx.updateProp,
        commitProp: ctx.commitProp,
        setBlendMode: ctx.setBlendMode,
        toggleVisibility: ctx.toggleVisibility,
        toggleIndependentCorners: ctx.toggleIndependentCorners,
        updateCornerProp: ctx.updateCornerProp,
        commitCornerProp: ctx.commitCornerProp
      }
    }),
    [ctx]
  )
  return <>{typeof children === 'function' ? children(slotProps) : children}</>
})

AppearanceControlsRoot.displayName = 'AppearanceControlsRoot'
