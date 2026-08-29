import {
  FRAME_RESIZE_PRESET_CATEGORIES,
  FRAME_RESIZE_PRESETS,
  findFrameResizePreset
} from '#react/app/editor/frame-presets'
import { useEditorStore } from '#react/app/editor/store'
import { AppGroupedSelect } from '#react/components/ui/AppSelect'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useI18n } from '#react/i18n'

export function FramePresetSelect() {
  const store = useEditorStore()
  const { selectedNode } = useSelectionState()
  const { panels } = useI18n()
  if (selectedNode?.type !== 'FRAME') return null

  const selectedPreset = findFrameResizePreset(
    selectedNode.width,
    selectedNode.height,
    selectedNode.name
  )
  const groups = [
    { label: panels.framePresetCustom, items: [{ value: 'custom', label: panels.framePresetCustom }] },
    ...FRAME_RESIZE_PRESET_CATEGORIES.map((category) => ({
      label: panels[category.labelKey],
      items: category.presets.map((preset) => ({ value: preset.id, label: preset.name }))
    }))
  ]

  return (
    <PanelSection label={panels.frame}>
      <AppGroupedSelect
        data-property="frame-preset"
        label={panels.framePreset}
        value={selectedPreset?.id ?? 'custom'}
        groups={groups}
        onChange={(id) => {
          const preset = FRAME_RESIZE_PRESETS.find((candidate) => candidate.id === id)
          if (preset) store.resizeFrameToPreset(selectedNode.id, preset)
        }}
      />
    </PanelSection>
  )
}
