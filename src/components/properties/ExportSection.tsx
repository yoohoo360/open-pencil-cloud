import IconLucideChevronDown from '~icons/lucide/chevron-down'
import IconLucideChevronRight from '~icons/lucide/chevron-right'
import IconLucideMinus from '~icons/lucide/minus'
import IconLucidePlus from '~icons/lucide/plus'
import { useExport, useI18n, type ExportFormatId } from '@open-pencil/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { useEditorStore } from '@/app/editor/active-store'
import ExportScaleInput from '@/components/properties/ExportScaleInput'
import AppSelect from '@/components/ui/AppSelect'
import IconButton from '@/components/ui/IconButton'
import PanelItemRow from '@/components/ui/panel/PanelItemRow'
import PanelSection from '@/components/ui/panel/PanelSection'
import Tip from '@/components/ui/Tip'
import { CHECKERBOARD_BACKGROUND } from '@/theme/checkerboard'

const FORMAT_OPTIONS: { value: ExportFormatId; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'webp', label: 'WEBP' },
  { value: 'svg', label: 'SVG' },
  { value: 'pdf', label: 'PDF' }
]

const PREVIEW_WIDTH = 480

export const ExportSection = memo(function ExportSection() {
  const editorStore = useEditorStore()
  const { panels } = useI18n()
  const {
    activeTarget,
    activeName,
    activeSettings,
    targetIds,
    mixed,
    addSetting,
    removeSetting,
    updateScale,
    updateFormat,
    formatSupportsScale,
    scales,
    clampExportScale
  } = useExport()

  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!previewBlob) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(previewBlob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [previewBlob])

  const previewKey = useMemo(
    () =>
      `${activeTarget}:${editorStore.state.sceneVersion}:${editorStore.state.currentPageId}:${[
        ...editorStore.state.selectedIds
      ]
        .sort()
        .join(',')}`,
    [
      activeTarget,
      editorStore.state.currentPageId,
      editorStore.state.sceneVersion,
      editorStore.state.selectedIds
    ]
  )

  const doExport = useCallback(async () => {
    setExporting(true)
    try {
      const requests = []
      for (const id of targetIds) {
        const node = editorStore.graph.getNode(id)
        if (!node) continue
        const target =
          activeTarget === 'page'
            ? ({ scope: 'page', pageId: id } as const)
            : ({ scope: 'node', nodeId: id } as const)
        for (const setting of activeSettings) {
          requests.push({ target, formatId: setting.format, options: { scale: setting.scale } })
        }
      }
      await editorStore.exportTargets(requests)
    } finally {
      setExporting(false)
    }
  }, [activeSettings, activeTarget, editorStore, targetIds])

  const updatePreview = useCallback(async () => {
    if (!showPreview) return

    const ids =
      activeTarget === 'selection'
        ? [...editorStore.state.selectedIds]
        : editorStore.graph.getChildren(editorStore.state.currentPageId).map((node) => node.id)

    if (ids.length === 0) {
      setPreviewBlob(null)
      return
    }

    let maxW = 0
    for (const id of ids) {
      const node = editorStore.getNode(id)
      if (node) maxW = Math.max(maxW, node.width)
    }
    const scale = maxW > 0 ? Math.min(PREVIEW_WIDTH / maxW, 2) : 1
    const data = await editorStore.renderExportImage(ids, scale, 'PNG')
    setPreviewBlob(data ? new Blob([data], { type: 'image/png' }) : null)
  }, [activeTarget, editorStore, showPreview])

  useEffect(() => {
    void updatePreview()
  }, [previewKey, showPreview, updatePreview])

  return (
    <PanelSection
      label={panels.export}
      empty={activeSettings.length === 0}
      actions={
        <IconButton label={panels.addExport} onClick={addSetting}>
          <IconLucidePlus className="size-3.5" />
        </IconButton>
      }
    >
      {mixed ? <p className="text-[11px] text-muted">{panels.mixed}</p> : null}

      {activeSettings.map((setting, index) => (
        <PanelItemRow
          key={`${targetIds.join(',')}:${index}`}
          data-property="exportSettings"
          data-index={index}
          rail={({ removeClass }) => (
            <IconButton
              label={panels.removeExport}
              className={`${removeClass} shrink-0`}
              onClick={() => removeSetting(index)}
            >
              <IconLucideMinus className="size-3.5" />
            </IconButton>
          )}
        >
          {formatSupportsScale(setting.format) ? (
            <div className="w-24 shrink-0">
              <ExportScaleInput
                value={setting.scale}
                presets={scales}
                clamp={clampExportScale}
                label={panels.exportScale}
                data-property="export-scale"
                onValueChange={(scale) => updateScale(index, scale)}
              />
            </div>
          ) : null}
          <AppSelect
            value={setting.format}
            options={FORMAT_OPTIONS}
            label={panels.exportFormat}
            ui={{ trigger: 'w-auto flex-1' }}
            data-property="export-format"
            onValueChange={(format) => updateFormat(index, format)}
          />
        </PanelItemRow>
      ))}

      {activeSettings.length > 0 ? (
        <button
          type="button"
          data-test-id="export-button"
          className="mt-1.5 w-full cursor-pointer truncate rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-default disabled:opacity-50"
          disabled={exporting}
          onClick={() => void doExport()}
        >
          {panels.export} {activeName}
        </button>
      ) : null}

      {activeSettings.length > 0 ? (
        <Tip label={panels.toggleExportPreview}>
          <button
            type="button"
            data-test-id="export-preview-toggle"
            className="mt-1 flex w-full cursor-pointer items-center gap-1 rounded border-none bg-transparent px-0 py-1 text-[11px] text-muted hover:text-surface"
            onClick={() => setShowPreview((open) => !open)}
          >
            {showPreview ? (
              <IconLucideChevronDown className="size-3" />
            ) : (
              <IconLucideChevronRight className="size-3" />
            )}
            {panels.exportPreview}
          </button>
        </Tip>
      ) : null}

      {showPreview && previewUrl ? (
        <div className="mt-1 overflow-hidden rounded border border-border">
          <img src={previewUrl} alt="" className={['block w-full', CHECKERBOARD_BACKGROUND].join(' ')} />
        </div>
      ) : showPreview ? (
        <div className="mt-1 rounded border border-border px-3 py-2 text-[11px] text-muted">
          {panels.exportRenderingPreview}
        </div>
      ) : null}
    </PanelSection>
  )
})

ExportSection.displayName = 'ExportSection'
export default ExportSection
