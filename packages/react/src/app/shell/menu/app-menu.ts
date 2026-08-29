import type { MenuEntry } from '#react/editor/menu-model/types'
import { useEditorCommands } from '#react/editor/commands/use'
import { useI18n } from '#react/i18n'

import { useEditorStore } from '#react/app/editor/store'
import { openSettingsDialog } from '#react/app/settings/dialog'
import {
  createSharedEditorMenuActions,
  setSnappingPreference
} from '#react/app/shell/menu/editor-actions'
import type { AppMenuActionItem, AppMenuEntry, AppMenuGroupSchema } from '#react/app/shell/menu/schema'
import { APP_MENU_SCHEMA } from '#react/app/shell/menu/schema'
import { createSelectionMenuActions } from '#react/app/shell/menu/selection-actions'
import { appMenuShortcutLabel } from '#react/app/shell/menu/shortcut'
import { useAppTheme } from '#react/app/shell/theme'
import { closeTab, createTab, getActiveTab } from '#react/app/tabs'
import { menuMessageDefaults } from '#react/i18n/messages/menu'

export interface AppMenuGroup {
  label: string
  testId: string
  items: MenuEntry[]
}

function isVisible(entry: { target?: string }) {
  return entry.target !== 'native'
}

function isSeparator(entry: AppMenuEntry): entry is Extract<AppMenuEntry, { type: 'separator' }> {
  return entry.type === 'separator'
}

const TRANSLATED_MENU_ITEM_LABELS: Partial<Record<string, keyof typeof menuMessageDefaults>> = {
  new: 'new',
  open: 'open',
  'open-storage-workspace': 'openStorageWorkspace',
  save: 'save',
  'save-as': 'saveAs',
  'export-selection': 'exportSelection',
  autosave: 'autosave',
  close: 'closeTab',
  copy: 'copy',
  cut: 'cut',
  paste: 'paste',
  'paste-to-replace': 'pasteToReplace',
  'selection.rename': 'renameSelection',
  'selection.moveToPage': 'moveToPage',
  language: 'language',
  preferences: 'preferences',
  settings: 'settings',
  'view-rulers': 'rulers',
  'view-multiplayer-cursors': 'multiplayerCursors',
  'snap-geometry': 'snapToGeometry',
  'snap-objects': 'snapToObjects',
  'snap-pixel-grid': 'snapToPixelGrid',
  profiler: 'profiler',
  'toggle-ui': 'toggleUI',
  theme: 'theme',
  'theme-light': 'themeLight',
  'theme-dark': 'themeDark',
  'theme-auto': 'themeAuto',
  'zoom-in': 'zoomIn',
  'zoom-out': 'zoomOut',
  'view-split-right': 'splitRight',
  'view-split-down': 'splitDown',
  'text.bold': 'bold',
  'text.italic': 'italic',
  'text.underline': 'underline',
  'arrange.align-left': 'arrangeAlignLeft',
  'arrange.align-center': 'arrangeAlignCenter',
  'arrange.align-right': 'arrangeAlignRight',
  'arrange.align-top': 'arrangeAlignTop',
  'arrange.align-middle': 'arrangeAlignMiddle',
  'arrange.align-bottom': 'arrangeAlignBottom'
}

