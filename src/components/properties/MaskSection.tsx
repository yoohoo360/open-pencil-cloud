import { useMemo } from 'react'

import { useI18n, useMask } from '@open-pencil/react'
import type { MaskType } from '@open-pencil/scene-graph'

import { AppSelect } from '@/components/ui/AppSelect'
import { PanelSection } from '@/components/ui/panel/PanelSection'
import { Tip } from '@/components/ui/Tip'

export function MaskSection() {
  const { panels } = useI18n()
  const { active, maskType, setMaskType } = useMask()

  const maskTypeOptions = useMemo<Array<{ value: MaskType; label: string }>>(
    () => [
      { value: 'ALPHA', label: panels.maskTypeAlpha },
      { value: 'VECTOR', label: panels.maskTypeVector },
      { value: 'LUMINANCE', label: panels.maskTypeLuminance }
    ],
    [panels]
  )

  if (!active.value) return null

  return (
    <PanelSection label={panels.mask} data-test-id="mask-section">
      <Tip label={panels.maskType}>
        <AppSelect
          className="w-full"
          label={panels.maskType}
          value={maskType.value}
          options={maskTypeOptions}
          onChange={(v) => setMaskType(v as MaskType)}
          data-test-id="mask-type-select"
        />
      </Tip>
    </PanelSection>
  )
}
