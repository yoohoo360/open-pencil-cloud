import { memo, useMemo } from 'react'

import { useI18n, useMask } from '@open-pencil/react'
import type { MaskType } from '@open-pencil/scene-graph'
import AppSelect from '@/components/ui/AppSelect'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelSection from '@/components/ui/panel/PanelSection'

export const MaskSection = memo(function MaskSection() {
  const { panels } = useI18n()
  const { active, maskType, setMaskType } = useMask()

  const maskTypeOptions = useMemo<Array<{ value: MaskType; label: string }>>(
    () => [
      { value: 'ALPHA', label: panels.maskTypeAlpha },
      { value: 'VECTOR', label: panels.maskTypeVector },
      { value: 'LUMINANCE', label: panels.maskTypeLuminance }
    ],
    [panels.maskTypeAlpha, panels.maskTypeLuminance, panels.maskTypeVector]
  )

  if (!active) return null

  return (
    <PanelSection label={panels.mask}>
      <PanelFieldGroup label={panels.maskType}>
        <AppSelect
          value={maskType}
          onValueChange={setMaskType}
          label={panels.maskType}
          options={maskTypeOptions}
          data-property="mask-type"
        />
      </PanelFieldGroup>
    </PanelSection>
  )
})

MaskSection.displayName = 'MaskSection'
export default MaskSection
