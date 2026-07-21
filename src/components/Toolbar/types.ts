import { memo, type ComponentType } from 'react'

import type { Tool } from '@open-pencil/react'

import type { ComponentUI } from '@/components/ui/types'
import type { ToolbarTheme } from '@/theme/toolbar'

export interface ToolbarActionItem {
  icon: ComponentType<{ className?: string }>
  label: string
  action: () => void
}

export type ToolbarUI = ComponentUI<ToolbarTheme>

export type ToolLabels = Record<Tool, string>
export type ToolIconMap = Record<Tool, ComponentType<{ className?: string }>>
