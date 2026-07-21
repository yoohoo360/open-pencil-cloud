import { useMemo } from 'react'

import type { BlendMode } from '@open-pencil/scene-graph'
import { useI18n } from '@open-pencil/react'

export function commitDiscretePropertyListChange(flush: () => void, update: () => void): void {
  update()
  flush()
}

export interface BlendModeOption {
  value: BlendMode
  label: string
}

export function useBlendModeOptions(includePassThrough = false): BlendModeOption[] {
  const { panels } = useI18n()
  return useMemo(
    () => [
      ...(includePassThrough
        ? [{ value: 'PASS_THROUGH' as const, label: panels.blendModePassThrough }]
        : []),
      { value: 'NORMAL', label: panels.blendModeNormal },
      { value: 'DARKEN', label: panels.blendModeDarken },
      { value: 'MULTIPLY', label: panels.blendModeMultiply },
      { value: 'COLOR_BURN', label: panels.blendModeColorBurn },
      { value: 'LIGHTEN', label: panels.blendModeLighten },
      { value: 'SCREEN', label: panels.blendModeScreen },
      { value: 'COLOR_DODGE', label: panels.blendModeColorDodge },
      { value: 'OVERLAY', label: panels.blendModeOverlay },
      { value: 'SOFT_LIGHT', label: panels.blendModeSoftLight },
      { value: 'HARD_LIGHT', label: panels.blendModeHardLight },
      { value: 'DIFFERENCE', label: panels.blendModeDifference },
      { value: 'EXCLUSION', label: panels.blendModeExclusion },
      { value: 'HUE', label: panels.blendModeHue },
      { value: 'SATURATION', label: panels.blendModeSaturation },
      { value: 'COLOR', label: panels.blendModeColor },
      { value: 'LUMINOSITY', label: panels.blendModeLuminosity }
    ],
    [includePassThrough, panels]
  )
}
