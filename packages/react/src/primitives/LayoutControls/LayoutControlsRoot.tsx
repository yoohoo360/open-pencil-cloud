import { useLayout } from '#react/controls/layout/use'
import { LayoutControlsProvider } from '#react/primitives/LayoutControls/context'
import type { LayoutControlsRootSlotProps } from '#react/primitives/LayoutControls/types'
import { memo, useMemo, type ReactNode } from 'react'

export type LayoutControlsRootProps = {
  children?: ReactNode | ((props: LayoutControlsRootSlotProps) => ReactNode)
}

export const LayoutControlsRoot = memo(function LayoutControlsRoot({
  children
}: LayoutControlsRootProps) {
  const ctx = useLayout()
  const slotProps = useMemo<LayoutControlsRootSlotProps>(
    () => ({
      editor: ctx.editor,
      node: ctx.node,
      layoutDirection: ctx.layoutDirection,
      gapAuto: ctx.gapAuto,
      isInAutoLayout: ctx.isInAutoLayout,
      isGrid: ctx.isGrid,
      isFlex: ctx.isFlex,
      widthSizing: ctx.widthSizing,
      heightSizing: ctx.heightSizing,
      widthSizingOptions: ctx.widthSizingOptions,
      heightSizingOptions: ctx.heightSizingOptions,
      alignGrid: ctx.alignGrid,
      showIndividualPadding: ctx.showIndividualPadding,
      hasUniformPadding: ctx.hasUniformPadding,
      hasSymmetricPadding: ctx.hasSymmetricPadding,
      trackSizingOptions: ctx.trackSizingOptions,
      trackLabel: ctx.trackLabel,
      actions: {
        updateProp: ctx.updateProp,
        updateSizeLimit: ctx.updateSizeLimit,
        setSizeLimitToCurrent: ctx.setSizeLimitToCurrent,
        commitSizeLimit: ctx.commitSizeLimit,
        addSizeLimit: ctx.addSizeLimit,
        removeSizeLimit: ctx.removeSizeLimit,
        commitProp: ctx.commitProp,
        setAxisSizing: ctx.setAxisSizing,
        updateAxisSize: ctx.updateAxisSize,
        commitAxisSize: ctx.commitAxisSize,
        setHorizontalPadding: ctx.setHorizontalPadding,
        commitHorizontalPadding: ctx.commitHorizontalPadding,
        setVerticalPadding: ctx.setVerticalPadding,
        commitVerticalPadding: ctx.commitVerticalPadding,
        setAlignment: ctx.setAlignment,
        setGapAuto: ctx.setGapAuto,
        setLayoutDirection: ctx.setLayoutDirection,
        updateGridTrack: ctx.updateGridTrack,
        addTrack: ctx.addTrack,
        removeTrack: ctx.removeTrack,
        toggleIndividualPadding: ctx.toggleIndividualPadding
      }
    }),
    [ctx]
  )
  const context = ctx.node ? { ...slotProps, node: ctx.node } : null

  const content = typeof children === 'function' ? children(slotProps) : children
  return context ? (
    <LayoutControlsProvider value={context}>{content}</LayoutControlsProvider>
  ) : (
    <>{content}</>
  )
})

LayoutControlsRoot.displayName = 'LayoutControlsRoot'
