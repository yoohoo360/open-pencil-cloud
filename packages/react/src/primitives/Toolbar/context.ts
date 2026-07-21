import { createContext, useContext } from 'react'

import type { Editor, EditorToolDef, Tool } from '@open-pencil/core/editor'

export interface ToolbarContext {
  editor: Editor
  tools: EditorToolDef[]
  activeTool: Tool
  expandedFlyout: Tool | null
  setTool: (tool: Tool) => void
  toggleFlyout: (tool: Tool) => void
  closeFlyout: () => void
}

const ToolbarContext = createContext<ToolbarContext | null>(null)
ToolbarContext.displayName = 'OpenPencilToolbar'
export const ToolbarProvider = ToolbarContext.Provider

export function useToolbar(): ToolbarContext {
  const context = useContext(ToolbarContext)
  if (!context) throw new Error('[open-pencil] useToolbar() called outside <ToolbarRoot>')
  return context
}
