import { useEffect, useRef, useState } from 'react'

import IconPlus from '~icons/lucide/plus'
import IconMinus from '~icons/lucide/minus'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconChevronRight from '~icons/lucide/chevron-right'

import { useEditorStore } from '@/app/editor/active-store'
import { useExport, useI18n } from '@open-pencil/react'
import type { ExportFormatId } from '@open-pencil/react'

import { AppSelect } from '@/components/ui/AppSelect'
import { ExportScaleInput } from '@/components/properties/ExportScaleInput'
import { IconButton } from '@/components/ui/IconButton'
import { PanelSection } from '@/components/ui/panel/PanelSection'
import { Tip } from '@/components/ui/Tip'

const FORMAT_OPTIONS: { value: ExportFormatId; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'webp', label: 'WEBP' },
  { value: 'svg', label: 'SVG' },
  { value: 'pdf', label: 'PDF' }
]

export function ExportSection() {
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

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [exporting, setExporting] = useState(false)
  const prevPreviewUrlRef = useRef<string | null>(null)

  const previewKey = [
    activeTarget.value,
    editorStore.state.sceneVersion,
    editorStore.state.currentPageId,
    [...editorStore.state.selectedIds].sort().join(',')
  ].join(':')

  async function updatePreview() {
    if (!showPreview) return
    const ids =
      activeTarget.value === 'selection'
        ? [...editorStore.state.selectedIds]
        : editorStore.graph.getChildren(editorStore.state.currentPageId).map((n) => n.id)
    if (ids.length === 0) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      return
    }
    let maxW = 0
    for (const id of ids) {
      const node = editorStore.getNode(id)
      if (node) maxW = Math.max(maxW, node.width)
    }
    const scale = maxW > 0 ? Math.min(480 / maxW, 2) : 1
    const data = await editorStore.renderExportImage(ids, scale, 'PNG')
    if (data) {
      if (prevPreviewUrlRef.current) URL.revokeObjectURL(prevPreviewUrlRef.current)
      const url = URL.createObjectURL(new Blob([data], { type: 'image/png' }))
      prevPreviewUrlRef.current = url
      setPreviewUrl(url)
    }
  }

  useEffect(() => {
    void updatePreview()
  }, [showPreview, previewKey])

  useEffect(() => {
    return () => {
      if (prevPreviewUrlRef.current) URL.revokeObjectURL(prevPreviewUrlRef.current)
    }
  }, [])

  async function doExport() {
    setExporting(true)
    try {
      const requests = []
      for (const id of targetIds.value) {
        const node = editorStore.graph.getNode(id)
        if (!node) continue
        const target =
          activeTarget.value === 'page'
            ? ({ scope: 'page', pageId: id } as const)
            : ({ scope: 'node', nodeId: id } as const)
        for (const setting of activeSettings.value) {
          requests.push({ target, formatId: setting.format, options: { scale: setting.scale } })
        }
      }
      await editorStore.exportTargets(requests)
    } finally {
      setExporting(false)
    }
  }

  return (
    <PanelSection
      label={panels.export}
      data-test-id="export-section"
      actions={
        <IconButton label={panels.addExport} data-test-id="export-section-add" onClick={addSetting}>
          <IconPlus className="size-3.5" />
        </IconButton>
      }
    >
      {mixed.value && (
        <p className="text-[11px] text-muted">{panels.mixed}</p>
      )}

      {activeSettings.value.map((setting, i) => (
        <div
          key={`${targetIds.value.join(',')}:${i}`}
          data-test-id="export-item"
          data-test-index={i}
          className="flex items-center gap-1.5 py-0.5"
        >
          {formatSupportsScale(setting.format) && (
            <ExportScaleInput
              data-test-id="export-scale-input"
              value={setting.scale}
              presets={scales}
              clamp={clampExportScale}
              label={panels.exportScale}
              onChange={(v) => updateScale(i, v)}
            />
          )}
          <AppSelect
            data-test-id="app-select-trigger"
            value={setting.format}
            options={FORMAT_OPTIONS}
            label={panels.exportFormat}
            onChange={(v) => updateFormat(i, v as ExportFormatId)}
          />
          <IconButton label={panels.removeExport} className="shrink-0" onClick={() => removeSetting(i)}>
            <IconMinus className="size-3.5" />
          </IconButton>
        </div>
      ))}

      {activeSettings.value.length > 0 && (
        <button
          data-test-id="export-button"
          className="mt-1.5 w-full cursor-pointer truncate rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-default disabled:opacity-50"
          disabled={exporting}
          onClick={() => void doExport()}
        >
          {panels.export} {activeName.value}
        </button>
      )}

      {activeSettings.value.length > 0 && (
        <Tip label={panels.toggleExportPreview}>
          <button
            data-test-id="export-preview-toggle"
            className="mt-1 flex w-full cursor-pointer items-center gap-1 rounded border-none bg-transparent px-0 py-1 text-[11px] text-muted hover:text-surface"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? <IconChevronDown className="size-3" /> : <IconChevronRight className="size-3" />}
            {panels.exportPreview}
          </button>
        </Tip>
      )}

      {showPreview && previewUrl && (
        <div className="mt-1 overflow-hidden rounded border border-border">
          <img
            src={previewUrl}
            className="block w-full"
            style={{
              imageRendering: 'auto',
              background: 'repeating-conic-gradient(var(--color-checkerboard) 0% 25%, transparent 0% 50%) 50% / 16px 16px'
            }}
          />
        </div>
      )}
      {showPreview && !previewUrl && (
        <div className="mt-1 rounded border border-border px-3 py-2 text-[11px] text-muted">
          {panels.exportRenderingPreview}
        </div>
      )}
    </PanelSection>
  )
}
