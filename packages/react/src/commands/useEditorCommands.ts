import { useEditor } from '../context/editorContext'
import { useI18n } from '../i18n'
import { usePageList } from '../PageList/usePageList'
import { useSelectionCapabilities } from '../selection/useSelectionCapabilities'
import { useSelectionState } from '../selection/useSelectionState'

import type { ComponentType } from 'react'

/**
 * Stable command identifiers exposed by {@link useEditorCommands}.
 */
export type EditorCommandId =
  | 'edit.undo'
  | 'edit.redo'
  | 'selection.selectAll'
  | 'selection.duplicate'
  | 'selection.delete'
  | 'selection.group'
  | 'selection.ungroup'
  | 'selection.createComponent'
  | 'selection.createComponentSet'
  | 'selection.createInstance'
  | 'selection.detachInstance'
  | 'selection.goToMainComponent'
  | 'selection.wrapInAutoLayout'
  | 'selection.bringToFront'
  | 'selection.sendToBack'
  | 'selection.toggleVisibility'
  | 'selection.toggleLock'
  | 'selection.moveToPage'
  | 'view.zoom100'
  | 'view.zoomFit'
  | 'view.zoomSelection'

/**
 * Editor command descriptor with plain (non-ref) enabled state.
 */
export interface EditorCommand {
  /** Stable command id. */
  id: EditorCommandId
  /** Human-readable label for UI. */
  label: string
  /** Whether the command can currently run. */
  enabled: boolean
  /** Executes the command. */
  run: () => void
}

export interface EditorCommandMenuItem {
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  icon?: ComponentType
}

export interface EditorCommandMenuSeparator {
  separator: true
}

export type EditorCommandMenuEntry = EditorCommandMenuItem | EditorCommandMenuSeparator

/**
 * Builds a command-oriented interface on top of the current editor.
 *
 * Use this hook when building menus, toolbars, keyboard handlers, or
 * any other UI that should talk in terms of commands instead of raw editor
 * method calls.
 */
export function useEditorCommands() {
  const editor = useEditor()
  const selection = useSelectionState()
  const capabilities = useSelectionCapabilities()
  const { pages } = usePageList()
  const { commands: t } = useI18n()

  const otherPages = pages.filter((page) => page.id !== editor.state.currentPageId)

  function moveSelectionToPage(pageId: string) {
    if (!capabilities.canMoveToPage) return
    editor.moveToPage(pageId)
  }

  const commands: Record<EditorCommandId, EditorCommand> = {
    'edit.undo': {
      id: 'edit.undo',
      label: t.undo,
      enabled: capabilities.canUndo,
      run: () => editor.undoAction()
    },
    'edit.redo': {
      id: 'edit.redo',
      label: t.redo,
      enabled: capabilities.canRedo,
      run: () => editor.redoAction()
    },
    'selection.selectAll': {
      id: 'selection.selectAll',
      label: t.selectAll,
      enabled: capabilities.canSelectAll,
      run: () => editor.selectAll()
    },
    'selection.duplicate': {
      id: 'selection.duplicate',
      label: t.duplicate,
      enabled: capabilities.canDuplicate,
      run: () => editor.duplicateSelected()
    },
    'selection.delete': {
      id: 'selection.delete',
      label: t.delete,
      enabled: capabilities.canDelete,
      run: () => editor.deleteSelected()
    },
    'selection.group': {
      id: 'selection.group',
      label: t.group,
      enabled: capabilities.canGroup,
      run: () => editor.groupSelected()
    },
    'selection.ungroup': {
      id: 'selection.ungroup',
      label: t.ungroup,
      enabled: capabilities.canUngroup,
      run: () => editor.ungroupSelected()
    },
    'selection.createComponent': {
      id: 'selection.createComponent',
      label: t.createComponent,
      enabled: capabilities.canCreateComponent,
      run: () => editor.createComponentFromSelection()
    },
    'selection.createComponentSet': {
      id: 'selection.createComponentSet',
      label: t.createComponentSet,
      enabled: capabilities.canCreateComponentSet,
      run: () => editor.createComponentSetFromComponents()
    },
    'selection.createInstance': {
      id: 'selection.createInstance',
      label: t.createInstance,
      enabled: capabilities.canCreateInstance,
      run: () => {
        const node = selection.selectedNode
        if (node?.type === 'COMPONENT') editor.createInstanceFromComponent(node.id)
      }
    },
    'selection.detachInstance': {
      id: 'selection.detachInstance',
      label: t.detachInstance,
      enabled: capabilities.canDetachInstance,
      run: () => editor.detachInstance()
    },
    'selection.goToMainComponent': {
      id: 'selection.goToMainComponent',
      label: t.goToMainComponent,
      enabled: capabilities.canGoToMainComponent,
      run: () => editor.goToMainComponent()
    },
    'selection.wrapInAutoLayout': {
      id: 'selection.wrapInAutoLayout',
      label: t.addAutoLayout,
      enabled: capabilities.canWrapInAutoLayout,
      run: () => editor.wrapInAutoLayout()
    },
    'selection.bringToFront': {
      id: 'selection.bringToFront',
      label: t.bringToFront,
      enabled: capabilities.canBringToFront,
      run: () => editor.bringToFront()
    },
    'selection.sendToBack': {
      id: 'selection.sendToBack',
      label: t.sendToBack,
      enabled: capabilities.canSendToBack,
      run: () => editor.sendToBack()
    },
    'selection.toggleVisibility': {
      id: 'selection.toggleVisibility',
      label: t.toggleVisibility,
      enabled: capabilities.canToggleVisibility,
      run: () => editor.toggleVisibility()
    },
    'selection.toggleLock': {
      id: 'selection.toggleLock',
      label: t.toggleLock,
      enabled: capabilities.canToggleLock,
      run: () => editor.toggleLock()
    },
    'selection.moveToPage': {
      id: 'selection.moveToPage',
      label: t.moveToPage,
      enabled: capabilities.canMoveToPage,
      run: () => {
        const targetPage = otherPages[0]
        if (targetPage) moveSelectionToPage(targetPage.id)
      }
    },
    'view.zoom100': {
      id: 'view.zoom100',
      label: t.zoomTo100,
      enabled: true,
      run: () => editor.zoomTo100()
    },
    'view.zoomFit': {
      id: 'view.zoomFit',
      label: t.zoomToFit,
      enabled: true,
      run: () => editor.zoomToFit()
    },
    'view.zoomSelection': {
      id: 'view.zoomSelection',
      label: t.zoomToSelection,
      enabled: capabilities.canZoomToSelection,
      run: () => editor.zoomToSelection()
    }
  }

  function getCommand(id: EditorCommandId) {
    return commands[id]
  }

  function runCommand(id: EditorCommandId) {
    const command = commands[id]
    if (command.enabled) command.run()
  }

  function menuItem(id: EditorCommandId, shortcut?: string): EditorCommandMenuItem {
    const command = getCommand(id)
    return {
      label: command.label,
      shortcut,
      disabled: !command.enabled,
      action: () => runCommand(id)
    }
  }

  return {
    commands,
    otherPages,
    getCommand,
    runCommand,
    moveSelectionToPage,
    menuItem
  }
}
