import { type ReactNode } from 'react'

import { useTypography } from '../controls/useTypography'

import type { UseTypographyOptions } from '../controls/useTypography'
import type { SceneNode } from '@open-pencil/core'

export interface TypographyControlsRootProps extends UseTypographyOptions {
  children: (ctx: {
    node: SceneNode | null
    weights: { value: number; label: string }[]
    missingFonts: string[]
    hasMissingFonts: boolean
    activeFormatting: string[]
    setFamily: (family: string) => Promise<void>
    setWeight: (weight: number) => Promise<void>
    setAlign: (align: 'LEFT' | 'CENTER' | 'RIGHT') => void
    setDirection: (direction: SceneNode['textDirection']) => void
    toggleBold: () => void
    toggleItalic: () => void
    toggleDecoration: (deco: 'UNDERLINE' | 'STRIKETHROUGH') => void
    onAlignChange: (val: string | null) => void
    onFormattingChange: (val: string[]) => void
    updateProp: (key: string, value: number | string) => void
    commitProp: (key: string, value: number | string, previous: number | string) => void
  }) => ReactNode
}

export function TypographyControlsRoot({ loadFont, children }: TypographyControlsRootProps) {
  const ctx = useTypography({ loadFont })

  function onAlignChange(val: string | null) {
    if (val) ctx.setAlign(val as 'LEFT' | 'CENTER' | 'RIGHT')
  }

  function onFormattingChange(values: string[]) {
    ctx.onFormattingChange(values)
  }

  return (
    <>
      {children({
        node: ctx.node,
        weights: ctx.weights,
        missingFonts: ctx.missingFonts,
        hasMissingFonts: ctx.hasMissingFonts,
        activeFormatting: ctx.activeFormatting,
        setFamily: ctx.setFamily,
        setWeight: ctx.setWeight,
        setAlign: ctx.setAlign,
        setDirection: ctx.setDirection,
        toggleBold: ctx.toggleBold,
        toggleItalic: ctx.toggleItalic,
        toggleDecoration: ctx.toggleDecoration,
        onAlignChange,
        onFormattingChange,
        updateProp: ctx.updateProp,
        commitProp: ctx.commitProp
      })}
    </>
  )
}

export default TypographyControlsRoot
