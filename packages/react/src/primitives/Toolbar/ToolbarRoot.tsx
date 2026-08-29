import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import { EDITOR_TOOLS, type Editor, type EditorToolDef, type Tool } from '@open-pencil/core/editor'

import { useEditor } from '#react/editor/context'
import { useEditorStore } from '#react/app/editor/store'

export type ToolbarContext = {
  editor: Editor
  tools: EditorToolDef[]
  activeTool: Tool
  flyoutSelections: ReadonlyMap<Tool, Tool>
  expandedFlyout: Tool | null
  setTool: (tool: Tool) => void
  toggleFlyout: (tool: Tool) => void
  closeFlyout: () => void
}

const ToolbarContextValue = createContext<ToolbarContext | null>(null)

export function useToolbar(): ToolbarContext {
  const ctx = useContext(ToolbarContextValue)
  if (!ctx) throw new Error('[open-pencil] useToolbar() called outside <ToolbarRoot>')
  return ctx
}

export type ToolbarRootSlot = {
  tools: EditorToolDef[]
  activeTool: Tool
  flyoutSelections: ReadonlyMap<Tool, Tool>
  expandedFlyout: Tool | null
  actions: {
    setTool: (tool: Tool) => void
    toggleFlyout: (tool: Tool) => void
    closeFlyout: () => void
  }
}

export function ToolbarRoot({
  tools = EDITOR_TOOLS,
  children
}: {
  tools?: EditorToolDef[]
  children?: ReactNode | ((slot: ToolbarRootSlot) => ReactNode)
}) {
  const editor = useEditor()
  const store = useEditorStore()
  const activeTool = store.state.activeTool
  const [expandedFlyout, setExpandedFlyout] = useState<Tool | null>(null)
  const flyoutSelections = useMemo(() => {
    const next = new Map<Tool, Tool>()
    for (const tool of tools) {
      if (tool.flyout?.includes(activeTool)) next.set(tool.key, activeTool)
    }
    return next
  }, [activeTool, tools])

  function setTool(tool: Tool) {
    editor.setTool(tool)
    setExpandedFlyout(null)
  }

  const actions = {
    setTool,
    toggleFlyout: (tool: Tool) => setExpandedFlyout((current) => (current === tool ? null : tool)),
    closeFlyout: () => setExpandedFlyout(null)
  }

  const ctx: ToolbarContext = {
    editor,
    tools,
    activeTool,
    flyoutSelections,
    expandedFlyout,
    ...actions
  }

  const slot: ToolbarRootSlot = { tools, activeTool, flyoutSelections, expandedFlyout, actions }

  return (
    <ToolbarContextValue.Provider value={ctx}>
      {typeof children === 'function' ? children(slot) : children}
    </ToolbarContextValue.Provider>
  )
}

export function ToolbarItem({
  tool,
  children
}: {
  tool: Tool
  children: (slot: { active: boolean; actions: { select: () => void }; tool: Tool }) => ReactNode
}) {
  const { activeTool, setTool } = useToolbar()
  return <>{children({ active: activeTool === tool, actions: { select: () => setTool(tool) }, tool })}</>
}
