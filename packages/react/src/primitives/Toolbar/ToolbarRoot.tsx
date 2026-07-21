import { memo, useCallback, useMemo, useState, type ReactNode } from 'react'

import { EDITOR_TOOLS, type EditorToolDef, type Tool } from '@open-pencil/core/editor'

import { useEditor } from '#react/editor/context'
import { ToolbarProvider, type ToolbarContext } from '#react/primitives/Toolbar/context'

export type ToolbarRootSlotProps = Pick<ToolbarContext, 'tools' | 'activeTool' | 'expandedFlyout'> & {
  actions: Pick<ToolbarContext, 'setTool' | 'toggleFlyout' | 'closeFlyout'>
}

export type ToolbarRootProps = {
  tools?: EditorToolDef[]
  children?: ReactNode | ((props: ToolbarRootSlotProps) => ReactNode)
}

export const ToolbarRoot = memo(function ToolbarRoot({
  tools = EDITOR_TOOLS,
  children
}: ToolbarRootProps) {
  const editor = useEditor()
  const [expandedFlyout, setExpandedFlyout] = useState<Tool | null>(null)
  const activeTool = editor.state.activeTool
  const setTool = useCallback(
    (tool: Tool) => {
      editor.setTool(tool)
      setExpandedFlyout(null)
    },
    [editor]
  )
  const toggleFlyout = useCallback(
    (tool: Tool) => setExpandedFlyout((current) => (current === tool ? null : tool)),
    []
  )
  const closeFlyout = useCallback(() => setExpandedFlyout(null), [])
  const context = useMemo<ToolbarContext>(
    () => ({ editor, tools, activeTool, expandedFlyout, setTool, toggleFlyout, closeFlyout }),
    [activeTool, closeFlyout, editor, expandedFlyout, setTool, toggleFlyout, tools]
  )
  const slotProps = useMemo<ToolbarRootSlotProps>(
    () => ({
      tools,
      activeTool,
      expandedFlyout,
      actions: { setTool, toggleFlyout, closeFlyout }
    }),
    [activeTool, closeFlyout, expandedFlyout, setTool, toggleFlyout, tools]
  )

  return (
    <ToolbarProvider value={context}>
      {typeof children === 'function' ? children(slotProps) : children}
    </ToolbarProvider>
  )
})

ToolbarRoot.displayName = 'ToolbarRoot'
