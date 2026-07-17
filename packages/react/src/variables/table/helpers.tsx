import { createElement, useRef, useState, type ComponentType } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Variable, VariableValue } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'
import type { ReactiveRef as ComputedRef } from '#react/internal/reactive'

export interface VariablesTableOptions {
  activeModes: ComputedRef<{ modeId: string; name: string }[]>
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

interface EditableCellProps {
  defaultValue: string
  mono?: boolean
  onCommit: (value: string) => void
}

function EditableCell({ defaultValue, mono, onCommit }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleCommit() {
    onCommit(value)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleCommit()
    else if (e.key === 'Escape') {
      setValue(defaultValue)
      setEditing(false)
    }
  }

  if (editing) {
    return createElement('input', {
      ref: inputRef,
      autoFocus: true,
      value,
      className: `min-w-0 flex-1 rounded border border-border bg-surface/10 px-1 py-0.5 ${mono ? 'font-mono' : ''} text-xs text-surface outline-none`,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
      onBlur: handleCommit,
      onKeyDown: handleKeyDown
    })
  }

  return createElement(
    'span',
    {
      className: `min-w-0 flex-1 cursor-text truncate ${mono ? 'font-mono' : ''} text-xs text-surface`,
      onClick: () => setEditing(true)
    },
    value || defaultValue
  )
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
      const IconComponent = options.icons[variable.type] ?? options.fallbackIcon
      return createElement('div', { className: 'flex items-center gap-2' }, [
        createElement(IconComponent, { key: 'icon', className: iconClass }),
        createElement(EditableCell, {
          key: 'name',
          defaultValue: options.shortName(variable),
          onCommit: (newName) => commitNameEdit(options, variable, newName)
        })
      ])
    }
  }
}

function createVariableModeColumns(options: VariablesTableOptions): ColumnDef<Variable>[] {
  return options.activeModes.value.map((mode) => ({
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
          onUpdate: (color: Color) =>
            options.updateVariableValue(variable.id, mode.modeId, color)
        })
      }

      return createElement(EditableCell, {
        defaultValue: options.formatModeValue(variable, mode.modeId),
        mono: true,
        onCommit: (newValue) => commitValueEdit(options, variable, mode.modeId, newValue)
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
}

export function createVariableColumns(options: VariablesTableOptions): ColumnDef<Variable>[] {
  return [
    createVariableNameColumn(options),
    ...createVariableModeColumns(options),
    createDeleteColumn(options)
  ]
}
