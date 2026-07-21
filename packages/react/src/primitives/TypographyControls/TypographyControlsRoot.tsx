import type { TypographyFontLoader } from '#react/controls/typography/use'
import { useTypography } from '#react/controls/typography/use'
import { memo, useMemo, type ReactNode } from 'react'

export type TypographyControlsRootSlotProps = {
  node: ReturnType<typeof useTypography>['node']
  weights: ReturnType<typeof useTypography>['weights']
  missingFonts: ReturnType<typeof useTypography>['missingFonts']
  hasMissingFonts: ReturnType<typeof useTypography>['hasMissingFonts']
  activeFormatting: ReturnType<typeof useTypography>['activeFormatting']
  actions: {
    setFamily: ReturnType<typeof useTypography>['setFamily']
    setWeight: ReturnType<typeof useTypography>['setWeight']
    setDirection: ReturnType<typeof useTypography>['setDirection']
    setVerticalAlign: ReturnType<typeof useTypography>['setVerticalAlign']
    setTextCase: ReturnType<typeof useTypography>['setTextCase']
    setTruncation: ReturnType<typeof useTypography>['setTruncation']
    setFontFeature: ReturnType<typeof useTypography>['setFontFeature']
    updateProp: ReturnType<typeof useTypography>['updateProp']
    commitProp: ReturnType<typeof useTypography>['commitProp']
    align: ReturnType<typeof useTypography>['setAlign']
    formatting: ReturnType<typeof useTypography>['onFormattingChange']
    toggleBold: ReturnType<typeof useTypography>['toggleBold']
    toggleItalic: ReturnType<typeof useTypography>['toggleItalic']
    toggleDecoration: ReturnType<typeof useTypography>['toggleDecoration']
  }
}

export type TypographyControlsRootProps = {
  fontLoader?: TypographyFontLoader
  children?: ReactNode | ((props: TypographyControlsRootSlotProps) => ReactNode)
}

export const TypographyControlsRoot = memo(function TypographyControlsRoot({
  fontLoader,
  children
}: TypographyControlsRootProps) {
  const ctx = useTypography({ fontLoader })
  const slotProps = useMemo<TypographyControlsRootSlotProps>(
    () => ({
      node: ctx.node,
      weights: ctx.weights,
      missingFonts: ctx.missingFonts,
      hasMissingFonts: ctx.hasMissingFonts,
      activeFormatting: ctx.activeFormatting,
      actions: {
        setFamily: ctx.setFamily,
        setWeight: ctx.setWeight,
        setDirection: ctx.setDirection,
        setVerticalAlign: ctx.setVerticalAlign,
        setTextCase: ctx.setTextCase,
        setTruncation: ctx.setTruncation,
        setFontFeature: ctx.setFontFeature,
        updateProp: ctx.updateProp,
        commitProp: ctx.commitProp,
        align: ctx.setAlign,
        formatting: ctx.onFormattingChange,
        toggleBold: ctx.toggleBold,
        toggleItalic: ctx.toggleItalic,
        toggleDecoration: ctx.toggleDecoration
      }
    }),
    [ctx]
  )
  return <>{typeof children === 'function' ? children(slotProps) : children}</>
})

TypographyControlsRoot.displayName = 'TypographyControlsRoot'
