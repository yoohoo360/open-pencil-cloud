import { createElement } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

import type { Variable, VariableValue } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

import type { ReactComponent } from '#react/shared/react-types'
import { InlineEditable } from '#react/variables/table/editable-cell'

export interface VariablesTableOptions {
  activeModes: { modeId: string; name: string }[]
  formatModeValue: (variable: Variable, modeId: string) => string
  parseVariableValue: (variable: Variable, raw: string) => VariableValue | undefined
  shortName: (variable: Variable) => string
  renameVariable: (id: string, newName: string) => void
  updateVariableValue: (id: string, modeId: string, value: VariableValue) => void
  removeVariable: (id: string) => void
  ColorInput: ReactComponent
  icons: Record<string, ReactComponent>
  fallbackIcon: ReactComponent
  deleteIcon: ReactComponent
}

function commitNameEdit(options: VariablesTableOptions, variable: Variable, newName: string) {
  if (newName && newName !== variable.name) {
    options.renameVariable(variable.id, newName)
  }
}

function commitValueEdit(
  options: VariablesTableOptions,
  variable: Variable,
  modeId: string,
  newValue: string
) {
  const parsed = options.parseVariableValue(variable, newValue)
  if (parsed !== undefined) {
    options.updateVariableValue(variable.id, modeId, parsed)
  }
}

function createVariableNameColumn(options: VariablesTableOptions): ColumnDef<Variable> {
  return {
    id: 'name',
    header: 'Name',
    size: 200,
    minSize: 120,
    maxSize: 400,
    cell: ({ row }) => {
      const variable = row.original
      const iconClass = 'size-3.5 shrink-0 text-muted'
      const Icon = options.icons[variable.type] ?? options.fallbackIcon

      return createElement(
        'div',
        { className: 'flex items-center gap-2' },
        createElement(Icon, { className: iconClass }),
        createElement(InlineEditable, {
          defaultValue: options.shortName(variable),
          className: 'min-w-0 flex-1',
          previewClassName: 'min-w-0 flex-1 cursor-text truncate text-xs text-surface',
          inputClassName:
            'min-w-0 flex-1 rounded border border-border bg-surface/10 px-1 py-0.5 text-xs text-surface outline-none',
          onSubmit: (value: string) => value && commitNameEdit(options, variable, value)
        })
      )
    }
  }
}

function createVariableModeColumns(options: VariablesTableOptions): ColumnDef<Variable>[] {
  return options.activeModes.map((mode) => ({
    id: `mode-${mode.modeId}`,
    header: mode.name,
    size: 200,
    minSize: 120,
    maxSize: 500,
    cell: ({ row }) => {
      const variable = row.original
      const value = variable.valuesByMode[mode.modeId]

      if (variable.type === 'COLOR' && value && typeof value === 'object' && 'r' in value) {
        return createElement(options.ColorInput, {
          color: value,
          onUpdate: (color: Color) => options.updateVariableValue(variable.id, mode.modeId, color)
        })
      }

      return createElement(InlineEditable, {
        defaultValue: options.formatModeValue(variable, mode.modeId),
        className: 'min-w-0 flex-1',
        previewClassName: 'min-w-0 flex-1 cursor-text truncate font-mono text-xs text-muted',
        inputClassName:
          'min-w-0 flex-1 rounded border border-border bg-surface/10 px-1 py-0.5 font-mono text-xs text-surface outline-none',
        onSubmit: (submitted: string) =>
          submitted && commitValueEdit(options, variable, mode.modeId, submitted)
      })
    }
  }))
}

function createDeleteColumn(options: VariablesTableOptions): ColumnDef<Variable> {
  return {
    id: 'actions',
    header: '',
    size: 36,
    minSize: 36,
    maxSize: 36,
    enableResizing: false,
    cell: ({ row }) => {
      const DeleteIcon = options.deleteIcon
      return createElement(
        'button',
        {
          className:
            'flex size-5 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-surface',
          onClick: () => options.removeVariable(row.original.id)
        },
        createElement(DeleteIcon, { className: 'size-3' })
      )
    }
  }
}

export function createVariableColumns(options: VariablesTableOptions): ColumnDef<Variable>[] {
  return [
    createVariableNameColumn(options),
    ...createVariableModeColumns(options),
    createDeleteColumn(options)
  ]
}
