import { useActiveElement } from '#react/shared/dom/hooks'
import { useEffect, useMemo } from 'react'

import { useEditorCommands, useViewportKind } from '@open-pencil/react'

import { useAIChat } from '@/app/ai/chat/use'
import { useEditorStore } from '@/app/editor/active-store'
import { createKeyboardActions } from '@/app/shell/keyboard/actions'
import { bindEditorClipboard } from '@/app/shell/keyboard/clipboard'
import { isInputElement } from '@/app/shell/keyboard/focus'
import { bindNudgeKeys } from '@/app/shell/keyboard/nudging'
import { registerKeyboardShortcuts } from '@/app/shell/keyboard/registry'
import { openFileDialog } from '@/app/shell/menu/use'
import { closeTab, createTab, getActiveTab } from '@/app/tabs'

export function useKeyboard() {
  const { activeTab } = useAIChat()
  const store = useEditorStore()
  const { isMobile } = useViewportKind()
  const { runCommand, setOpacityTarget } = useEditorCommands()
  const activeElement = useActiveElement()
  const inputFocused = useMemo(
    () => ({
      get value() {
        return isInputElement(activeElement)
      }
    }),
    [activeElement]
  )

  const actions = createKeyboardActions({
    store,
    activeTab,
    isMobile,
    runCommand,
    setOpacityTarget
  })

  useEffect(() => {
    const unbindClipboard = bindEditorClipboard(store)
    const unbindNudge = bindNudgeKeys(store)
    const unbindShortcuts = registerKeyboardShortcuts({
      inputFocused,
      store,
      runCommand,
      actions,
      openFileDialog: () => {
        void openFileDialog()
      },
      closeActiveTab: () => {
        const activeTab = getActiveTab()
        if (activeTab) closeTab(activeTab.id)
      },
      createTab: () => createTab()
    })
    return () => {
      unbindClipboard()
      unbindNudge()
      unbindShortcuts()
    }
  }, [actions, inputFocused, runCommand, store])
}
