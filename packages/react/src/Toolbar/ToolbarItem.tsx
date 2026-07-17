import type { ReactNode } from 'react'

import type { Tool } from '@open-pencil/core/editor'

import { useToolbar } from './context'

export interface ToolbarItemSlotProps {
  active: boolean
  select: () => void
  tool: Tool
}

export interface ToolbarItemProps {
  tool: Tool
  children?: ReactNode | ((state: ToolbarItemSlotProps) => ReactNode)
}

export function ToolbarItem({ tool, children }: ToolbarItemProps) {
  const { activeTool, setTool } = useToolbar()
  const active = activeTool === tool

  const slot: ToolbarItemSlotProps = {
    active,
    select: () => setTool(tool),
    tool
  }

  return <>{typeof children === 'function' ? children(slot) : children}</>
}
