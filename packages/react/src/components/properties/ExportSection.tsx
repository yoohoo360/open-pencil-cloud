import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { ExportFormatId } from '@open-pencil/scene-graph'

import { NumberField } from '#react/components/inputs/NumberField'
import { AppSelect } from '#react/components/ui/AppSelect'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useExport } from '#react/controls/export'
import { useI18n } from '#react/i18n'

const FORMAT_OPTIONS: { value: ExportFormatId; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'webp', label: 'WEBP' },
  { value: 'svg', label: 'SVG' },
  { value: 'pdf', label: 'PDF' }
]

export function ExportSection() {
  const { panels } = useI18n()
  const {
    activeName,
    activeSettings,
    targetIds,
    mixed,
    addSetting,
    removeSetting,
    updateScale,
    updateFormat,
    formatSupportsScale,
    clampExportScale,
    exportTargets
  } = useExport()
  const [exporting, setExporting] = useState(false)

  async function onExport() {
    setExporting(true)
    try {
      await exportTargets()
    } finally {
      setExporting(false)
    }
  }

  return (
    <PanelSection
      label={panels.export}
      empty={activeSettings.length === 0}
      actions={
        <IconButton label={panels.addExport} onClick={addSetting}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      {mixed ? <p className="text-[11px] text-muted">{panels.mixed}</p> : null}
      {activeSettings.map((setting, index) => (
        <div
          key={`${targetIds.join(',')}:${index}`}
          className="mb-1.5 flex items-center gap-1.5 last:mb-0"
          data-property="exportSettings"
          data-index={index}
        >
          {formatSupportsScale(setting.format) ? (
            <div className="w-24 shrink-0">
              <NumberField
                min={0.5}
                max={4}
                aria-label={panels.exportScale}
                data-property="export-scale"
                suffix="×"
                value={setting.scale}
                onCommit={(value) => updateScale(index, clampExportScale(value))}
              />
            </div>
          ) : null}
          <AppSelect
            className="w-auto flex-1"
            label={panels.exportFormat}
            data-property="export-format"
            value={setting.format}
            options={FORMAT_OPTIONS}
            onChange={(format) => updateFormat(index, format)}
          />
          <IconButton label={panels.removeExport} onClick={() => removeSetting(index)}>
            <Minus className="size-3.5" />
          </IconButton>
        </div>
      ))}
      {activeSettings.length > 0 ? (
        <button
          type="button"
          data-test-id="export-button"
          className="mt-1.5 w-full cursor-pointer truncate rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-default disabled:opacity-50"
          disabled={exporting}
          onClick={() => void onExport()}
        >
          {panels.export} {activeName}
        </button>
      ) : null}
    </PanelSection>
  )
}
