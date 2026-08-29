import { IS_BROWSER } from '@open-pencil/core/constants'
import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { MAX_EXPORT_SCALE, MIN_EXPORT_SCALE, clampExportScale } from '@open-pencil/scene-graph'
import type { ExportFormatId, ExportSetting, PluginDataEntry } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export const EXPORT_SCALES = [0.5, 0.75, 1, 1.5, 2, 3, 4] as const
export const EXPORT_FORMATS: ExportFormatId[] = ['png', 'jpg', 'webp', 'svg', 'pdf']

export type ExportPanelTarget = 'selection' | 'page'

const OPEN_PENCIL_PLUGIN_ID = 'open-pencil'
const EXPORT_SETTINGS_PLUGIN_KEY = 'exportSettings'
const io = new IORegistry(BUILTIN_IO_FORMATS)

export { MIN_EXPORT_SCALE, MAX_EXPORT_SCALE, clampExportScale }

export function formatSupportsScale(format: ExportFormatId) {
  return io.getFormat(format)?.exportOptions?.scale ?? false
}

function createDefaultExportSetting(): ExportSetting {
  return { scale: 1, format: 'png' }
}

function exportSettingsEqual(left: ExportSetting[], right: ExportSetting[]) {
  if (left.length !== right.length) return false
  return left.every((setting, index) => {
    const other = right[index]
    return setting.scale === other.scale && setting.format === other.format
  })
}

function nextExportSetting(settings: ExportSetting[]): ExportSetting {
  const last = settings.at(-1)
  if (!last) return createDefaultExportSetting()
  return {
    scale: clampExportScale(last.scale * 2),
    format: last.format
  }
}

function syncExportSettingsPluginData(
  pluginData: PluginDataEntry[],
  settings: ExportSetting[]
): PluginDataEntry[] {
  const withoutExportSettings = pluginData.filter(
    (entry) =>
      !(entry.pluginId === OPEN_PENCIL_PLUGIN_ID && entry.key === EXPORT_SETTINGS_PLUGIN_KEY)
  )
  if (settings.length === 0) return withoutExportSettings
  return [
    ...withoutExportSettings,
    {
      pluginId: OPEN_PENCIL_PLUGIN_ID,
      key: EXPORT_SETTINGS_PLUGIN_KEY,
      value: JSON.stringify(settings)
    }
  ]
}

export function useExport() {
  const editor = useEditor()
  const selectedIds = useSceneComputed(() => [...editor.state.selectedIds])
  const hasSelection = selectedIds.length > 0
  const activeTarget: ExportPanelTarget = hasSelection ? 'selection' : 'page'
  const targetIds = useSceneComputed(() =>
    selectedIds.length > 0 ? selectedIds : [editor.state.currentPageId]
  )
  const selectedNodeName = (() => {
    const ids = editor.state.selectedIds
    if (ids.size === 1) {
      const id = [...ids][0]
      return editor.graph.getNode(id)?.name ?? 'Export'
    }
    if (ids.size > 1) return `${ids.size} layers`
    return null
  })()
  const currentPageName = editor.graph.getNode(editor.state.currentPageId)?.name ?? 'Page'
  const activeName = activeTarget === 'selection' ? (selectedNodeName ?? 'Export') : currentPageName
  const activeSettings = useSceneComputed(() => {
    const firstId = targetIds[0]
    return firstId ? [...(editor.graph.getNode(firstId)?.exportSettings ?? [])] : []
  })
  const mixed = useSceneComputed(() => {
    const [firstId, ...otherIds] = targetIds
    if (!firstId || otherIds.length === 0) return false
    const first = editor.graph.getNode(firstId)?.exportSettings ?? []
    return otherIds.some((id) => {
      const settings = editor.graph.getNode(id)?.exportSettings ?? []
      return !exportSettingsEqual(first, settings)
    })
  })

  function updateEveryTarget(label: string, update: (settings: ExportSetting[]) => ExportSetting[]) {
    editor.undo.runBatch(label, () => {
      for (const id of targetIds) {
        const node = editor.graph.getNode(id)
        if (!node) continue
        const exportSettings = update(node.exportSettings)
        editor.updateNodeWithUndo(
          id,
          {
            exportSettings,
            pluginData: syncExportSettingsPluginData(node.pluginData, exportSettings)
          },
          label
        )
      }
    })
  }

  function addSetting() {
    updateEveryTarget('Add export setting', (settings) => [...settings, nextExportSetting(settings)])
  }

  function removeSetting(index: number) {
    updateEveryTarget('Remove export setting', (settings) =>
      settings.filter((_, itemIndex) => itemIndex !== index)
    )
  }

  function updateScale(index: number, scale: number) {
    updateEveryTarget('Update export scale', (settings) =>
      settings.map((setting, itemIndex) =>
        itemIndex === index ? { ...setting, scale: clampExportScale(scale) } : setting
      )
    )
  }

  function updateFormat(index: number, format: ExportFormatId) {
    updateEveryTarget('Update export format', (settings) =>
      settings.map((setting, itemIndex) =>
        itemIndex === index ? { ...setting, format } : setting
      )
    )
  }

  async function exportTargets() {
    if (!IS_BROWSER) return
    for (const id of targetIds) {
      const node = editor.graph.getNode(id)
      if (!node) continue
      const target =
        activeTarget === 'page'
          ? ({ scope: 'page' as const, pageId: id })
          : ({ scope: 'node' as const, nodeId: id })
      for (const setting of activeSettings) {
        const result = await io.exportContent(
          setting.format,
          { graph: editor.graph, target },
          setting.format === 'png' || setting.format === 'jpg' || setting.format === 'webp'
            ? { format: setting.format.toUpperCase(), scale: setting.scale }
            : { scale: setting.scale },
          editor.renderer
            ? { canvasKit: editor.renderer.ck, renderer: editor.renderer }
            : undefined
        )
        const bytes =
          typeof result.data === 'string'
            ? new TextEncoder().encode(result.data)
            : result.data
        const blob = new Blob([bytes], { type: result.mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const scaleSuffix =
          formatSupportsScale(setting.format) && setting.scale !== 1 ? `@${setting.scale}x` : ''
        link.href = url
        link.download = `${node.name}${scaleSuffix}.${result.extension}`
        link.click()
        URL.revokeObjectURL(url)
      }
    }
  }

  return {
    editor,
    selectedIds,
    scales: EXPORT_SCALES,
    maxScale: MAX_EXPORT_SCALE,
    minScale: MIN_EXPORT_SCALE,
    clampExportScale,
    formats: EXPORT_FORMATS,
    formatSupportsScale,
    hasSelection,
    activeTarget,
    targetIds,
    selectedNodeName,
    currentPageName,
    activeName,
    activeSettings,
    mixed,
    addSetting,
    removeSetting,
    updateScale,
    updateFormat,
    exportTargets
  }
}
