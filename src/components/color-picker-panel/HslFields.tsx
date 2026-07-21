import { colorToCSS } from '@open-pencil/core/color'
import { inputNumberValue } from '@open-pencil/react'
import { memo } from 'react'

import StandardColorSlider from '@/components/color-picker-panel/StandardColorSlider'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export const HslFields = memo(function HslFields() {
  const ctx = useColorPickerPanelContext()

  return (
    <>
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
        <input
          type="number"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(ctx.hslColor.h ?? 0)}
          min={0}
          max={360}
          onChange={(event) => ctx.updateHSLChannelValue('h', inputNumberValue(event.nativeEvent))}
        />
        <input
          type="number"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(ctx.hslColor.s ?? 0)}
          min={0}
          max={100}
          onChange={(event) => ctx.updateHSLChannelValue('s', inputNumberValue(event.nativeEvent))}
        />
        <input
          type="number"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(ctx.hslColor.l ?? 0)}
          min={0}
          max={100}
          onChange={(event) => ctx.updateHSLChannelValue('l', inputNumberValue(event.nativeEvent))}
        />
      </div>

      <StandardColorSlider
        label="Saturation"
        value={Math.round(ctx.hslColor.s ?? 0)}
        min={0}
        max={100}
        step={0.1}
        suffix="%"
        gradient={ctx.sliderGradient.hslSaturation}
        thumbFill={colorToCSS(ctx.sliderPreview.hslSaturation)}
        data-test-id="color-slider-hsl-s"
        onValueChange={(next) => ctx.updateHSLChannelValue('s', next)}
      />

      <StandardColorSlider
        label="Lightness"
        value={Math.round(ctx.hslColor.l ?? 0)}
        min={0}
        max={100}
        step={0.1}
        suffix="%"
        gradient={ctx.sliderGradient.hslLightness}
        thumbFill={colorToCSS(ctx.sliderPreview.hslLightness)}
        data-test-id="color-slider-hsl-l"
        onValueChange={(next) => ctx.updateHSLChannelValue('l', next)}
      />

      <p className="text-[10px] leading-4 text-muted">{ctx.panels.colorHintHsl}</p>
    </>
  )
})

HslFields.displayName = 'HslFields'
export default HslFields