export function useAppMenu() {
  const store = useEditorStore()
  const { commands, menuItem: commandMenuItem, otherPages, moveSelectionToPage } = useEditorCommands()
  const { menu, locale, availableLocales, localeLabels, setLocale } = useI18n()
  const { theme, setTheme } = useAppTheme()

  const languageMenu: MenuEntry[] = availableLocales.map((code) => ({
    label: localeLabels[code],
    checked: locale === code,
    onCheckedChange: (checked: boolean) => {
      if (checked) setLocale(code)
    }
  }))

  function toggleProfiler() {
    const visible = !(store.renderer?.profiler.hudVisible ?? false)
    for (const renderer of store.canvasRenderers) {
      renderer.profiler.setVisible(visible)
    }
    store.requestRepaint()
  }

  const actions: Partial<Record<string, () => void>> = {
    new: () => {
      store.state.documentName = 'Untitled'
      store.notify()
      createTab()
    },
    open: () => undefined,
    'open-storage-workspace': () => undefined,
    save: () => undefined,
    'save-as': () => undefined,
    'export-selection': () => undefined,
    ...createSelectionMenuActions(store),
    close: () => {
      const tab = getActiveTab()
      if (tab) closeTab(tab.id)
    },
    settings: openSettingsDialog,
    'export-png': () => undefined,
    'export-svg': () => undefined,
    'export-pptx': () => undefined,
    'export-fig': () => undefined,
    ...createSharedEditorMenuActions(store, setTheme),
    profiler: toggleProfiler
  }

  function itemAction(item: AppMenuActionItem): (() => void) | undefined {
    return actions[item.id]
  }

  function checked(item: AppMenuActionItem): boolean | undefined {
    switch (item.id) {
      case 'autosave':
        return store.state.autosaveEnabled
      case 'profiler':
        return store.renderer?.profiler.hudVisible ?? false
      case 'view-rulers':
        return store.state.showRulers
      case 'view-multiplayer-cursors':
        return store.state.showRemoteCursors
      case 'snap-geometry':
        return store.state.snappingPreferences.geometry
      case 'snap-objects':
        return store.state.snappingPreferences.objects
      case 'snap-pixel-grid':
        return store.state.snappingPreferences.pixelGrid
      case 'theme-light':
        return theme === 'light'
      case 'theme-dark':
        return theme === 'dark'
      case 'theme-auto':
        return theme === 'auto'
      default:
        return undefined
    }
  }

  function onCheckedChange(item: AppMenuActionItem): ((checked: boolean) => void) | undefined {
    switch (item.id) {
      case 'autosave':
        return (value: boolean) => {
          store.state.autosaveEnabled = value
          store.notify()
        }
      case 'profiler':
        return () => toggleProfiler()
      case 'view-rulers':
        return (value: boolean) => {
          if (store.state.showRulers !== value) itemAction(item)?.()
        }
      case 'view-multiplayer-cursors':
        return (value: boolean) => {
          if (store.state.showRemoteCursors !== value) itemAction(item)?.()
        }
      case 'snap-geometry':
        return (value: boolean) => setSnappingPreference(store, 'geometry', value)
      case 'snap-objects':
        return (value: boolean) => setSnappingPreference(store, 'objects', value)
      case 'snap-pixel-grid':
        return (value: boolean) => setSnappingPreference(store, 'pixelGrid', value)
      case 'theme-light':
      case 'theme-dark':
      case 'theme-auto':
        return (value: boolean) => {
          if (value) itemAction(item)?.()
        }
      default:
        return undefined
    }
  }

  function disabled(item: AppMenuActionItem): boolean | undefined {
    switch (item.id) {
      case 'view-split-right':
      case 'view-split-down':
        return store.visiblePaneCount >= store.panes.maxVisiblePanes
      default:
        return undefined
    }
  }

  function translatedLabel(entry: AppMenuActionItem): string {
    const key = TRANSLATED_MENU_ITEM_LABELS[entry.id]
    return key ? menu[key] : entry.label
  }

  function buildEntry(entry: AppMenuEntry): MenuEntry | null {
    if (!isVisible(entry)) return null
    if (isSeparator(entry)) return { separator: true }

    if (entry.id === 'language') {
      return { label: translatedLabel(entry), sub: languageMenu }
    }

    if (entry.id === 'selection.moveToPage') {
      if (otherPages.length === 0) return null
      const moveDisabled = !commands['selection.moveToPage']?.enabled
      return {
        label: translatedLabel(entry),
        disabled: moveDisabled,
        sub: otherPages.map((page) => ({
          label: page.name,
          disabled: moveDisabled,
          action: () => moveSelectionToPage(page.id)
        }))
      }
    }

    if (entry.command) {
      return commandMenuItem(entry.command, appMenuShortcutLabel(entry.id))
    }

    return {
      label: translatedLabel(entry),
      shortcut: appMenuShortcutLabel(entry.id),
      action: itemAction(entry),
      disabled: disabled(entry),
      checked: checked(entry),
      onCheckedChange: onCheckedChange(entry),
      sub: entry.sub?.map(buildEntry).filter((item): item is MenuEntry => item !== null)
    }
  }

  function groupLabel(group: AppMenuGroupSchema): string {
    const key = group.label.toLowerCase() as keyof typeof menu
    return menu[key] ?? group.label
  }

  function buildGroup(group: AppMenuGroupSchema): AppMenuGroup | null {
    if (!isVisible(group)) return null
    return {
      label: groupLabel(group),
      testId: `menubar-${group.label.toLowerCase()}`,
      items: group.items.map(buildEntry).filter((item): item is MenuEntry => item !== null)
    }
  }

  const topMenus = APP_MENU_SCHEMA.map(buildGroup).filter(
    (group): group is AppMenuGroup => group !== null
  )

  return { topMenus }
}
