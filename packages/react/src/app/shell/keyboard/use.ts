import { useEffect, useRef } from 'react'

import { IS_BROWSER } from '@open-pencil/core/constants'

import { useEditorCommands } from '#react/editor/commands/use'
import { useViewportKind } from '#react/editor/viewport-kind/use'
import { useEditorStore } from '#react/app/editor/store'
import { createKeyboardActions } from '#react/app/shell/keyboard/actions'
import { bindEditorClipboard } from '#react/app/shell/keyboard/clipboard'
import { isInputElement } from '#react/app/shell/keyboard/focus'
import { bindNudgeKeys } from '#react/app/shell/keyboard/nudging'
import { registerKeyboardShortcuts } from '#react/app/shell/keyboard/registry'
import { openFileDialog } from '#react/app/shell/menu/files'
import { closeTab, createTab, getActiveTab } from '#react/app/tabs'

export function useKeyboard() {
  const store = useEditorStore()
  const { isMobile } = useViewportKind()
  const { runCommand, setOpacityTarget } = useEditorCommands()
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile
  const runCommandRef = useRef(runCommand)
  runCommandRef.current = runCommand
  const setOpacityTargetRef = useRef(setOpacityTarget)
  setOpacityTargetRef.current = setOpacityTarget

  useEffect(() => {
    if (!IS_BROWSER) return

    const actions = createKeyboardActions({
      store,
      isMobile: () => isMobileRef.current,
      runCommand: (id) => runCommandRef.current(id),
      setOpacityTarget: (value, coalesceKey) => setOpacityTargetRef.current(value, coalesceKey)
    })

    const unbindClipboard = bindEditorClipboard(store)
    const unbindNudge = bindNudgeKeys(store)
    const unbindShortcuts = registerKeyboardShortcuts({
      inputFocused: () => isInputElement(document.activeElement),
      store,
      runCommand: (id) => runCommandRef.current(id),
      actions,
      openFileDialog: () => openFileDialog(store),
      closeActiveTab: () => {
        const tab = getActiveTab()
        if (tab) closeTab(tab.id)
      },
      createTab
    })

    return () => {
      unbindClipboard()
      unbindNudge()
      unbindShortcuts()
    }
  }, [store])
}
