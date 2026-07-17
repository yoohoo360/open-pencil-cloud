import { useMemo, type ReactNode } from 'react'

import { colorToCSS } from '@open-pencil/core'

import type { Fill, GradientStop } from '@open-pencil/core'

type FillCategory = 'SOLID' | 'GRADIENT' | 'IMAGE'

const FILL_CATEGORY: Record<string, FillCategory> = {
  SOLID: 'SOLID',
  GRADIENT_LINEAR: 'GRADIENT',
  GRADIENT_RADIAL: 'GRADIENT',
  GRADIENT_ANGULAR: 'GRADIENT',
  GRADIENT_DIAMOND: 'GRADIENT',
  IMAGE: 'IMAGE'
}

function gradientCSS(stops: GradientStop[]): string {
  return stops.map((s) => `${colorToCSS(s.color)} ${s.position * 100}%`).join(', ')
}

function fillSwatchBg(fill: Fill): string {
  if (fill.type === 'SOLID') return colorToCSS(fill.color)
  if (FILL_CATEGORY[fill.type] === 'GRADIENT' && fill.gradientStops?.length) {
    return `linear-gradient(to right, ${gradientCSS(fill.gradientStops)})`
  }
  if (fill.type === 'IMAGE') return fill.imageUrl ? `url(${fill.imageUrl})` : '#888'
  return colorToCSS(fill.color)
}

export interface FillPickerTriggerProps {
  style: { background: string }
  swatchClass?: string
}

export interface FillPickerRootProps {
  fill: Fill
  contentClass?: string
  swatchClass?: string
  onUpdate: (fill: Fill) => void
  trigger?: (props: FillPickerTriggerProps) => ReactNode
  children: (ctx: {
    fill: Fill
    category: FillCategory
    swatchBg: string
    toSolid: () => void
    toGradient: () => void
    toImage: () => void
    update: (fill: Fill) => void
  }) => ReactNode
}

export function FillPickerRoot({
  fill,
  swatchClass,
  onUpdate,
  trigger,
  children
}: FillPickerRootProps) {
  const category = useMemo<FillCategory>(() => FILL_CATEGORY[fill.type] ?? 'SOLID', [fill.type])
  const swatchBg = useMemo(() => fillSwatchBg(fill), [fill])

  function toSolid() {
    if (category === 'SOLID') return
    const color = fill.gradientStops?.[0]?.color ?? fill.color
    onUpdate({ ...fill, type: 'SOLID', color: { ...color } })
  }

  function toGradient() {
    if (category === 'GRADIENT') return
    const stops = fill.gradientStops?.length
      ? fill.gradientStops
      : [
          { color: { ...fill.color }, position: 0 },
          { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 }
        ]
    onUpdate({
      ...fill,
      type: 'GRADIENT_LINEAR',
      gradientStops: stops,
      gradientTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 0, m12: 0.5 }
    })
  }

  function toImage() {
    if (category === 'IMAGE') return
    onUpdate({ ...fill, type: 'IMAGE' })
  }

  const triggerStyle = { background: swatchBg }

  return (
    <>
      {trigger ? (
        trigger({ style: triggerStyle, swatchClass })
      ) : (
        <button className={swatchClass} style={triggerStyle} />
      )}
      {children({ fill, category, swatchBg, toSolid, toGradient, toImage, update: onUpdate })}
    </>
  )
}

export default FillPickerRoot
