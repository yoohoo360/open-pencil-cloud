import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { FolderPlus, Hash, Palette, Plus, Search, ToggleLeft, Type, X } from 'lucide-react'
import { useState, type ComponentType } from 'react'

import { ColorInput } from '@/react_app/pickers/ColorInput'
import { useDialogUI } from '@/react_app/ui/dialog'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import { useI18n, useVariablesDialogState } from '@open-pencil/react'

import type { Color, Variable, VariableValue } from '@open-pencil/core'

const variableTypeIcons: Record<string, ComponentType<{ className?: string }>> = {
  COLOR: Palette,
  FLOAT: Hash,
  STRING: Type,
  BOOLEAN: ToggleLeft
}

export function VariablesDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const cls = useDialogUI({ content: 'flex h-[75vh] w-[800px] max-w-[90vw] flex-col' })
  const { dialogs } = useI18n()
  const ctx = useVariablesDialogState()
  const hasCollections = ctx.collections.length > 0

  return (
    <TipProvider>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className={cls.overlay} />
          <Dialog.Content data-test-id="variables-dialog" className={cls.content}>
            {!hasCollections ? (
              <div className="flex flex-1 flex-col">
                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                  <Dialog.Title className="text-sm font-semibold text-surface">
                    {dialogs.localVariables}
                  </Dialog.Title>
                  <Dialog.Close className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-muted">{dialogs.noVariableCollections}</p>
                    <button
                      type="button"
                      data-test-id="variables-create-collection"
                      className="mt-2 cursor-pointer rounded bg-hover px-3 py-1.5 text-xs text-surface hover:bg-border"
                      onClick={ctx.addCollection}
                    >
                      {dialogs.createCollection}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Tabs.Root
                value={ctx.activeCollectionId}
                onValueChange={ctx.setActiveCollection}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex shrink-0 items-center border-b border-border">
                  <Tabs.List className="flex flex-1 gap-0.5 overflow-x-auto px-3 py-1">
                    {ctx.collections.map((col) =>
                      ctx.editingCollectionId === col.id ? (
                        <input
                          key={col.id}
                          ref={(el) => ctx.setCollectionInputRef(col.id, el)}
                          className="w-24 rounded border border-accent bg-input px-2 py-0.5 text-xs text-surface outline-none"
                          defaultValue={col.name}
                          onBlur={(e) => ctx.commitRenameCollection(col.id, e.currentTarget)}
                          onKeyDown={(e) => {
                            if (e.code === 'Enter') e.currentTarget.blur()
                            if (e.code === 'Escape') e.currentTarget.blur()
                          }}
                        />
                      ) : (
                        <Tabs.Trigger
                          key={col.id}
                          value={col.id}
                          data-test-id="variables-collection-tab"
                          className="cursor-pointer rounded border-none px-2.5 py-1 text-xs whitespace-nowrap text-muted data-[state=active]:bg-hover data-[state=active]:text-surface"
                          onDoubleClick={() => ctx.startRenameCollection(col.id)}
                        >
                          {col.name}
                        </Tabs.Trigger>
                      )
                    )}
                  </Tabs.List>

                  <div className="flex items-center gap-1.5 px-3">
                    <div className="flex items-center gap-1 rounded border border-border px-2 py-0.5">
                      <Search className="size-3 text-muted" />
                      <input
                        value={ctx.searchTerm}
                        data-test-id="variables-search-input"
                        className="w-24 border-none bg-transparent text-xs text-surface outline-none placeholder:text-muted"
                        placeholder={dialogs.search}
                        onChange={(e) => ctx.setSearchTerm(e.currentTarget.value)}
                      />
                    </div>
                    <Tip label={dialogs.createCollection}>
                      <button
                        type="button"
                        data-test-id="variables-add-collection"
                        className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                        onClick={ctx.addCollection}
                      >
                        <FolderPlus className="size-3.5" />
                      </button>
                    </Tip>
                    <Dialog.Close className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface">
                      <X className="size-4" />
                    </Dialog.Close>
                  </div>
                </div>

                {ctx.collections.map((col) => (
                  <Tabs.Content
                    key={col.id}
                    value={col.id}
                    className="flex flex-1 flex-col overflow-hidden outline-none"
                  >
                    <div className="flex-1 overflow-auto">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-panel">
                          <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left text-[11px] font-medium text-muted">
                              Name
                            </th>
                            {ctx.activeModes.map((mode) => (
                              <th
                                key={mode.modeId}
                                className="px-4 py-2 text-left text-[11px] font-medium text-muted"
                              >
                                {mode.name}
                              </th>
                            ))}
                            <th className="w-9" />
                          </tr>
                        </thead>
                        <tbody>
                          {ctx.variables.map((variable) => (
                            <VariableRow
                              key={variable.id}
                              variable={variable}
                              modes={ctx.activeModes}
                              shortName={ctx.shortName}
                              formatModeValue={ctx.formatModeValue}
                              parseVariableValue={ctx.parseVariableValue}
                              renameVariable={ctx.renameVariable}
                              updateVariableValue={ctx.updateVariableValue}
                              removeVariable={ctx.removeVariable}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      data-test-id="variables-add-variable"
                      className="flex w-full shrink-0 cursor-pointer items-center gap-1.5 border-t border-border bg-transparent px-4 py-2 text-xs text-muted hover:bg-hover hover:text-surface"
                      onClick={ctx.addVariable}
                    >
                      <Plus className="size-3.5" />
                      Create variable
                    </button>
                  </Tabs.Content>
                ))}
              </Tabs.Root>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </TipProvider>
  )
}

function VariableRow({
  variable,
  modes,
  shortName,
  formatModeValue,
  parseVariableValue,
  renameVariable,
  updateVariableValue,
  removeVariable
}: {
  variable: Variable
  modes: { modeId: string; name: string }[]
  shortName: (v: Variable) => string
  formatModeValue: (v: Variable, modeId: string) => string
  parseVariableValue: (v: Variable, raw: string) => VariableValue | undefined
  renameVariable: (id: string, name: string) => void
  updateVariableValue: (id: string, modeId: string, value: VariableValue) => void
  removeVariable: (id: string) => void
}) {
  const Icon = variableTypeIcons[variable.type] ?? ToggleLeft
  const [editingName, setEditingName] = useState(false)

  return (
    <tr data-test-id="variable-row" className="group border-b border-border/30 hover:bg-hover/50">
      <td className="px-4 py-1.5">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-muted" />
          {editingName ? (
            <input
              className="min-w-0 flex-1 rounded border border-border bg-surface/10 px-1 py-0.5 text-xs text-surface outline-none"
              defaultValue={shortName(variable)}
              autoFocus
              onBlur={(e) => {
                const value = e.currentTarget.value.trim()
                if (value && value !== variable.name) renameVariable(variable.id, value)
                setEditingName(false)
              }}
              onKeyDown={(e) => {
                if (e.code === 'Enter') e.currentTarget.blur()
                if (e.code === 'Escape') setEditingName(false)
              }}
            />
          ) : (
            <button
              type="button"
              className="min-w-0 flex-1 cursor-text truncate text-left text-xs text-surface"
              onClick={() => setEditingName(true)}
            >
              {shortName(variable)}
            </button>
          )}
        </div>
      </td>
      {modes.map((mode) => {
        const value = variable.valuesByMode[mode.modeId]
        return (
          <td key={mode.modeId} className="px-4 py-1.5">
            {variable.type === 'COLOR' && value && typeof value === 'object' && 'r' in value ? (
              <ColorInput
                color={value as Color}
                onUpdate={(color) => updateVariableValue(variable.id, mode.modeId, color)}
              />
            ) : (
              <ModeValueInput
                display={formatModeValue(variable, mode.modeId)}
                onCommit={(raw) => {
                  const parsed = parseVariableValue(variable, raw)
                  if (parsed !== undefined) updateVariableValue(variable.id, mode.modeId, parsed)
                }}
              />
            )}
          </td>
        )
      })}
      <td className="px-2 py-1.5">
        <button
          type="button"
          className="flex size-5 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted opacity-0 group-hover:opacity-100 hover:text-surface"
          onClick={() => removeVariable(variable.id)}
        >
          <X className="size-3.5" />
        </button>
      </td>
    </tr>
  )
}

function ModeValueInput({
  display,
  onCommit
}: {
  display: string
  onCommit: (raw: string) => void
}) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <input
        className="min-w-0 flex-1 rounded border border-border bg-surface/10 px-1 py-0.5 font-mono text-xs text-surface outline-none"
        defaultValue={display}
        autoFocus
        onBlur={(e) => {
          onCommit(e.currentTarget.value)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.code === 'Enter') e.currentTarget.blur()
          if (e.code === 'Escape') setEditing(false)
        }}
      />
    )
  }
  return (
    <button
      type="button"
      className="min-w-0 flex-1 cursor-text truncate text-left font-mono text-xs text-muted"
      onClick={() => setEditing(true)}
    >
      {display}
    </button>
  )
}
