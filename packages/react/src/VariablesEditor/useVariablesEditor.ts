import { useReactTable, getCoreRowModel } from '@tanstack/react-table'

import type { ComponentType } from 'react'

import { useVariablesDialogState } from './useVariablesDialogState'
import { useVariablesTable } from './useVariablesTable'

import type { Color } from '@open-pencil/core'

/**
 * Composes variables dialog state, table columns, and TanStack table wiring
 * into a single higher-level variables editor API.
 */
export function useVariablesEditor(options: {
  colorInput: ComponentType<{ color: Color; onUpdate: (color: Color) => void }>
  icons: Record<string, ComponentType<{ className?: string }>>
  fallbackIcon: ComponentType<{ className?: string }>
  deleteIcon: ComponentType<{ className?: string }>
}) {
  const ctx = useVariablesDialogState()

  const { columns } = useVariablesTable({
    activeModes: ctx.activeModes,
    formatModeValue: ctx.formatModeValue,
    parseVariableValue: ctx.parseVariableValue,
    shortName: ctx.shortName,
    renameVariable: ctx.renameVariable,
    updateVariableValue: ctx.updateVariableValue,
    removeVariable: ctx.removeVariable,
    ColorInput: options.colorInput,
    icons: options.icons,
    fallbackIcon: options.fallbackIcon,
    deleteIcon: options.deleteIcon
  })

  const table = useReactTable({
    data: ctx.variables,
    columns,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: 60,
      maxSize: 800
    },
    getRowId: (row) => row.id
  })

  const hasCollections = ctx.collections.length > 0

  return {
    ...ctx,
    columns,
    table,
    hasCollections
  }
}
