import { appMenuShortcutLabel } from '#react/app/shell/menu/shortcut'
import { formatShortcut } from '#react/editor/commands'
import type { Editor } from '@open-pencil/core/editor'
import type { MenuEntry } from '#react/editor/menu-model/types'
import type { createCanvasMenuActions } from '#react/app/editor/canvas/menu/actions'
import {
  CANVAS_COPY_AS_ACTIONS,
  CANVAS_COPY_AS_GROUP_TEST_ID,
  type CanvasContextActionId
} from '#react/app/editor/canvas/menu/registry'

type CanvasMenuActions = ReturnType<typeof createCanvasMenuActions>

export type CanvasContextMenuLabels = {
  copy: string
  cut: string
  pasteHere: string
  pasteToReplace: string
  copyPasteAs: string
  copyAsText: string
  copyAsSVG: string
  copyAsPNG: string
  copyAsJSX: string
  copyNodeId: string
  copyXPath: string
}

function compactSeparators(entries: readonly MenuEntry[]): MenuEntry[] {
  const next: MenuEntry[] = []
  for (const entry of entries) {
    if (entry.separator) {
      if (next.length === 0 || next[next.length - 1]?.separator) continue
      next.push(entry)
      continue
    }
    next.push(entry)
  }
  if (next[next.length - 1]?.separator) next.pop()
  return next
}

function runAsync(action: () => Promise<void>) {
  return () => {
    void action()
  }
}

function copyAction(
  id: CanvasContextActionId,
  editor: Editor,
  actions: CanvasMenuActions
): () => void {
  switch (id) {
    case 'copy-as-text':
      return runAsync(() => actions.clipboardWrite(editor.copySelectionAsText(actions.ids())))
    case 'copy-as-svg':
      return runAsync(() => actions.clipboardWrite(editor.copySelectionAsSVG(actions.ids())))
    case 'copy-as-png':
      return runAsync(actions.copyAsPNG)
    case 'copy-as-jsx':
      return runAsync(() => actions.clipboardWrite(editor.copySelectionAsJSX(actions.ids())))
    case 'copy-node-id':
      return runAsync(actions.copyNodeId)
    case 'copy-xpath':
      return runAsync(actions.copyXPath)
  }
}

function clipboardEntries(
  hasSelection: boolean,
  actions: CanvasMenuActions,
  labels: CanvasContextMenuLabels
): MenuEntry[] {
  return [
    {
      label: labels.copy,
      testId: 'context-copy',
      shortcut: appMenuShortcutLabel('copy'),
      disabled: !hasSelection,
      action: () => actions.execCommand('copy')
    },
    {
      label: labels.cut,
      testId: 'context-cut',
      shortcut: appMenuShortcutLabel('cut'),
      disabled: !hasSelection,
      action: () => actions.execCommand('cut')
    },
    {
      label: labels.pasteHere,
      testId: 'context-paste',
      shortcut: appMenuShortcutLabel('paste'),
      action: () => actions.execCommand('paste')
    },
    {
      label: labels.pasteToReplace,
      testId: 'context-paste-to-replace',
      disabled: !hasSelection,
      action: actions.pasteToReplace
    }
  ]
}

function copyPasteAsEntry(
  editor: Editor,
  actions: CanvasMenuActions,
  labels: CanvasContextMenuLabels
): MenuEntry {
  return {
    label: labels.copyPasteAs,
    testId: CANVAS_COPY_AS_GROUP_TEST_ID,
    sub: CANVAS_COPY_AS_ACTIONS.map((meta) => ({
      label: labels[meta.labelKey],
      testId: meta.testId,
      shortcut: formatShortcut(meta.shortcut),
      action: copyAction(meta.id, editor, actions)
    }))
  }
}

export function buildCanvasContextMenuEntries(
  baseEntries: readonly MenuEntry[],
  hasSelection: boolean,
  editor: Editor,
  actions: CanvasMenuActions,
  labels: CanvasContextMenuLabels
): MenuEntry[] {
  const entries: MenuEntry[] = [
    ...clipboardEntries(hasSelection, actions, labels),
    { separator: true },
    ...baseEntries,
    ...(hasSelection
      ? [{ separator: true } satisfies MenuEntry, copyPasteAsEntry(editor, actions, labels)]
      : [])
  ]
  return compactSeparators(entries)
}
