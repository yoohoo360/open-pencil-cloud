import { type ReactNode } from 'react'

import { useToolbar } from './context'

import type { Tool } from '@open-pencil/core/editor'

export interface ToolbarItemProps {
  tool: Tool
  children: (ctx: { active: boolean; select: () => void; tool: Tool }) => ReactNode
}

export function ToolbarItem({ tool, children }: ToolbarItemProps) {
  const { activeTool, setTool } = useToolbar()
  const isActive = activeTool === tool

  return <>{children({ active: isActive, select: () => setTool(tool), tool })}</>
}

export default ToolbarItem
