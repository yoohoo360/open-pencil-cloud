import { useEffect, useRef } from 'react'

import { useEditorCommands, useViewportKind } from '@open-pencil/react'

import { useAIChat } from '@/app/ai/chat/use'
import { useEditorStore } from '@/app/editor/active-store'
import { createKeyboardActions } from '@/app/shell/keyboard/actions'
import { bindEditorClipboard } from '@/app/shell/keyboard/clipboard'
import { isInputElement } from '@/app/shell/keyboard/focus'
import { bindNudgeKeys } from '@/app/shell/keyboard/nudging'
import { registerKeyboardShortcuts } from '@/app/shell/keyboard/registry'
import { openFileDialog } from '@/app/shell/menu/use'
import { closeTab, createTab, $activeTabId, $tabs } from '@/app/tabs'

export function useKeyboard() {
  const { activeTab } = useAIChat()
  const store = useEditorStore()
  const { isMobile } = useViewportKind()
  const { runCommand } = useEditorCommands()

  const inputFocused = useRef(false)
  const inputFocusedRef = { get value() { return inputFocused.current } }

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      inputFocused.current = isInputElement(e.target as Element | null)
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', () => { inputFocused.current = false })
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', () => { inputFocused.current = false })
    }
  }, [])

  useEffect(() => {
    const clipboardDispose = bindEditorClipboard(store)
    const nudgeDispose = bindNudgeKeys(store)

    const actions = createKeyboardActions({ store, activeTab, isMobile, runCommand })

    const unsubscribe = registerKeyboardShortcuts({
      inputFocused: inputFocusedRef,
      store,
      runCommand,
      actions,
      openFileDialog: () => { void openFileDialog() },
      closeActiveTab: () => {
        const tabs = $tabs.get()
        const activeId = $activeTabId.get()
        const tab = tabs.find((t) => t.id === activeId)
        if (tab) closeTab(tab.id)
      },
      createTab: () => createTab()
    })

    return () => {
      unsubscribe?.()
      clipboardDispose?.()
      nudgeDispose?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
