import { useEffect, useRef } from 'react'

import { IS_BROWSER } from '@open-pencil/core/constants'
import { TOOL_SHORTCUTS, type Tool } from '@open-pencil/core/editor'

import { useEditorStore } from '#react/app/editor/store'

const OVERLAY_SELECTOR = '[data-picker-content], [role="dialog"], [role="listbox"], [role="menu"]'

function isEditableTarget(target: EventTarget | null | undefined) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

function shouldIgnoreToolShortcut(event: KeyboardEvent, editingTextId: string | null) {
  if (editingTextId) return true
  if (document.querySelector('[data-dismissable-layer]')) return true
  return event.composedPath().some((target) => {
    if (!(target instanceof Element)) return false
    return isEditableTarget(target) || target.matches(OVERLAY_SELECTOR)
  })
}

export function useToolbarShortcuts() {
  const store = useEditorStore()
  const toolBeforeSpace = useRef<Tool | null>(null)

  useEffect(() => {
    if (!IS_BROWSER) return

    function restoreTool() {
      if (toolBeforeSpace.current === null) return
      store.setTool(toolBeforeSpace.current)
      toolBeforeSpace.current = null
    }

    function onKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreToolShortcut(event, store.state.editingTextId)) return

      if (event.code === 'Space') {
        if (event.metaKey || event.ctrlKey || event.altKey) return
        event.preventDefault()
        if (toolBeforeSpace.current !== null || store.state.activeTool === 'HAND') return
        toolBeforeSpace.current = store.state.activeTool
        store.setTool('HAND')
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      const tool = TOOL_SHORTCUTS[event.code]
      if (!tool) return
      event.preventDefault()
      toolBeforeSpace.current = null
      store.setTool(tool)
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.code === 'Space') restoreTool()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', restoreTool)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', restoreTool)
    }
  }, [store])
}
