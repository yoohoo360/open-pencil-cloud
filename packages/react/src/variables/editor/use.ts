import { useReactTable, getCoreRowModel } from '@tanstack/react-table'
import { computed } from '#react/internal/reactive'
import type { ComponentType } from 'react'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { useVariablesDialogState } from '#react/variables/dialog/use'
import { useVariablesTable } from '#react/variables/table/use'

/**
 * Composes variables dialog state, table columns, and TanStack table wiring
 * into a single higher-level variables editor API.
 */
export function useVariablesEditor(options: {
  /** Component used for color variable editing. */
  colorInput: ComponentType<{ color: Color; onUpdate: (color: Color) => void }>
  /** Icon map keyed by variable resolved type. */
  icons: Record<string, ComponentType<{ className?: string }>>
  /** Fallback icon when no specific icon matches a variable type. */
  fallbackIcon: ComponentType<{ className?: string }>
  /** Icon used for destructive remove actions. */
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
    columns: columns.value,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: 60,
      maxSize: 800
    },
    getRowId: (row) => row.id
  })

  const hasCollections = computed(() => ctx.collections.length > 0)

  return {
    ...ctx,
    columns,
    table,
    hasCollections
  }
}
