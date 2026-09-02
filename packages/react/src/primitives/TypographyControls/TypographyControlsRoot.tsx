import { type ReactNode } from 'react'

import { useTypography } from '#react/controls/typography/use'
import type { TypographyFontLoader } from '#react/controls/typography/use'
import type { SceneNode } from '@open-pencil/scene-graph'

interface TypographyControlsActions {
  setFamily: (family: string) => Promise<void>
  setWeight: (weight: number) => Promise<void>
  setDirection: (direction: SceneNode['textDirection']) => void
  updateProp: (key: string, value: number | string) => void
  commitProp: (key: string, value: number | string, previous: number | string) => void
  align: (val: string) => void
  formatting: (val: string[]) => void
  toggleBold: () => void
  toggleItalic: () => void
  toggleDecoration: (deco: 'UNDERLINE' | 'STRIKETHROUGH') => void
}

interface TypographyControlsRootSlotProps {
  node: SceneNode | null
  weights: { value: number; label: string }[]
  missingFonts: string[]
  hasMissingFonts: boolean
  activeFormatting: string[]
  actions: TypographyControlsActions
}

interface TypographyControlsRootProps {
  fontLoader?: TypographyFontLoader
  children?: ReactNode | ((props: TypographyControlsRootSlotProps) => ReactNode)
}

export function TypographyControlsRoot({ fontLoader, children }: TypographyControlsRootProps) {
  const ctx = useTypography({ fontLoader })

  function onAlignChange(val: string) {
    if (val) ctx.setAlign(val as 'LEFT' | 'CENTER' | 'RIGHT')
  }

  function onFormattingChange(val: string[]) {
    ctx.onFormattingChange(val)
  }

  const actions: TypographyControlsActions = {
    setFamily: ctx.setFamily,
    setWeight: ctx.setWeight,
    setDirection: ctx.setDirection,
    updateProp: ctx.updateProp,
    commitProp: ctx.commitProp,
    align: onAlignChange,
    formatting: onFormattingChange,
    toggleBold: ctx.toggleBold,
    toggleItalic: ctx.toggleItalic,
    toggleDecoration: ctx.toggleDecoration
  }

  const slotProps: TypographyControlsRootSlotProps = {
    node: ctx.node.value,
    weights: ctx.weights,
    missingFonts: ctx.missingFonts.value,
    hasMissingFonts: ctx.hasMissingFonts.value,
    activeFormatting: ctx.activeFormatting.value,
    actions
  }

  return typeof children === 'function' ? <>{children(slotProps)}</> : <>{children}</>
}
