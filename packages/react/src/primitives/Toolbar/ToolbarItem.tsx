import type { ReactNode } from 'react'
import type { Tool } from '@open-pencil/core/editor'

import { useEditorStore } from '#react/editor/store/use'
import { useToolbar } from '#react/primitives/Toolbar/context'

interface ToolbarItemSlotProps {
  active: boolean
  tool: Tool
  actions: { select: () => void }
}

interface ToolbarItemProps {
  tool: Tool
  children?: ReactNode | ((props: ToolbarItemSlotProps) => ReactNode)
}

export function ToolbarItem({ tool, children }: ToolbarItemProps) {
  const ctx = useToolbar()
  const activeTool = useEditorStore((e) => e.state.activeTool)
  const isActive = activeTool === tool
  const actions = { select: () => ctx.setTool(tool) }
  const slotProps: ToolbarItemSlotProps = { active: isActive, actions, tool }
  return typeof children === 'function' ? <>{children(slotProps)}</> : <>{children}</>
}
