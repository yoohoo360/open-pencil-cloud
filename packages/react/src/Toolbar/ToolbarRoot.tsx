import { useState, type ReactNode } from 'react'

import { EDITOR_TOOLS } from '@open-pencil/core/editor'
import { useEditor } from '../context/editorContext'
import { useSceneSnapshot } from '../store/useEditorStore'
import { ToolbarProvider } from './context'

import type { EditorToolDef, Tool } from '@open-pencil/core/editor'
import type { ToolbarContext } from './context'

export interface ToolbarRootProps {
  tools?: EditorToolDef[]
  children: (ctx: ToolbarContext) => ReactNode
}

export function ToolbarRoot({ tools = EDITOR_TOOLS, children }: ToolbarRootProps) {
  const editor = useEditor()
  const activeTool = useSceneSnapshot((e) => e.state.activeTool)
  const [expandedFlyout, setExpandedFlyout] = useState<Tool | null>(null)

  function setTool(tool: Tool) {
    editor.setTool(tool)
    setExpandedFlyout(null)
  }

  function toggleFlyout(tool: Tool) {
    setExpandedFlyout((prev) => (prev === tool ? null : tool))
  }

  function closeFlyout() {
    setExpandedFlyout(null)
  }

  const ctx: ToolbarContext = {
    editor,
    tools,
    activeTool,
    expandedFlyout,
    setTool,
    toggleFlyout,
    closeFlyout
  }

  return <ToolbarProvider value={ctx}>{children(ctx)}</ToolbarProvider>
}

export default ToolbarRoot
