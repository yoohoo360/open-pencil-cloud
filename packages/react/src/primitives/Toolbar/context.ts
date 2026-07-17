import { createContext } from '#react/internal/create-context'
import type { ReactiveRef } from '#react/internal/reactive'
import type { Editor, EditorToolDef, Tool } from '@open-pencil/core/editor'

export interface ToolbarContext {
  editor: Editor
  tools: EditorToolDef[]
  activeTool: ReactiveRef<Tool>
  expandedFlyout: ReactiveRef<Tool | null>
  setTool: (tool: Tool) => void
  toggleFlyout: (tool: Tool) => void
  closeFlyout: () => void
}

export const [useToolbar, ToolbarContextProvider] = createContext<ToolbarContext>('Toolbar')

/** @deprecated Use ToolbarContextProvider */
export function provideToolbar(_ctx: ToolbarContext) {
  throw new Error('[open-pencil] provideToolbar() is Vue-only. Use <ToolbarContextProvider value={ctx}>.')
}
