import type { ColorFieldFormat } from '@open-pencil/react'
import { memo } from 'react'

import AppSelect from '@/components/ui/AppSelect'
import HsbFields from '@/components/color-picker-panel/HsbFields'
import HslFields from '@/components/color-picker-panel/HslFields'
import OkhclFields from '@/components/color-picker-panel/OkhclFields'
import RgbFields from '@/components/color-picker-panel/RgbFields'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export const FormatControls = memo(function FormatControls() {
  const ctx = useColorPickerPanelContext()

  return (
    <div className="flex flex-col gap-2">
      <div data-test-id="color-format-select">
        <AppSelect
          className="w-[120px]"
          value={ctx.fieldFormat}
          options={ctx.fieldOptions}
          onValueChange={(value) => ctx.setFieldFormat(String(value) as ColorFieldFormat)}
        />
      </div>

      <div className="min-w-0 flex flex-col gap-2">
        {ctx.fieldFormat === 'rgb' ? (
          <RgbFields />
        ) : ctx.fieldFormat === 'hsl' ? (
          <HslFields />
        ) : ctx.fieldFormat === 'hsb' ? (
          <HsbFields />
        ) : (
          <OkhclFields />
        )}
      </div>
    </div>
  )
})

FormatControls.displayName = 'FormatControls'
export default FormatControls
