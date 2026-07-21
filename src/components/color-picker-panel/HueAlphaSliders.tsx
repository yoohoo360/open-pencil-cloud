import { colorToCSS } from '@open-pencil/core/color'
import { memo } from 'react'

import StandardColorSlider from '@/components/color-picker-panel/StandardColorSlider'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

const HUE_GRADIENT =
  'background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);'

export const HueAlphaSliders = memo(function HueAlphaSliders() {
  const ctx = useColorPickerPanelContext()

  if (ctx.fieldFormat === 'okhcl') return null

  return (
    <>
      <StandardColorSlider
        label="Hue"
        value={Math.round(ctx.hslColor.h ?? 0)}
        min={0}
        max={360}
        gradient={HUE_GRADIENT}
        thumbFill={colorToCSS(ctx.sliderPreview.hue)}
        data-test-id="color-slider-hue"
        onValueChange={ctx.updateRGBAHue}
      />

      <StandardColorSlider
        label="Alpha"
        value={Math.round(ctx.color.a * 100)}
        min={0}
        max={100}
        step={0.1}
        suffix="%"
        checkerboard
        gradient={`background: linear-gradient(to right, transparent, ${colorToCSS({ ...ctx.color, a: 1 })})`}
        thumbFill={colorToCSS(ctx.color)}
        data-test-id="color-slider-alpha"
        onValueChange={(next) => ctx.updateRGBAAlpha(next / 100)}
      />
    </>
  )
})

HueAlphaSliders.displayName = 'HueAlphaSliders'
export default HueAlphaSliders
