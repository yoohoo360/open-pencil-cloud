import { useCallback, useRef } from 'react'

import { colorToCSS } from '@open-pencil/core'
import { rekaToAppColor } from '@open-pencil/react'

import type { Color } from '@open-pencil/core'
import type { PointerEvent as ReactPointerEvent } from 'react'

export function ColorArea({
  hue,
  saturation,
  brightness,
  alpha,
  onChange
}: {
  hue: number
  saturation: number
  brightness: number
  alpha: number
  onChange: (color: Color) => void
}) {
  const areaRef = useRef<HTMLDivElement | null>(null)

  const updateFromPointer = useCallback(
    (e: ReactPointerEvent | PointerEvent) => {
      const el = areaRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100
      const b = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height)) * 100
      onChange(rekaToAppColor({ space: 'hsb', h: hue, s, b, alpha }))
    },
    [alpha, hue, onChange]
  )

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPointer(e)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    updateFromPointer(e)
  }

  const hueColor = colorToCSS(rekaToAppColor({ space: 'hsb', h: hue, s: 100, b: 100, alpha: 1 }))

  return (
    <div
      ref={areaRef}
      className="relative h-[140px] w-full cursor-crosshair overflow-hidden rounded"
      style={{
        backgroundColor: hueColor,
        backgroundImage:
          'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)'
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <div
        className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
        style={{
          left: `${saturation}%`,
          top: `${100 - brightness}%`
        }}
      />
    </div>
  )
}
