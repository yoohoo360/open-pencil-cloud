import { inputValue, useColorModel } from '@open-pencil/react'
import { memo, useMemo } from 'react'

import { BindingPill } from '@/components/ui/binding'

import type { Color } from '@open-pencil/scene-graph/primitives'

export type PaintValueProps = {
  color: Color
  resolvedColor?: Color
  variableName?: string
  label: string
  onUpdate?: (color: Color) => void
}

export const PaintValue = memo(function PaintValue({
  color,
  resolvedColor,
  variableName,
  label,
  onUpdate
}: PaintValueProps) {
  const displayColor = useMemo(() => resolvedColor ?? color, [color, resolvedColor])
  const model = useColorModel({
    color: displayColor,
    onUpdate: (updated) => onUpdate?.(updated)
  })
  const tooltip = useMemo(
    () => (variableName ? `${variableName} · #${model.hex}` : undefined),
    [model.hex, variableName]
  )

  if (variableName) {
    return (
      <BindingPill className="min-w-0 flex-1" label={variableName} tooltip={tooltip} />
    )
  }

  return (
    <input
      aria-label={label}
      data-property="color-hex"
      className="min-w-0 flex-1 border-none bg-transparent font-mono text-xs text-surface outline-none"
      value={model.hex}
      maxLength={6}
      onChange={(event) => model.updateHex(inputValue(event.nativeEvent))}
    />
  )
})

PaintValue.displayName = 'PaintValue'
export default PaintValue
