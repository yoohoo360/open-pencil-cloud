import type { Editor, EditorToolDef, Tool } from '@open-pencil/core/editor'

import { createContext } from '../context/createContext'

export interface ToolbarContext {
  editor: Editor
  tools: EditorToolDef[]
  activeTool: Tool
  expandedFlyout: Tool | null
  setTool: (tool: Tool) => void
  toggleFlyout: (tool: Tool) => void
  closeFlyout: () => void
}

export const [useToolbar, ToolbarProvider] = createContext<ToolbarContext>('Toolbar')
