import { memo, useMemo, type ReactNode } from 'react'

import type { Tool } from '@open-pencil/core/editor'

import { useToolbar } from '#react/primitives/Toolbar/context'

export type ToolbarItemSlotProps = {
  tool: Tool
  active: boolean
  actions: { select: () => void }
}

export type ToolbarItemProps = {
  tool: Tool
  children?: ReactNode | ((props: ToolbarItemSlotProps) => ReactNode)
}

export const ToolbarItem = memo(function ToolbarItem({ tool, children }: ToolbarItemProps) {
  const { activeTool, setTool } = useToolbar()
  const slotProps = useMemo<ToolbarItemSlotProps>(
    () => ({ tool, active: activeTool === tool, actions: { select: () => setTool(tool) } }),
    [activeTool, setTool, tool]
  )
  return <>{typeof children === 'function' ? children(slotProps) : children}</>
})

ToolbarItem.displayName = 'ToolbarItem'
