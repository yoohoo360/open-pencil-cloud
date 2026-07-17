import { useEffect } from 'react'

import { useEditorCommands, useI18n } from '@open-pencil/react'
import type { EditorCommandId } from '@open-pencil/react'

import { useEditorStore } from '@/app/editor/active-store'
import { pasteClipboardToReplace } from '@/app/editor/clipboard/paste-to-replace'
import { executeClipboardCommand } from '@/app/editor/clipboard/system'
import { createSharedEditorMenuActions } from '@/app/shell/menu/editor-actions'
import { importFileDialog, openFileDialog } from '@/app/shell/menu/files'
import { useAppTheme } from '@/app/shell/menu/theme-hook'
import { checkForAppUpdate } from '@/app/shell/updater'
import { createTab, closeTab, $activeTabId, $tabs } from '@/app/tabs'
import { isTauri } from '@/app/tauri/env'

const store = useEditorStore()
const COMMAND_MENU_IDS = new Set<string>([
  'edit.undo',
  'edit.redo',
  'selection.selectAll',
  'selection.duplicate',
  'selection.delete',
  'selection.group',
  'selection.ungroup',
  'selection.createComponent',
  'selection.createComponentSet',
  'selection.detachInstance',
  'selection.wrapInAutoLayout',
  'selection.booleanUnion',
  'selection.booleanSubtract',
  'selection.booleanIntersect',
  'selection.booleanExclude',
  'selection.flatten',
  'selection.outlineText',
  'selection.outlineStroke',
  'selection.bringToFront',
  'selection.sendToBack',
  'view.zoom100',
  'view.zoomFit',
  'view.zoomSelection'
])

export { importFileDialog, openFileDialog }
export { openFileFromPath } from '@/app/shell/menu/files'

export function useMenu() {
  const { setTheme } = useAppTheme()
  const { dialogs } = useI18n()
  const { runCommand } = useEditorCommands()

  useEffect(() => {
    if (!isTauri()) return

    const actions: Partial<Record<string, () => void>> = {
      new: () => createTab(),
      open: () => void openFileDialog(),
      close: () => {
        const tabs = $tabs.get()
        const activeId = $activeTabId.get()
        const tab = tabs.find((t) => t.id === activeId)
        if (tab) closeTab(tab.id)
      },
      save: () => void store.saveFigFile(),
      'save-as': () => void store.saveFigFileAs(),
      'export-selection': () => {
        if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'png')
      },
      'export-png': () => {
        if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'png')
      },
      'export-svg': () => {
        if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'svg')
      },
      'export-fig': () => {
        if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'fig')
      },
      autosave: () => {
        store.state.autosaveEnabled = !store.state.autosaveEnabled
      },
      copy: () => void executeClipboardCommand(store, 'copy'),
      cut: () => void executeClipboardCommand(store, 'cut'),
      paste: () => void executeClipboardCommand(store, 'paste'),
      'paste-to-replace': () => void pasteClipboardToReplace(store),
      'check-updates': () => void checkForAppUpdate({ messages: dialogs }),
      ...createSharedEditorMenuActions(setTheme)
    }

    let unlisten: (() => void) | undefined

    void import('@tauri-apps/api/event').then(({ listen }) => {
      return listen<string>('menu-event', (event) => {
        if (COMMAND_MENU_IDS.has(event.payload)) {
          runCommand(event.payload as EditorCommandId)
          return
        }
        actions[event.payload]?.()
      }).then((fn) => {
        unlisten = fn
        return undefined
      })
    })

    return () => unlisten?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
