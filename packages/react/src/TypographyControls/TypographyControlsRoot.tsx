import { useTypography, type UseTypographyOptions } from '../controls/useTypography'

import type { SceneNode } from '@open-pencil/core'
import type { ReactNode } from 'react'

export interface TypographyControlsRootSlotProps {
  node: SceneNode | null
  weights: { value: number; label: string }[]
  missingFonts: string[]
  hasMissingFonts: boolean
  activeFormatting: string[]
  setFamily: (family: string) => Promise<void>
  setWeight: (weight: number) => Promise<void>
  setDirection: (direction: SceneNode['textDirection']) => void
  updateProp: (key: string, value: number | string) => void
  commitProp: (key: string, value: number | string, previous: number | string) => void
  onAlignChange: (val: string | number | null) => void
  onFormattingChange: (val: string | string[]) => void
}

export interface TypographyControlsRootProps extends UseTypographyOptions {
  children?: ReactNode | ((state: TypographyControlsRootSlotProps) => ReactNode)
}

export function TypographyControlsRoot({ loadFont, children }: TypographyControlsRootProps) {
  const ctx = useTypography({ loadFont })

  function onAlignChange(val: string | number | null) {
    if (val) ctx.setAlign(val as 'LEFT' | 'CENTER' | 'RIGHT')
  }

  function onFormattingChange(val: string | string[]) {
    if (Array.isArray(val)) ctx.onFormattingChange(val)
  }

  const slot: TypographyControlsRootSlotProps = {
    node: ctx.node,
    weights: ctx.weights,
    missingFonts: ctx.missingFonts,
    hasMissingFonts: ctx.hasMissingFonts,
    activeFormatting: ctx.activeFormatting,
    setFamily: ctx.setFamily,
    setWeight: ctx.setWeight,
    setDirection: ctx.setDirection,
    updateProp: ctx.updateProp,
    commitProp: ctx.commitProp,
    onAlignChange,
    onFormattingChange
  }

  return <>{typeof children === 'function' ? children(slot) : children}</>
}
