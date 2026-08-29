import { tv } from 'tailwind-variants'
import { Copy, Hash, Palette, Pencil, Pin, Plus, ToggleLeft, Trash2, Type, X } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import type { Variable, VariableCollection, VariableType } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { EditableCell, RenameInput } from '#react/components/properties/variables/EditableCell'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { VariableColorCell } from '#react/components/properties/variables/VariableColorCell'
import { Tip } from '#react/components/ui/Tip'
import { useMenuUI } from '#react/components/ui/menu'
import { useI18n } from '#react/i18n'
import variableTableTheme from '#react/theme/variable-table'
import type { VariablesDialogState } from '#react/variables/dialog'

const variableTable = tv(variableTableTheme)
const NAME_COL_WIDTH = 200
const MODE_COL_WIDTH = 200
const ACTIONS_COL_WIDTH = 36

const variableTypeIcons: Record<VariableType, ComponentType<{ className?: string }>> = {
  COLOR: Palette,
  FLOAT: Hash,
  STRING: Type,
  BOOLEAN: ToggleLeft
}

export function VariableTable({
  ctx,
  collection
}: {
  ctx: VariablesDialogState
  collection: VariableCollection
}) {
  const { dialogs } = useI18n()
  const menuCls = useMenuUI({ content: 'w-40', item: 'justify-start gap-2' })
  const tableStyles = variableTable()
  const [modeMenu, setModeMenu] = useState<{ modeId: string; x: number; y: number } | null>(null)
  const tableWidth =
    NAME_COL_WIDTH + collection.modes.length * MODE_COL_WIDTH + ACTIONS_COL_WIDTH

  return (
    <div className="flex flex-1 flex-col overflow-hidden outline-none">
      <div className="flex-1 overflow-auto">
        <table
          className="w-full min-w-full border-collapse"
          style={{ width: `${tableWidth}px` }}
        >
          <thead className="sticky top-0 z-10 bg-panel">
            <tr className="border-b border-border">
              <th
                className="relative px-4 py-2 text-left text-[11px] font-medium text-muted"
                style={{ width: NAME_COL_WIDTH }}
              >
                Name
              </th>
              {collection.modes.map((mode) => {
                const isDefault = mode.modeId === collection.defaultModeId
                const renaming = ctx.modeRename.editingId === mode.modeId
                return (
                  <th
                    key={mode.modeId}
                    className="relative px-4 py-2 text-left text-[11px] font-medium text-muted"
                    style={{ width: MODE_COL_WIDTH }}
                  >
                    {renaming ? (
                      <RenameInput
                        className="-mx-1 w-full rounded border border-accent bg-input px-1 py-0 text-[11px] font-medium text-surface outline-none"
                        defaultValue={mode.name}
                        onCommit={(event) => ctx.modeRename.commit(mode.modeId, event)}
                        onKeyDown={ctx.modeRename.onKeydown}
                      />
                    ) : (
                      <span
                        data-default={isDefault || undefined}
                        className={variableTable({ defaultMode: isDefault }).modeLabel()}
                        onDoubleClick={() => ctx.startRenameMode(mode.modeId)}
                        onContextMenu={(event) => {
                          event.preventDefault()
                          setModeMenu({ modeId: mode.modeId, x: event.clientX, y: event.clientY })
                        }}
                      >
                        {mode.name}
                      </span>
                    )}
                  </th>
                )
              })}
              <th className="w-9 px-1 py-2" style={{ width: ACTIONS_COL_WIDTH }} />
              <th className="w-8 px-1 py-2">
                <Tip label={dialogs.addMode}>
                  <button
                    type="button"
                    data-test-id="variables-add-mode"
                    className="flex size-5 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                    onClick={() => ctx.addMode()}
                  >
                    <Plus className="size-3" />
                  </button>
                </Tip>
              </th>
            </tr>
          </thead>
          <tbody>
            {ctx.variables.map((variable) => (
              <VariableRow
                key={variable.id}
                variable={variable}
                collection={collection}
                ctx={ctx}
                rowClassName={tableStyles.row()}
              />
            ))}
          </tbody>
        </table>
      </div>
      <FloatingMenu
        open={Boolean(modeMenu)}
        onClose={() => setModeMenu(null)}
        point={modeMenu ? { x: modeMenu.x, y: modeMenu.y } : undefined}
        className={menuCls.content}
      >
        {modeMenu ? (
          <ModeMenuItems
            modeId={modeMenu.modeId}
            collection={collection}
            ctx={ctx}
            onDone={() => setModeMenu(null)}
          />
        ) : null}
      </FloatingMenu>
    </div>
  )
}

