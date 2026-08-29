import type { SceneNode } from '@open-pencil/scene-graph'
import type { SnappingPreferences } from '@open-pencil/core/editor'
import { IS_BROWSER } from '@open-pencil/core/constants'

import type { EditorStore } from '#react/app/editor/store'
import type { AppTheme } from '#react/app/shell/theme'

type TextFormatUpdates = {
  fontWeight?: number
  italic?: boolean
  textDecoration?: 'NONE' | 'UNDERLINE'
}

export function setSnappingPreference(
  store: EditorStore,
  preference: keyof SnappingPreferences,
  enabled: boolean
) {
  store.state.snappingPreferences = {
    ...store.state.snappingPreferences,
    [preference]: enabled
  }
  store.notify()
}

export function alignSelected(
  store: EditorStore,
  axis: 'horizontal' | 'vertical',
  align: 'min' | 'center' | 'max'
) {
  store.alignNodes([...store.state.selectedIds], axis, align)
}

export function updateSelectedText(store: EditorStore, updates: TextFormatUpdates) {
  for (const node of store.getSelectedNodes()) {
    if (node.type === 'TEXT') store.updateNodeWithUndo(node.id, updates, 'Format text')
  }
}

export function selectedTextNode(store: EditorStore): SceneNode | undefined {
  return store.getSelectedNodes().find((item) => item.type === 'TEXT')
}

export function toggleSelectedTextBold(store: EditorStore) {
  const node = selectedTextNode(store)
  updateSelectedText(store, {
    fontWeight: node && node.type === 'TEXT' && node.fontWeight >= 700 ? 400 : 700
  })
}

export function toggleSelectedTextItalic(store: EditorStore) {
  const node = selectedTextNode(store)
  updateSelectedText(store, { italic: node && node.type === 'TEXT' ? !node.italic : true })
}

export function toggleSelectedTextUnderline(store: EditorStore) {
  const node = selectedTextNode(store)
  updateSelectedText(store, {
    textDecoration:
      node && node.type === 'TEXT' && node.textDecoration === 'UNDERLINE' ? 'NONE' : 'UNDERLINE'
  })
}

function zoomCenter() {
  if (!IS_BROWSER) return { x: 960, y: 540 }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

export function createSharedEditorMenuActions(
  store: EditorStore,
  setTheme: (theme: AppTheme) => void
) {
  return {
    'zoom-in': () => {
      const center = zoomCenter()
      store.applyZoom(-100, center.x, center.y)
    },
    'zoom-out': () => {
      const center = zoomCenter()
      store.applyZoom(100, center.x, center.y)
    },
    'view-split-right': () => store.splitPane(store.activePaneId, 'horizontal'),
    'view-split-down': () => store.splitPane(store.activePaneId, 'vertical'),
    'view-rulers': () => {
      store.state.showRulers = !store.state.showRulers
      store.requestRepaint()
    },
    'view-multiplayer-cursors': () => {
      store.state.showRemoteCursors = !store.state.showRemoteCursors
      store.requestRepaint()
    },
    'snap-geometry': () =>
      setSnappingPreference(store, 'geometry', !store.state.snappingPreferences.geometry),
    'snap-objects': () =>
      setSnappingPreference(store, 'objects', !store.state.snappingPreferences.objects),
    'snap-pixel-grid': () =>
      setSnappingPreference(store, 'pixelGrid', !store.state.snappingPreferences.pixelGrid),
    'toggle-ui': () => {
      store.setShowUI(!store.state.showUI)
    },
    'theme-light': () => setTheme('light'),
    'theme-dark': () => setTheme('dark'),
    'theme-auto': () => setTheme('auto'),
    'text.bold': () => toggleSelectedTextBold(store),
    'text.italic': () => toggleSelectedTextItalic(store),
    'text.underline': () => toggleSelectedTextUnderline(store),
    'arrange.align-left': () => alignSelected(store, 'horizontal', 'min'),
    'arrange.align-center': () => alignSelected(store, 'horizontal', 'center'),
    'arrange.align-right': () => alignSelected(store, 'horizontal', 'max'),
    'arrange.align-top': () => alignSelected(store, 'vertical', 'min'),
    'arrange.align-middle': () => alignSelected(store, 'vertical', 'center'),
    'arrange.align-bottom': () => alignSelected(store, 'vertical', 'max')
  }
}
