import { useState, type ReactNode } from 'react'

import { EDITOR_TOOLS } from '@open-pencil/core/editor'

import { useEditor, useEditorVersion } from '../context/editorContext'
import { ToolbarProvider } from './context'

import type { EditorToolDef, Tool } from '@open-pencil/core/editor'

export interface ToolbarRootSlotProps {
  tools: EditorToolDef[]
  activeTool: Tool
  expandedFlyout: Tool | null
  setTool: (tool: Tool) => void
  toggleFlyout: (tool: Tool) => void
  closeFlyout: () => void
}

export interface ToolbarRootProps {
  tools?: EditorToolDef[]
  children?: ReactNode | ((state: ToolbarRootSlotProps) => ReactNode)
}

export function ToolbarRoot({ tools = EDITOR_TOOLS, children }: ToolbarRootProps) {
  const editor = useEditor()
  useEditorVersion()
  const activeTool = editor.state.activeTool
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

  const slot: ToolbarRootSlotProps = {
    tools,
    activeTool,
    expandedFlyout,
    setTool,
    toggleFlyout,
    closeFlyout
  }

  const content = typeof children === 'function' ? children(slot) : children

  return (
    <ToolbarProvider
      value={{
        editor,
        tools,
        activeTool,
        expandedFlyout,
        setTool,
        toggleFlyout,
        closeFlyout
      }}
    >
      {content}
    </ToolbarProvider>
  )
}
