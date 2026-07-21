import { inputNumberValue } from '@open-pencil/react'
import { memo } from 'react'

import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export const RgbFields = memo(function RgbFields() {
  const ctx = useColorPickerPanelContext()

  return (
    <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
      <input
        type="number"
        aria-label="Red"
        className="bg-input px-2 py-1 text-xs text-surface outline-none"
        value={Math.round(ctx.rgbColor.r)}
        min={0}
        max={255}
        onChange={(event) => ctx.updateRGBChannelValue('r', inputNumberValue(event.nativeEvent))}
      />
      <input
        type="number"
        aria-label="Green"
        className="bg-input px-2 py-1 text-xs text-surface outline-none"
        value={Math.round(ctx.rgbColor.g)}
        min={0}
        max={255}
        onChange={(event) => ctx.updateRGBChannelValue('g', inputNumberValue(event.nativeEvent))}
      />
      <input
        type="number"
        aria-label="Blue"
        className="bg-input px-2 py-1 text-xs text-surface outline-none"
        value={Math.round(ctx.rgbColor.b)}
        min={0}
        max={255}
        onChange={(event) => ctx.updateRGBChannelValue('b', inputNumberValue(event.nativeEvent))}
      />
    </div>
  )
})

RgbFields.displayName = 'RgbFields'
export default RgbFields
