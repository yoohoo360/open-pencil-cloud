import { Slot } from '@radix-ui/react-slot'
import { createElement, memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'

import type { Fill } from '@open-pencil/scene-graph'

import { fillCategory, fillIsTransparent, fillSwatchBackground } from '#react/primitives/Fill/useFill'
import type { FillSwatchSlotProps } from '#react/primitives/Fill/types'

export type FillSwatchProps = {
  fill: Fill
  label?: string
  as?: keyof React.JSX.IntrinsicElements
  asChild?: boolean
  children?: ReactNode | ((props: FillSwatchSlotProps) => ReactNode)
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'color'>

export const FillSwatch = memo(function FillSwatch({
  fill,
  label,
  as: As = 'span',
  asChild = false,
  children,
  style,
  ...props
}: FillSwatchProps) {
  const category = fillCategory(fill)
  const background = fillSwatchBackground(fill)
  const transparent = fillIsTransparent(fill)
  const slotProps = useMemo<FillSwatchSlotProps>(
    () => ({ fill, color: fill.color, category, background, transparent }),
    [background, category, fill, transparent]
  )
  const content = typeof children === 'function' ? children(slotProps) : children
  const attributes = {
    ...props,
    'aria-label': label ?? `${category.toLowerCase()} fill`,
    'aria-roledescription': 'fill swatch',
    'data-slot': 'swatch',
    'data-fill-type': fill.type,
    'data-fill-category': category,
    'data-transparent': transparent ? '' : undefined,
    role: 'img',
    style: { ...style, '--open-pencil-fill-swatch-background': background } as React.CSSProperties
  }

  return asChild ? (
    <Slot {...attributes}>{content}</Slot>
  ) : (
    createElement(As, attributes, content)
  )
})

FillSwatch.displayName = 'FillSwatch'
