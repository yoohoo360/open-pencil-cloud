import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export function RgbFields() {
  const ctx = useColorPickerPanelContext()

  return (
    <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
      {(['r', 'g', 'b'] as const).map((channel) => (
        <input
          key={channel}
          type="number"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(ctx.rgbColor[channel])}
          min={0}
          max={255}
          onChange={(e) => ctx.updateRGBChannelValue(channel, e.target.valueAsNumber)}
        />
      ))}
    </div>
  )
}