function VariableRow({
  variable,
  collection,
  ctx,
  rowClassName
}: {
  variable: Variable
  collection: VariableCollection
  ctx: VariablesDialogState
  rowClassName: string
}) {
  const TypeIcon = variableTypeIcons[variable.type] ?? ToggleLeft

  return (
    <tr data-test-id="variable-row" className={rowClassName}>
      <td className="px-4 py-1.5" style={{ width: NAME_COL_WIDTH }}>
        <div className="flex items-center gap-2">
          <TypeIcon className="size-3.5 shrink-0 text-muted" />
          <EditableCell
            value={ctx.shortName(variable)}
            previewClassName="min-w-0 flex-1 cursor-text truncate text-xs text-surface"
            inputClassName="min-w-0 flex-1 rounded border border-border bg-surface/10 px-1 py-0.5 text-xs text-surface outline-none"
            onCommit={(next) => {
              if (next !== variable.name) ctx.renameVariable(variable.id, next)
            }}
          />
        </div>
      </td>
      {collection.modes.map((mode) => (
        <td key={mode.modeId} className="px-4 py-1.5" style={{ width: MODE_COL_WIDTH }}>
          <ModeValueCell variable={variable} modeId={mode.modeId} ctx={ctx} />
        </td>
      ))}
      <td className="px-4 py-1.5" style={{ width: ACTIONS_COL_WIDTH }}>
        <button
          type="button"
          className="flex size-5 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-surface"
          onClick={() => ctx.removeVariable(variable.id)}
        >
          <X className="size-3" />
        </button>
      </td>
      <td className="w-8 px-1 py-1.5" />
    </tr>
  )
}

function ModeValueCell({
  variable,
  modeId,
  ctx
}: {
  variable: Variable
  modeId: string
  ctx: VariablesDialogState
}) {
  const value = variable.valuesByMode[modeId]
  if (variable.type === 'COLOR' && value && typeof value === 'object' && 'r' in value) {
    return (
      <VariableColorCell
        color={value}
        onUpdate={(color: Color) => ctx.updateVariableValue(variable.id, modeId, color)}
      />
    )
  }

  return (
    <EditableCell
      value={ctx.formatModeValue(variable, modeId)}
      previewClassName="min-w-0 flex-1 cursor-text truncate font-mono text-xs text-muted"
      inputClassName="min-w-0 flex-1 rounded border border-border bg-surface/10 px-1 py-0.5 font-mono text-xs text-surface outline-none"
      onCommit={(next) => {
        const parsed = ctx.parseVariableValue(variable, next)
        if (parsed !== undefined) ctx.updateVariableValue(variable.id, modeId, parsed)
      }}
    />
  )
}

function ModeMenuItems({
  modeId,
  collection,
  ctx,
  onDone
}: {
  modeId: string
  collection: VariableCollection
  ctx: VariablesDialogState
  onDone: () => void
}) {
  const { dialogs } = useI18n()
  const menuCls = useMenuUI({ item: 'justify-start gap-2' })
  const isDefault = modeId === collection.defaultModeId
  const canDelete = collection.modes.length > 1

  return (
    <>
      <button
        type="button"
        role="menuitem"
        className={menuCls.item}
        onClick={() => {
          ctx.startRenameMode(modeId)
          onDone()
        }}
      >
        <Pencil className={menuCls.icon} />
        {dialogs.renameMode}
      </button>
      <button
        type="button"
        role="menuitem"
        className={menuCls.item}
        onClick={() => {
          ctx.duplicateMode(modeId)
          onDone()
        }}
      >
        <Copy className={menuCls.icon} />
        {dialogs.duplicateMode}
      </button>
      {isDefault ? null : (
        <button
          type="button"
          role="menuitem"
          className={menuCls.item}
          onClick={() => {
            ctx.setDefaultMode(modeId)
            onDone()
          }}
        >
          <Pin className={menuCls.icon} />
          {dialogs.setDefaultMode}
        </button>
      )}
      <div className={menuCls.separator} />
      <button
        type="button"
        role="menuitem"
        className={`${menuCls.item} text-red-500`}
        disabled={!canDelete}
        data-disabled={!canDelete || undefined}
        onClick={() => {
          if (!canDelete) return
          ctx.removeMode(modeId)
          onDone()
        }}
      >
        <Trash2 className={menuCls.icon} />
        {dialogs.deleteMode}
      </button>
    </>
  )
}
