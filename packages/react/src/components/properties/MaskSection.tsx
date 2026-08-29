import type { MaskType } from '@open-pencil/scene-graph'

import { AppSelect } from '#react/components/ui/AppSelect'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useMask } from '#react/controls/mask'
import { useI18n } from '#react/i18n'

export function MaskSection() {
  const { panels } = useI18n()
  const { active, maskType, setMaskType } = useMask()
  if (!active) return null

  const maskTypeOptions: Array<{ value: MaskType; label: string }> = [
    { value: 'ALPHA', label: panels.maskTypeAlpha },
    { value: 'VECTOR', label: panels.maskTypeVector },
    { value: 'LUMINANCE', label: panels.maskTypeLuminance }
  ]

  return (
    <PanelSection label={panels.mask}>
      <PanelFieldGroup label={panels.maskType}>
        <AppSelect
          label={panels.maskType}
          data-property="mask-type"
          value={maskType}
          options={maskTypeOptions}
          onChange={setMaskType}
        />
      </PanelFieldGroup>
    </PanelSection>
  )
}
