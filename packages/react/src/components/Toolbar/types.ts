import type { LucideIcon } from 'lucide-react'

import type { Tool } from '@open-pencil/core/editor'

import type { ToolbarUI } from '#react/components/Toolbar/ToolButton'

export type ToolbarActionItem = {
  icon: LucideIcon
  label: string
  action: () => void
}

export type ToolLabels = Record<Tool, string>
export type ToolIconMap = Record<Tool, LucideIcon>
export type { ToolbarUI }
