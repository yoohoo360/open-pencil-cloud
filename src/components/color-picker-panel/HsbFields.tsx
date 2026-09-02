import { colorToCSS } from '@open-pencil/core/color'
import { PickerSlider } from '@/components/color-picker-panel/PickerSlider'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export function HsbFields() {
  const ctx = useColorPickerPanelContext()

  return (
    <>
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
        {(['h', 's', 'b'] as const).map((channel) => (
          <input
            key={channel}
            type="number"
            className="bg-input px-2 py-1 text-xs text-surface outline-none"
            value={Math.round(ctx.hsbColor[channel])}
            min={0}
            max={channel === 'h' ? 360 : 100}
            onChange={(e) => ctx.updateHSBChannelValue(channel, e.target.valueAsNumber)}
          />
        ))}
      </div>
      <PickerSlider
        label="S"
        value={ctx.hsbColor.s}
        min={0}
        max={100}
        step={0.1}
        display={{ value: Math.round(ctx.hsbColor.s), min: 0, max: 100, step: 1 }}
        gradientStyle={ctx.sliderGradient.hsbSaturation}
        thumbFill={colorToCSS(ctx.sliderPreview.hsbSaturation)}
        data-test-id="color-slider-hsb-s"
        onChange={(v) => ctx.updateHSBChannelValue('s', v)}
      />
      <PickerSlider
        label="B"
        value={ctx.hsbColor.b}
        min={0}
        max={100}
        step={0.1}
        display={{ value: Math.round(ctx.hsbColor.b), min: 0, max: 100, step: 1 }}
        gradientStyle={ctx.sliderGradient.hsbBrightness}
        thumbFill={colorToCSS(ctx.sliderPreview.hsbBrightness)}
        data-test-id="color-slider-hsb-b"
        onChange={(v) => ctx.updateHSBChannelValue('b', v)}
      />
      <p className="text-[10px] leading-4 text-muted">{ctx.panels.colorHintHsb}</p>
    </>
  )
}
