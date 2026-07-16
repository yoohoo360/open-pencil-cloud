import { useEffect } from 'react'

import { useAIChat, setAIPropertiesTab } from '@/composables/use-chat'
import { openFileDialog } from '@/composables/use-menu'
import { TOOL_SHORTCUTS, useEditorStore } from '@/stores/editor'
import { notifyEditorUI } from '@/stores/editor-notify'
import { closeTab, createTab, getActiveTab } from '@/stores/tabs'
import {
  extractImageFilesFromClipboard,
  useEditorCommands,
  useViewportKind
} from '@open-pencil/react'

import type { EditorStore } from '@/stores/editor'
import type { EditorCommandId } from '@open-pencil/react'

function isEditing(e: Event) {
  return e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
}

const PREVENT_MOD_ALT = new Set(['KeyK', 'KeyB'])
const PREVENT_MOD_SHIFT = new Set(['KeyK', 'KeyH', 'KeyL', 'KeyE', 'KeyS', 'KeyG', 'KeyZ'])
const PREVENT_MOD_ONLY = new Set([
  'Backslash',
  'KeyJ',
  'KeyW',
  'KeyN',
  'KeyT',
  'KeyZ',
  'KeyY',
  'Digit0',
  'Digit1',
  'Digit2',
  'KeyD',
  'KeyA',
  'KeyS',
  'KeyO',
  'KeyG'
])
const PREVENT_SHIFT_ONLY = new Set(['Digit1', 'Digit2', 'KeyA'])
const PREVENT_PLAIN_KEY = new Set(['BracketLeft', 'BracketRight'])
const PREVENT_DELETE_KEY = new Set(['Backspace', 'Delete'])

function shouldPreventDefault(e: KeyboardEvent, hasPenState: boolean): boolean {
  const mod = e.metaKey || e.ctrlKey

  if (mod) {
    if (e.altKey && PREVENT_MOD_ALT.has(e.code)) return true
    if (e.shiftKey && PREVENT_MOD_SHIFT.has(e.code)) return true
    if (!e.shiftKey && !e.altKey && PREVENT_MOD_ONLY.has(e.code)) return true
  } else {
    if (e.shiftKey && PREVENT_SHIFT_ONLY.has(e.code)) return true
    if (!e.shiftKey && PREVENT_PLAIN_KEY.has(e.code)) return true
  }

  return PREVENT_DELETE_KEY.has(e.code) || (e.code === 'Enter' && hasPenState)
}

type RunCommand = (id: EditorCommandId) => void

type ShortcutCtx = {
  store: EditorStore
  runCommand: RunCommand
  isMobile: boolean
  aiTabValue: 'design' | 'code' | 'ai'
}

const MOD_COMMANDS: Partial<Record<string, EditorCommandId>> = {
  KeyZ: 'edit.undo',
  KeyY: 'edit.redo',
  Digit0: 'view.zoom100',
  Digit1: 'view.zoomFit',
  Digit2: 'view.zoomSelection',
  KeyD: 'selection.duplicate',
  KeyA: 'selection.selectAll',
  KeyG: 'selection.group'
}

const MOD_SHIFT_COMMANDS: Partial<Record<string, EditorCommandId>> = {
  KeyK: 'selection.createComponentSet',
  KeyH: 'selection.toggleVisibility',
  KeyL: 'selection.toggleLock',
  KeyG: 'selection.ungroup',
  KeyZ: 'edit.redo'
}

const MOD_ALT_COMMANDS: Partial<Record<string, EditorCommandId>> = {
  KeyK: 'selection.createComponent',
  KeyB: 'selection.detachInstance'
}

function deleteOrBreak(store: EditorStore, alt: boolean) {
  const edit = store.state.nodeEditState
  if (edit && (edit.selectedVertexIndices.size > 0 || edit.selectedHandles.size > 0)) {
    if (alt) store.nodeEditBreakAtVertex()
    else store.nodeEditDeleteSelected()
    return true
  }
  return false
}

function runEscape(store: EditorStore, isMobile: boolean) {
  if (store.state.nodeEditState) {
    store.exitNodeEditMode(true)
    return
  }
  if (store.state.penState) {
    store.penCommit(false)
    return
  }
  if (store.state.enteredContainerId) {
    store.exitContainer()
    return
  }
  if (isMobile) {
    store.state.mobileDrawerSnap = 'closed'
    return
  }
  store.clearSelection()
  store.setTool('SELECT')
}

function runModSpecial(code: string, ctx: ShortcutCtx): boolean {
  const { store, isMobile, aiTabValue } = ctx
  if (code === 'Backslash') {
    store.state.showUI = !store.state.showUI
    store.requestRepaint()
    notifyEditorUI()
    return true
  }
  if (code === 'KeyJ') {
    if (isMobile) {
      store.state.activeRibbonTab = store.state.activeRibbonTab === 'ai' ? 'panels' : 'ai'
      if (store.state.mobileDrawerSnap === 'closed') store.state.mobileDrawerSnap = 'half'
    } else {
      setAIPropertiesTab(aiTabValue === 'ai' ? 'design' : 'ai')
    }
    return true
  }
  if (code === 'KeyW') {
    const tab = getActiveTab()
    if (tab) closeTab(tab.id)
    return true
  }
  if (code === 'KeyN' || code === 'KeyT') {
    createTab()
    return true
  }
  if (code === 'KeyS') {
    void store.saveFigFile()
    return true
  }
  if (code === 'KeyO') {
    void openFileDialog()
    return true
  }
  return false
}

