import { AppSelect } from '@/components/ui/AppSelect'
import { HsbFields } from '@/components/color-picker-panel/HsbFields'
import { HslFields } from '@/components/color-picker-panel/HslFields'
import { OkhclFields } from '@/components/color-picker-panel/OkhclFields'
import { RgbFields } from '@/components/color-picker-panel/RgbFields'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export function FormatControls() {
  const ctx = useColorPickerPanelContext()

  return (
    <div className="flex flex-col gap-2">
      <AppSelect
        className="w-[120px]"
        data-test-id="color-format-select"
        value={ctx.fieldFormat}
        options={ctx.fieldOptions}
        onChange={(v) => ctx.setFieldFormat(v)}
      />
      <div className="min-w-0 flex flex-col gap-2">
        {ctx.fieldFormat === 'rgb' && <RgbFields />}
        {ctx.fieldFormat === 'hsl' && <HslFields />}
        {ctx.fieldFormat === 'hsb' && <HsbFields />}
        {ctx.fieldFormat === 'okhcl' && <OkhclFields />}
      </div>
    </div>
  )
}
