import { useEffect, useRef, useState } from 'react'

import { colorToHex, colorToHexRaw, parseColor } from '@open-pencil/core/color'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { panelFieldBase } from '#react/theme/panel/field'
import { NumberField } from '#react/components/inputs/NumberField'

export function ColorRow({
  color,
  opacity,
  label,
  onColor,
  onOpacity
}: {
  color: Color
  opacity: number
  label: string
  onColor: (color: Color) => void
  onOpacity?: (opacity: number) => void
}) {
  const [hex, setHex] = useState(colorToHexRaw(color))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setHex(colorToHexRaw(color))
  }, [color.r, color.g, color.b, color.a])

  function commitHex() {
    const parsed = parseColor(`#${hex.replace('#', '')}`)
    setHex(colorToHexRaw(parsed))
    onColor({ ...parsed, a: color.a })
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <input
        type="color"
        aria-label={label}
        value={colorToHex(color)}
        className="size-5 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
        onChange={(event) => {
          const parsed = parseColor(event.target.value)
          onColor({ ...parsed, a: color.a })
        }}
      />
      <input
        type="text"
        aria-label={label}
        value={hex}
        spellCheck={false}
        className={`min-w-0 flex-1 px-1.5 font-[inherit] text-[11px] uppercase ${panelFieldBase}`}
        onFocus={() => {
          focused.current = true
        }}
        onBlur={() => {
          focused.current = false
          commitHex()
        }}
        onChange={(event) => setHex(event.target.value.replace('#', ''))}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.currentTarget.blur()
        }}
      />
      {onOpacity ? (
        <div className="w-16 shrink-0">
          <NumberField
            value={Math.round(opacity * 100)}
            min={0}
            max={100}
            suffix="%"
            aria-label={label}
            onCommit={(next) => onOpacity(next / 100)}
          />
        </div>
      ) : null}
    </div>
  )
}
