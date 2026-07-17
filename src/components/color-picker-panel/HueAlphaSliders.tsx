import { colorToCSS } from '@open-pencil/core/color'
import { PickerSlider } from '@/components/color-picker-panel/PickerSlider'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export function HueAlphaSliders() {
  const ctx = useColorPickerPanelContext()

  if (ctx.fieldFormat === 'okhcl') return null

  return (
    <>
      <PickerSlider
        label="H"
        value={ctx.hslColor.h ?? 0}
        min={0}
        max={360}
        step={1}
        gradientStyle="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
        thumbFill={colorToCSS(ctx.sliderPreview.hue)}
        ui={{ root: 'gap-0', label: 'hidden', input: 'hidden' }}
        data-test-id="color-slider-hue"
        onChange={ctx.updateRGBAHue}
      />
      <PickerSlider
        label="A"
        value={ctx.color.a}
        min={0}
        max={1}
        step={0.001}
        checkerboard
        gradientStyle={`background: linear-gradient(to right, transparent, ${colorToCSS({ ...ctx.color, a: 1 })})`}
        thumbFill={colorToCSS(ctx.color)}
        ui={{ root: 'gap-0', label: 'hidden', input: 'hidden' }}
        data-test-id="color-slider-alpha"
        onChange={ctx.updateRGBAAlpha}
      />
    </>
  )
}
