import { useEffect } from 'react'

import { openFileDialog, importFileDialog } from '@/composables/use-menu'
import { IS_TAURI } from '@/constants'
import { useEditorStore } from '@/stores/editor'
import { activeTab, closeTab, createTab } from '@/stores/tabs'

/**
 * Tauri native menu events → editor actions (React port of useMenu).
 */
export function useTauriMenu() {
  const store = useEditorStore()

  useEffect(() => {
    if (!IS_TAURI) return undefined

    let unlisten: (() => void) | undefined
    let cancelled = false

    const MENU_ACTIONS: Partial<Record<string, () => void>> = {
      new: () => createTab(),
      open: () => void openFileDialog(),
      import: () => void importFileDialog(),
      close: () => {
        if (activeTab.value) closeTab(activeTab.value.id)
      },
      save: () => void store.saveFigFile(),
      'save-as': () => void store.saveFigFileAs(),
      duplicate: () => store.duplicateSelected(),
      delete: () => store.deleteSelected(),
      group: () => store.groupSelected(),
      ungroup: () => store.ungroupSelected(),
      'create-component': () => store.createComponentFromSelection(),
      'create-component-set': () => store.createComponentSetFromComponents(),
      'detach-instance': () => store.detachInstance(),
      'zoom-100': () => store.zoomTo100(),
      'zoom-fit': () => store.zoomToFit(),
      'zoom-selection': () => store.zoomToSelection(),
      export: () => {
        if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'png')
      }
    }

    void import('@tauri-apps/api/event').then(({ listen }) => {
      if (cancelled) return
      void listen<string>('menu-event', (event) => {
        const action = MENU_ACTIONS[event.payload]
        if (action) action()
      }).then((fn) => {
        if (cancelled) {
          fn()
          return
        }
        unlisten = fn
      })
    })

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [store])
}