function runModAction(e: KeyboardEvent, ctx: ShortcutCtx): boolean {
  const { code } = e
  const { store, runCommand } = ctx

  if (e.altKey) {
    const id = MOD_ALT_COMMANDS[code]
    if (id) runCommand(id)
    return !!id
  }

  if (e.shiftKey) {
    if (code === 'KeyE') {
      if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'png')
      return true
    }
    if (code === 'KeyS') {
      void store.saveFigFileAs()
      return true
    }
    const id = MOD_SHIFT_COMMANDS[code]
    if (id) runCommand(id)
    return !!id
  }

  if (runModSpecial(code, ctx)) return true
  const id = MOD_COMMANDS[code]
  if (id) runCommand(id)
  return !!id
}

function runShiftPlain(code: string, ctx: ShortcutCtx): boolean {
  const { store, runCommand } = ctx
  if (code === 'Digit1') {
    runCommand('view.zoomFit')
    return true
  }
  if (code === 'Digit2') {
    runCommand('view.zoomSelection')
    return true
  }
  if (code === 'KeyA') {
    const node = store.selectedNode.value
    if (node?.type === 'FRAME' && store.selectedNodes.value.length === 1) {
      store.setLayoutMode(node.id, node.layoutMode === 'NONE' ? 'VERTICAL' : 'NONE')
    } else if (store.selectedNodes.value.length > 0) {
      runCommand('selection.wrapInAutoLayout')
    }
    return true
  }
  return false
}

function runPlainAction(e: KeyboardEvent, ctx: ShortcutCtx): boolean {
  if (e.metaKey || e.ctrlKey) return false
  const { code } = e
  const { store, runCommand, isMobile } = ctx

  if (e.shiftKey) return runShiftPlain(code, ctx)

  if (code === 'BracketRight') {
    runCommand('selection.bringToFront')
    return true
  }
  if (code === 'BracketLeft') {
    runCommand('selection.sendToBack')
    return true
  }
  if (code === 'Backspace') {
    if (!deleteOrBreak(store, false)) runCommand('selection.delete')
    return true
  }
  if (code === 'Delete') {
    if (!deleteOrBreak(store, e.altKey)) runCommand('selection.delete')
    return true
  }
  if (code === 'Enter') {
    if (store.state.nodeEditState) store.exitNodeEditMode(true)
    else if (store.state.penState) store.penCommit(false)
    return true
  }
  if (code === 'Escape') {
    runEscape(store, isMobile)
    return true
  }
  return false
}

/**
 * React port of the Vue useKeyboard composable — document-level editor shortcuts.
 */
export function useEditorKeyboard() {
  const store = useEditorStore()
  const { runCommand } = useEditorCommands()
  const { isMobile } = useViewportKind()
  const { activeTab: aiTab } = useAIChat()

  useEffect(() => {
    let toolBeforeSpace: typeof store.state.activeTool | null = null

    const ctx = (): ShortcutCtx => ({
      store,
      runCommand,
      isMobile,
      aiTabValue: aiTab.value
    })

    const onCopy = (e: ClipboardEvent) => {
      if (isEditing(e)) return
      e.preventDefault()
      if (e.clipboardData) store.writeCopyData(e.clipboardData)
    }

    const onCut = (e: ClipboardEvent) => {
      if (isEditing(e)) return
      e.preventDefault()
      if (e.clipboardData) store.writeCopyData(e.clipboardData)
      store.deleteSelected()
    }

    const onPaste = (e: ClipboardEvent) => {
      if (isEditing(e)) return
      e.preventDefault()

      const { cursorCanvasX: ccx, cursorCanvasY: ccy } = store.state
      const cursorPos = ccx != null && ccy != null ? { x: ccx, y: ccy } : undefined

      const imageFiles = extractImageFilesFromClipboard(e)
      if (imageFiles.length) {
        const cx = cursorPos?.x ?? (-store.state.panX + window.innerWidth / 2) / store.state.zoom
        const cy = cursorPos?.y ?? (-store.state.panY + window.innerHeight / 2) / store.state.zoom
        void store.placeImageFiles(imageFiles, cx, cy)
        return
      }

      const html = e.clipboardData?.getData('text/html') ?? ''
      if (html) store.pasteFromHTML(html, cursorPos)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditing(e)) return
      if (store.state.editingTextId) return

      const mod = e.metaKey || e.ctrlKey
      const { code } = e

      if (code === 'Space' && !mod && !e.altKey && !e.repeat && toolBeforeSpace === null) {
        if (store.state.activeTool !== 'HAND') {
          toolBeforeSpace = store.state.activeTool
          store.setTool('HAND')
        }
        e.preventDefault()
        return
      }

      if (!mod && !e.altKey && !e.shiftKey) {
        const tool = TOOL_SHORTCUTS[code]
        if (tool) {
          toolBeforeSpace = null
          store.setTool(tool)
          return
        }
      }

      if (shouldPreventDefault(e, !!store.state.penState)) e.preventDefault()

      if (mod) {
        runModAction(e, ctx())
        return
      }
      runPlainAction(e, ctx())
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && toolBeforeSpace !== null) {
        store.setTool(toolBeforeSpace)
        toolBeforeSpace = null
        e.preventDefault()
      }
    }

    window.addEventListener('copy', onCopy)
    window.addEventListener('cut', onCut)
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('copy', onCopy)
      window.removeEventListener('cut', onCut)
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [store, runCommand, isMobile, aiTab])
}
