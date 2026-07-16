import { ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { AppSelect } from '@/react_app/ui/AppSelect'
import { iconButton } from '@/react_app/ui/iconButton'
import { sectionLabel, sectionWrapper } from '@/react_app/ui/section'
import { useEditor, useExport, useI18n } from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

type ExportFormatId = 'png' | 'jpg' | 'webp' | 'svg' | 'fig'

type AppEditor = Editor & {
  exportSelection: (scale: number, format: ExportFormatId) => Promise<void>
  exportTarget: (
    target: { scope: 'page'; pageId: string },
    format: ExportFormatId,
    opts: { scale: number }
  ) => Promise<void>
  renderExportImage: (ids: string[], scale: number, format: 'PNG') => Promise<Uint8Array | null>
}

const SCALE_OPTIONS = [0.5, 0.75, 1, 1.5, 2, 3, 4].map((s) => ({
  value: s,
  label: `${s}x`
}))
const FORMAT_OPTIONS: { value: ExportFormatId; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'webp', label: 'WEBP' },
  { value: 'svg', label: 'SVG' },
  { value: 'fig', label: '.fig' }
]

const PREVIEW_WIDTH = 480

export function ExportSection() {
  const editorStore = useEditor() as AppEditor
  const { panels } = useI18n()
  const {
    activeTarget,
    activeName,
    activeSettings,
    addSelectionSetting,
    addPageSetting,
    removeSelectionSetting,
    removePageSetting,
    updateSelectionScale,
    updatePageScale,
    updateSelectionFormat,
    updatePageFormat,
    formatSupportsScale
  } = useExport()

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [exporting, setExporting] = useState(false)

  function addSetting() {
    if (activeTarget === 'selection') addSelectionSetting()
    else addPageSetting()
  }

  function removeSetting(index: number) {
    if (activeTarget === 'selection') removeSelectionSetting(index)
    else removePageSetting(index)
  }

  function updateScale(index: number, scale: number) {
    if (activeTarget === 'selection') updateSelectionScale(index, scale)
    else updatePageScale(index, scale)
  }

  function updateFormat(index: number, format: ExportFormatId) {
    if (activeTarget === 'selection') updateSelectionFormat(index, format)
    else updatePageFormat(index, format)
  }

  async function doExport() {
    setExporting(true)
    try {
      if (activeTarget === 'selection') {
        for (const s of activeSettings) await editorStore.exportSelection(s.scale, s.format)
        return
      }
      for (const s of activeSettings) {
        await editorStore.exportTarget(
          { scope: 'page', pageId: editorStore.state.currentPageId },
          s.format,
          { scale: s.scale }
        )
      }
    } finally {
      setExporting(false)
    }
  }

  const previewKey = useMemo(
    () =>
      `${activeTarget}:${editorStore.state.sceneVersion}:${editorStore.state.currentPageId}:${[
        ...editorStore.state.selectedIds
      ]
        .sort()
        .join(',')}`,
    [
      activeTarget,
      editorStore.state.sceneVersion,
      editorStore.state.currentPageId,
      editorStore.state.selectedIds
    ]
  )

  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null

    async function updatePreview() {
      if (!showPreview) return

      const ids =
        activeTarget === 'selection'
          ? [...editorStore.state.selectedIds]
          : editorStore.graph.getChildren(editorStore.state.currentPageId).map((n) => n.id)

      if (ids.length === 0) {
        setPreviewUrl(null)
        return
      }

      let maxW = 0
      for (const id of ids) {
        const node = editorStore.getNode(id)
        if (node) maxW = Math.max(maxW, node.width)
      }
      const scale = maxW > 0 ? Math.min(PREVIEW_WIDTH / maxW, 2) : 1
      const data = await editorStore.renderExportImage(ids, scale, 'PNG')
      if (cancelled) return
      if (data) {
        createdUrl = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'image/png' }))
        setPreviewUrl(createdUrl)
      }
    }

    void updatePreview()

    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [showPreview, previewKey, activeTarget, editorStore])

  return (
    <div data-test-id="export-section" className={sectionWrapper()}>
      <div className="flex items-center justify-between">
        <label className={sectionLabel()}>{panels.export}</label>
        <button
          type="button"
          data-test-id="export-section-add"
          className={iconButton()}
          onClick={addSetting}
        >
          +
        </button>
      </div>

      {activeSettings.map((setting, i) => (
        <div
          key={`${activeTarget}:${i}`}
          data-test-id="export-item"
          data-test-index={i}
          className="flex items-center gap-1.5 py-0.5"
        >
          <AppSelect
            value={setting.scale}
            options={SCALE_OPTIONS}
            disabled={!formatSupportsScale(setting.format)}
            onValueChange={(v) => updateScale(i, Number(v))}
          />
          <AppSelect
            value={setting.format}
            options={FORMAT_OPTIONS}
            onValueChange={(v) => updateFormat(i, v)}
          />
          <button
            type="button"
            className={iconButton({ className: 'shrink-0' })}
            onClick={() => removeSetting(i)}
          >
            −
          </button>
        </div>
      ))}

      {activeSettings.length > 0 ? (
        <button
          type="button"
          data-test-id="export-button"
          className="mt-1.5 w-full cursor-pointer truncate rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-default disabled:opacity-50"
          disabled={exporting}
          onClick={() => void doExport()}
        >
          Export {activeName}
        </button>
      ) : null}

      {activeSettings.length > 0 ? (
        <button
          type="button"
          data-test-id="export-preview-toggle"
          className="mt-1 flex w-full cursor-pointer items-center gap-1 rounded border-none bg-transparent px-0 py-1 text-[11px] text-muted hover:text-surface"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          Preview
        </button>
      ) : null}

      {showPreview && previewUrl ? (
        <div className="mt-1 overflow-hidden rounded border border-border">
          <img
            src={previewUrl}
            className="block w-full"
            style={{
              imageRendering: 'auto',
              background:
                'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 16px 16px'
            }}
            alt=""
          />
        </div>
      ) : showPreview ? (
        <div className="mt-1 rounded border border-border px-3 py-2 text-[11px] text-muted">
          Rendering preview…
        </div>
      ) : null}
    </div>
  )
}
