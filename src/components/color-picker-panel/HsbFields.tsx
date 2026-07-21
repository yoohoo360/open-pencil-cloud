import { colorToCSS } from '@open-pencil/core/color'
import { inputNumberValue } from '@open-pencil/react'
import { memo } from 'react'

import StandardColorSlider from '@/components/color-picker-panel/StandardColorSlider'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export const HsbFields = memo(function HsbFields() {
  const ctx = useColorPickerPanelContext()

  return (
    <>
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
        <input
          type="number"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(ctx.hsbColor.h)}
          min={0}
          max={360}
          onChange={(event) => ctx.updateHSBChannelValue('h', inputNumberValue(event.nativeEvent))}
        />
        <input
          type="number"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(ctx.hsbColor.s)}
          min={0}
          max={100}
          onChange={(event) => ctx.updateHSBChannelValue('s', inputNumberValue(event.nativeEvent))}
        />
        <input
          type="number"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(ctx.hsbColor.b)}
          min={0}
          max={100}
          onChange={(event) => ctx.updateHSBChannelValue('b', inputNumberValue(event.nativeEvent))}
        />
      </div>

      <StandardColorSlider
        label="Saturation"
        value={Math.round(ctx.hsbColor.s)}
        min={0}
        max={100}
        step={0.1}
        suffix="%"
        gradient={ctx.sliderGradient.hsbSaturation}
        thumbFill={colorToCSS(ctx.sliderPreview.hsbSaturation)}
        data-test-id="color-slider-hsb-s"
        onValueChange={(next) => ctx.updateHSBChannelValue('s', next)}
      />

      <StandardColorSlider
        label="Brightness"
        value={Math.round(ctx.hsbColor.b)}
        min={0}
        max={100}
        step={0.1}
        suffix="%"
        gradient={ctx.sliderGradient.hsbBrightness}
        thumbFill={colorToCSS(ctx.sliderPreview.hsbBrightness)}
        data-test-id="color-slider-hsb-b"
        onValueChange={(next) => ctx.updateHSBChannelValue('b', next)}
      />

      <p className="text-[10px] leading-4 text-muted">{ctx.panels.colorHintHsb}</p>
    </>
  )
})

HsbFields.displayName = 'HsbFields'
export default HsbFields
