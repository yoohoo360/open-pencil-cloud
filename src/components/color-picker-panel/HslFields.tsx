import { colorToCSS } from '@open-pencil/core/color'
import { PickerSlider } from '@/components/color-picker-panel/PickerSlider'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export function HslFields() {
  const ctx = useColorPickerPanelContext()

  return (
    <>
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
        {(['h', 's', 'l'] as const).map((channel) => (
          <input
            key={channel}
            type="number"
            className="bg-input px-2 py-1 text-xs text-surface outline-none"
            value={Math.round(ctx.hslColor[channel] ?? 0)}
            min={0}
            max={channel === 'h' ? 360 : 100}
            onChange={(e) => ctx.updateHSLChannelValue(channel, e.target.valueAsNumber)}
          />
        ))}
      </div>
      <PickerSlider
        label="S"
        value={ctx.hslColor.s ?? 0}
        min={0}
        max={100}
        step={0.1}
        display={{ value: Math.round(ctx.hslColor.s ?? 0), min: 0, max: 100, step: 1 }}
        gradientStyle={ctx.sliderGradient.hslSaturation}
        thumbFill={colorToCSS(ctx.sliderPreview.hslSaturation)}
        data-test-id="color-slider-hsl-s"
        onChange={(v) => ctx.updateHSLChannelValue('s', v)}
      />
      <PickerSlider
        label="L"
        value={ctx.hslColor.l ?? 0}
        min={0}
        max={100}
        step={0.1}
        display={{ value: Math.round(ctx.hslColor.l ?? 0), min: 0, max: 100, step: 1 }}
        gradientStyle={ctx.sliderGradient.hslLightness}
        thumbFill={colorToCSS(ctx.sliderPreview.hslLightness)}
        data-test-id="color-slider-hsl-l"
        onChange={(v) => ctx.updateHSLChannelValue('l', v)}
      />
      <p className="text-[10px] leading-4 text-muted">{ctx.panels.colorHintHsl}</p>
    </>
  )
}
