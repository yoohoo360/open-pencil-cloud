import {
  EXPORT_FORMATS,
  EXPORT_SCALES,
  MAX_EXPORT_SCALE,
  MIN_EXPORT_SCALE,
  clampExportScale,
  createExportSettingActions,
  createExportTargetState,
  formatSupportsScale
} from '#react/document/export/helpers'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export type { ExportFormatId, ExportSetting } from '@open-pencil/scene-graph'
export type { ExportPanelTarget } from '#react/document/export/helpers'

export function useExport() {
  const editor = useEditor()

  const selectedIds = useSceneComputed(() => [...editor.state.selectedIds])

  const targetState = createExportTargetState(editor, selectedIds)
  const settingActions = createExportSettingActions(editor, targetState.targetIds)

  return {
    editor,
    selectedIds,
    scales: EXPORT_SCALES,
    maxScale: MAX_EXPORT_SCALE,
    minScale: MIN_EXPORT_SCALE,
    clampExportScale,
    formats: EXPORT_FORMATS,
    formatSupportsScale,
    ...targetState,
    ...settingActions
  }
}
