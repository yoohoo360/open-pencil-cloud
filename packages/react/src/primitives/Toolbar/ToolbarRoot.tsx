import { useRef, type ReactNode } from 'react'
import { EDITOR_TOOLS } from '@open-pencil/core/editor'
import type { EditorToolDef, Tool } from '@open-pencil/core/editor'

import { useEditor } from '#react/editor/context'
import { useEditorStore } from '#react/editor/store/use'
import { ToolbarContextProvider } from '#react/primitives/Toolbar/context'
import type { ToolbarContext } from '#react/primitives/Toolbar/context'

interface ToolbarRootProps {
  tools?: EditorToolDef[]
  children?: ReactNode | ((props: {
    tools: EditorToolDef[]
    activeTool: Tool
    expandedFlyout: Tool | null
    actions: { setTool: (t: Tool) => void; toggleFlyout: (t: Tool) => void; closeFlyout: () => void }
  }) => ReactNode)
}

export function ToolbarRoot({ tools = EDITOR_TOOLS, children }: ToolbarRootProps) {
  const editor = useEditor()
  const activeTool = useEditorStore((e) => e.state.activeTool)
  const expandedFlyoutRef = useRef<Tool | null>(null)

  // Stable reactive ref for context consumers
  const expandedFlyoutReactive = { get value() { return expandedFlyoutRef.current } }
  const activeToolReactive = { get value() { return activeTool } }

  function setTool(tool: Tool) {
    editor.setTool(tool)
    expandedFlyoutRef.current = null
  }

  function toggleFlyout(tool: Tool) {
    expandedFlyoutRef.current = expandedFlyoutRef.current === tool ? null : tool
  }

  function closeFlyout() {
    expandedFlyoutRef.current = null
  }

  const ctx: ToolbarContext = {
    editor,
    tools,
    activeTool: activeToolReactive,
    expandedFlyout: expandedFlyoutReactive,
    setTool,
    toggleFlyout,
    closeFlyout
  }

  const slotProps = {
    tools,
    activeTool,
    expandedFlyout: expandedFlyoutRef.current,
    actions: { setTool, toggleFlyout, closeFlyout }
  }

  return (
    <ToolbarContextProvider value={ctx}>
      {typeof children === 'function' ? children(slotProps) : children}
    </ToolbarContextProvider>
  )
}
