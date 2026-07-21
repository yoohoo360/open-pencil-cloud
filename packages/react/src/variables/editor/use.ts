import { useMemo } from 'react'
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'

import type { ReactComponent } from '#react/shared/react-types'
import { useVariablesDialogState } from '#react/variables/dialog/use'
import { useVariablesTable } from '#react/variables/table/use'

/**
 * Composes variables dialog state, table columns, and TanStack table wiring
 * into a single higher-level variables editor API.
 */
export function useVariablesEditor(options: {
  /** Component used for color variable editing. */
  colorInput: ReactComponent
  /** Icon map keyed by variable resolved type. */
  icons: Record<string, ReactComponent>
  /** Fallback icon when no specific icon matches a variable type. */
  fallbackIcon: ReactComponent
  /** Icon used for destructive remove actions. */
  deleteIcon: ReactComponent
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
