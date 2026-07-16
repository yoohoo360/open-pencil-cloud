import { useState } from 'react'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core'

import { useEditor } from '../context/editorContext'
import { useSceneComputed } from '../internal/useSceneComputed'

export type ExportFormatId = 'png' | 'jpg' | 'webp' | 'svg' | 'fig'
export type ExportPanelTarget = 'selection' | 'page'

interface ExportSetting {
  scale: number
  format: ExportFormatId
}

const SCALES = [0.5, 0.75, 1, 1.5, 2, 3, 4] as const
const FORMATS: ExportFormatId[] = ['png', 'jpg', 'webp', 'svg', 'fig']
const io = new IORegistry(BUILTIN_IO_FORMATS)

function createDefaultSetting(): ExportSetting {
  return { scale: 1, format: 'png' }
}

export function useExport() {
  const editor = useEditor()

  const [selectionSettings, setSelectionSettings] = useState<ExportSetting[]>([
    createDefaultSetting()
  ])
  const [pageSettings, setPageSettings] = useState<ExportSetting[]>([createDefaultSetting()])

  const selectedIds = useSceneComputed(() => [...editor.state.selectedIds])

  const formatSupportsScale = (format: ExportFormatId) =>
    io.getFormat(format)?.exportOptions?.scale ?? false

  const selectedNodeName = useSceneComputed(() => {
    const ids = editor.state.selectedIds
    if (ids.size === 1) {
      const id = [...ids][0]
      return editor.graph.getNode(id)?.name ?? 'Export'
    }
    if (ids.size > 1) return `${ids.size} layers`
    return null
  })

  const currentPageName = useSceneComputed(() => {
    const page = editor.graph.getNode(editor.state.currentPageId)
    return page?.name ?? 'Page'
  })

  const hasSelection = selectedIds.length > 0
  const activeTarget: ExportPanelTarget = hasSelection ? 'selection' : 'page'
  const activeName = activeTarget === 'selection' ? (selectedNodeName ?? 'Export') : currentPageName
  const activeSettings = activeTarget === 'selection' ? selectionSettings : pageSettings

  function addSelectionSetting() {
    setSelectionSettings((prev) => {
      const last = prev[prev.length - 1]
      const nextScale = SCALES.find((s) => s > (last?.scale ?? 1)) ?? 2
      return [...prev, { scale: nextScale, format: last?.format ?? 'png' }]
    })
  }

  function addPageSetting() {
    setPageSettings((prev) => {
      const last = prev[prev.length - 1]
      const nextScale = SCALES.find((s) => s > (last?.scale ?? 1)) ?? 2
      return [...prev, { scale: nextScale, format: last?.format ?? 'png' }]
    })
  }

  function removeSelectionSetting(index: number) {
    setSelectionSettings((prev) => prev.filter((_, i) => i !== index))
  }

  function removePageSetting(index: number) {
    setPageSettings((prev) => prev.filter((_, i) => i !== index))
  }

  function updateSelectionScale(index: number, scale: number) {
    setSelectionSettings((prev) => prev.map((s, i) => (i === index ? { ...s, scale } : s)))
  }

  function updatePageScale(index: number, scale: number) {
    setPageSettings((prev) => prev.map((s, i) => (i === index ? { ...s, scale } : s)))
  }

  function updateSelectionFormat(index: number, format: ExportFormatId) {
    setSelectionSettings((prev) => prev.map((s, i) => (i === index ? { ...s, format } : s)))
  }

  function updatePageFormat(index: number, format: ExportFormatId) {
    setPageSettings((prev) => prev.map((s, i) => (i === index ? { ...s, format } : s)))
  }

  return {
    editor,
    selectedIds,
    scales: SCALES,
    formats: FORMATS,
    formatSupportsScale,
    hasSelection,
    activeTarget,
    activeName,
    activeSettings,
    selectedNodeName,
    currentPageName,
    selectionSettings,
    pageSettings,
    addSelectionSetting,
    addPageSetting,
    removeSelectionSetting,
    removePageSetting,
    updateSelectionScale,
    updatePageScale,
    updateSelectionFormat,
    updatePageFormat
  }
}
