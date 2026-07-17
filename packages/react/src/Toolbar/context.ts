import { createContext } from '../context/createContext'

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

export const [useToolbar, ToolbarProvider] = createContext<ToolbarContext>('toolbar')

/** @deprecated Use ToolbarProvider */
export function provideToolbar(_ctx: ToolbarContext): never {
  throw new Error('[open-pencil] provideToolbar is Vue-only. Use <ToolbarProvider value={...}>.')
}
