import type { ComponentType } from 'react'

import type { Tool } from '@open-pencil/react'

export interface ToolbarActionItem {
  icon: ComponentType
  label: string
  action: () => void
}

export interface ToolbarUI {
  flyoutContent?: string
}

export type ToolLabels = Record<Tool, string>
export type ToolIconMap = Record<Tool, ComponentType>
