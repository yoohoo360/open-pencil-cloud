import { createElement, type ComponentType } from 'react'

import type { Color, Variable, VariableValue } from '@open-pencil/core'
import type { ColumnDef } from '@tanstack/react-table'

interface VariablesTableOptions {
  activeModes: { modeId: string; name: string }[]
  formatModeValue: (variable: Variable, modeId: string) => string
  parseVariableValue: (variable: Variable, raw: string) => VariableValue | undefined
  shortName: (variable: Variable) => string
  renameVariable: (id: string, newName: string) => void
  updateVariableValue: (id: string, modeId: string, value: VariableValue) => void
  removeVariable: (id: string) => void
  ColorInput: ComponentType<{ color: Color; onUpdate: (color: Color) => void }>
  icons: Record<string, ComponentType<{ className?: string }>>
  fallbackIcon: ComponentType<{ className?: string }>
  deleteIcon: ComponentType<{ className?: string }>
}

/**
 * Name cell component for variable rows.
 */
function VariableNameCell({
  variable,
  options
}: {
  variable: Variable
  options: Pick<VariablesTableOptions, 'icons' | 'fallbackIcon' | 'shortName' | 'renameVariable'>
}) {
  const IconComponent = options.icons[variable.type] ?? options.fallbackIcon
  return createElement(
    'div',
    { className: 'flex items-center gap-2' },
    createElement(IconComponent, { className: 'size-3.5 shrink-0 text-muted' }),
    createElement(
      'span',
      {
        className: 'min-w-0 flex-1 cursor-text truncate text-xs text-surface',
        contentEditable: true,
        suppressContentEditableWarning: true,
        onBlur: (e: React.FocusEvent<HTMLSpanElement>) => {
          const value = e.currentTarget.textContent?.trim()
          if (value && value !== options.shortName(variable)) {
            options.renameVariable(variable.id, value)
          }
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            e.currentTarget.textContent = options.shortName(variable)
            e.currentTarget.blur()
          }
        }
      },
      options.shortName(variable)
    )
  )
}

/**
 * Mode value cell component.
 */
function VariableModeCell({
  variable,
  modeId,
  options
}: {
  variable: Variable
  modeId: string
  options: Pick<
    VariablesTableOptions,
    'ColorInput' | 'formatModeValue' | 'parseVariableValue' | 'updateVariableValue'
  >
}) {
  const value = variable.valuesByMode[modeId]
  if (variable.type === 'COLOR' && value && typeof value === 'object' && 'r' in value) {
    return createElement(options.ColorInput, {
      color: value as Color,
      onUpdate: (color: Color) => options.updateVariableValue(variable.id, modeId, color)
    })
  }

  const displayText = options.formatModeValue(variable, modeId)
  return createElement('span', {
    className: 'min-w-0 flex-1 cursor-text truncate font-mono text-xs text-muted',
    contentEditable: true,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLSpanElement>) => {
      const raw = e.currentTarget.textContent?.trim()
      if (!raw) return
      const parsed = options.parseVariableValue(variable, raw)
      if (parsed !== undefined) {
        options.updateVariableValue(variable.id, modeId, parsed)
      }
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.currentTarget.blur()
      }
      if (e.key === 'Escape') {
        e.currentTarget.textContent = displayText
        e.currentTarget.blur()
      }
    },
    children: displayText
  })
}

export function useVariablesTable(options: VariablesTableOptions) {
  const columns: ColumnDef<Variable>[] = [
    {
      id: 'name',
      header: 'Name',
      size: 200,
      minSize: 120,
      maxSize: 400,
      cell: ({ row }) =>
        createElement(VariableNameCell, { variable: row.original, options })
    },
    ...options.activeModes.map(
      (mode): ColumnDef<Variable> => ({
        id: `mode-${mode.modeId}`,
        header: mode.name,
        size: 200,
        minSize: 120,
        maxSize: 500,
        cell: ({ row }) =>
          createElement(VariableModeCell, { variable: row.original, modeId: mode.modeId, options })
      })
    ),
    {
      id: 'actions',
      header: '',
      size: 36,
      minSize: 36,
      maxSize: 36,
      enableResizing: false,
      cell: ({ row }) =>
        createElement(
          'button',
          {
            className:
              'flex size-5 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-surface',
            onClick: () => options.removeVariable(row.original.id)
          },
          createElement(options.deleteIcon, { className: 'size-3' })
        )
    }
  ]

  return { columns }
}
