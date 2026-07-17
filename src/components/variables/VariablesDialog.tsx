import { useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as Tabs from '@radix-ui/react-tabs'
import { flexRender } from '@tanstack/react-table'
import type { ComponentType } from 'react'

import { variablesAddTestId, useI18n, useVariablesEditor } from '@open-pencil/react'
import type { VariableType } from '@open-pencil/scene-graph'

import { ColorInput } from '@/components/ColorPicker/ColorInput'
import { Tip } from '@/components/ui/Tip'
import { useDialogUI } from '@/components/ui/dialog'
import { useMenuUI } from '@/components/ui/menu'

import IconHash from '~icons/lucide/hash'
import IconPalette from '~icons/lucide/palette'
import IconToggleLeft from '~icons/lucide/toggle-left'
import IconType from '~icons/lucide/type'
import IconX from '~icons/lucide/x'
import IconLucidePlus from '~icons/lucide/plus'
import IconLucidePencil from '~icons/lucide/pencil'
import IconLucideTrash2 from '~icons/lucide/trash-2'
import IconLucideEllipsis from '~icons/lucide/ellipsis'
import IconLucideSearch from '~icons/lucide/search'
import IconLucideFolderPlus from '~icons/lucide/folder-plus'
import IconLucideChevronDown from '~icons/lucide/chevron-down'
import IconLucideCopy from '~icons/lucide/copy'
import IconLucidePin from '~icons/lucide/pin'

interface VariablesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const variableTypeIcons: Record<VariableType, ComponentType<{ className?: string }>> = {
  COLOR: IconPalette,
  FLOAT: IconHash,
  STRING: IconType,
  BOOLEAN: IconToggleLeft
}

export function VariablesDialog({ open, onOpenChange }: VariablesDialogProps) {
  const cls = useDialogUI({ content: 'flex h-[75vh] w-[800px] max-w-[90vw] flex-col' })
  const menuCls = useMenuUI({ content: 'w-40' })
  const { dialogs, panels, variableTypes: variableTypeText } = useI18n()

  const ctx = useVariablesEditor({
    colorInput: ColorInput,
    icons: variableTypeIcons,
    fallbackIcon: IconToggleLeft,
    deleteIcon: IconX
  })

  const collectionInputRef = useRef<HTMLInputElement>(null)
  const modeInputRef = useRef<HTMLInputElement>(null)

  const variableTypes: Array<{
    type: VariableType
    label: string
    description: string
  }> = [
    { type: 'COLOR', label: variableTypeText.color, description: variableTypeText.colorHint },
    { type: 'FLOAT', label: variableTypeText.number, description: variableTypeText.numberHint },
    { type: 'STRING', label: variableTypeText.text, description: variableTypeText.textHint },
    {
      type: 'BOOLEAN',
      label: variableTypeText.boolean,
      description: variableTypeText.booleanHint
    }
  ]

  function getModeId(columnId: string): string | undefined {
    return columnId.startsWith('mode-') ? columnId.slice(5) : undefined
  }

  function modeId(columnId: string): string {
    return columnId.slice(5)
  }

  const hasCollections = ctx.hasCollections.value

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={cls.overlay} />
        <Dialog.Content
          data-test-id="variables-dialog"
          aria-describedby={undefined}
          className={cls.content}
        >
          <Dialog.Title className="sr-only">{dialogs.localVariables}</Dialog.Title>

          {!hasCollections ? (
            <div className="flex flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-surface">{dialogs.localVariables}</h2>
                <Dialog.Close className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface">
                  <IconX className="size-4" />
                </Dialog.Close>
              </div>
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-muted">{dialogs.noVariableCollections}</p>
                  <button
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
              value={ctx.activeCollectionId.value}
              onValueChange={(id) => { ctx.activeCollectionId.value = id }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex shrink-0 items-center border-b border-border">
                <Tabs.List className="flex flex-1 gap-0.5 overflow-x-auto px-3 py-1">
                  {ctx.collections.map((col) =>
                    ctx.collectionRename.editingId.value === col.id ? (
                      <input
                        key={col.id}
                        ref={collectionInputRef}
                        className="w-24 rounded border border-accent bg-input px-2 py-0.5 text-xs text-surface outline-none"
                        defaultValue={col.name}
                        onBlur={(e) => ctx.collectionRename.commit(col.id, e)}
                        onKeyDown={(e) => ctx.collectionRename.onKeydown(e.nativeEvent)}
                        autoFocus
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
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        data-test-id="variables-collection-menu"
                        className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                      >
                        <IconLucideEllipsis className="size-3.5" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        side="bottom"
                        sideOffset={4}
                        align="start"
                        className={menuCls.content}
                      >
                        <DropdownMenu.Item
                          className={menuCls.item}
                          onSelect={() => ctx.startRenameCollection(ctx.activeCollectionId.value)}
                        >
                          <IconLucidePencil className={menuCls.icon} />
                          {dialogs.renameCollection}
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="mx-1.5 my-1 h-px bg-border" />
                        <DropdownMenu.Item
                          className={`${menuCls.item} text-red-500`}
                          data-test-id="variables-delete-collection"
                          onSelect={() => ctx.removeCollection(ctx.activeCollectionId.value)}
                        >
                          <IconLucideTrash2 className={menuCls.icon} />
                          {dialogs.deleteCollection}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>

                  <div className="flex items-center gap-1 rounded border border-border px-2 py-0.5">
                    <IconLucideSearch className="size-3 text-muted" />
                    <input
                      value={ctx.searchTerm.value}
                      onChange={(e) => ctx.setSearchTerm(e.target.value)}
                      data-test-id="variables-search-input"
                      className="w-24 border-none bg-transparent text-xs text-surface outline-none placeholder:text-muted"
                      placeholder={dialogs.search}
                    />
                  </div>

                  <Tip label={dialogs.createCollection}>
                    <button
                      data-test-id="variables-add-collection"
                      className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                      onClick={ctx.addCollection}
                    >
                      <IconLucideFolderPlus className="size-3.5" />
                    </button>
                  </Tip>

                  <Dialog.Close className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface">
                    <IconX className="size-4" />
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
                    <table
                      className="w-full border-collapse"
                      style={{ width: `${ctx.table.getCenterTotalSize()}px` }}
                    >
                      <thead className="sticky top-0 z-10 bg-panel">
                        {ctx.table.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id} className="border-b border-border">
                            {headerGroup.headers.map((header) => (
                              <th
                                key={header.id}
                                className="relative px-4 py-2 text-left text-[11px] font-medium text-muted"
                                style={{ width: `${header.getSize()}px` }}
                              >
                                {getModeId(header.column.id) ? (
                                  ctx.modeRename.editingId.value === getModeId(header.column.id) ? (
                                    <input
                                      ref={modeInputRef}
                                      className="-mx-1 w-full rounded border border-accent bg-input px-1 py-0 text-[11px] font-medium text-surface outline-none"
                                      defaultValue={String(header.column.columnDef.header ?? '')}
                                      onBlur={(e) => ctx.modeRename.commit(modeId(header.column.id), e)}
                                      onKeyDown={(e) => ctx.modeRename.onKeydown(e.nativeEvent)}
                                      autoFocus
                                    />
                                  ) : (
                                    <ContextMenu.Root>
                                      <ContextMenu.Trigger asChild>
                                        <span
                                          className={`cursor-default ${getModeId(header.column.id) === col.defaultModeId ? 'text-surface' : ''}`}
                                          onDoubleClick={() =>
                                            ctx.startRenameMode(modeId(header.column.id))
                                          }
                                        >
                                          {String(header.column.columnDef.header ?? '')}
                                        </span>
                                      </ContextMenu.Trigger>
                                      <ContextMenu.Portal>
                                        <ContextMenu.Content className={menuCls.content}>
                                          <ContextMenu.Item
                                            className={menuCls.item}
                                            onSelect={() =>
                                              ctx.startRenameMode(modeId(header.column.id))
                                            }
                                          >
                                            <IconLucidePencil className={menuCls.icon} />
                                            {dialogs.renameMode}
                                          </ContextMenu.Item>
                                          <ContextMenu.Item
                                            className={menuCls.item}
                                            onSelect={() =>
                                              ctx.duplicateMode(modeId(header.column.id))
                                            }
                                          >
                                            <IconLucideCopy className={menuCls.icon} />
                                            {dialogs.duplicateMode}
                                          </ContextMenu.Item>
                                          {getModeId(header.column.id) !== col.defaultModeId && (
                                            <ContextMenu.Item
                                              className={menuCls.item}
                                              onSelect={() =>
                                                ctx.setDefaultMode(modeId(header.column.id))
                                              }
                                            >
                                              <IconLucidePin className={menuCls.icon} />
                                              {dialogs.setDefaultMode}
                                            </ContextMenu.Item>
                                          )}
                                          <ContextMenu.Separator className={menuCls.separator} />
                                          <ContextMenu.Item
                                            className={`${menuCls.item} text-red-500`}
                                            disabled={col.modes.length <= 1}
                                            onSelect={() =>
                                              ctx.removeMode(modeId(header.column.id))
                                            }
                                          >
                                            <IconLucideTrash2 className={menuCls.icon} />
                                            {dialogs.deleteMode}
                                          </ContextMenu.Item>
                                        </ContextMenu.Content>
                                      </ContextMenu.Portal>
                                    </ContextMenu.Root>
                                  )
                                ) : (!header.isPlaceholder ? (
                                  flexRender(header.column.columnDef.header, header.getContext())
                                ) : null)}

                                {header.column.getCanResize() && (
                                  <div
                                    className={`absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none ${header.column.getIsResizing() ? 'bg-accent' : 'bg-transparent hover:bg-border'}`}
                                    onMouseDown={header.getResizeHandler() as React.MouseEventHandler}
                                    onTouchStart={header.getResizeHandler() as React.TouchEventHandler}
                                    onDoubleClick={() => header.column.resetSize()}
                                  />
                                )}
                              </th>
                            ))}
                            <th className="w-8 px-1 py-2">
                              <Tip label={dialogs.addMode}>
                                <button
                                  data-test-id="variables-add-mode"
                                  className="flex size-5 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                                  onClick={ctx.addMode}
                                >
                                  <IconLucidePlus className="size-3" />
                                </button>
                              </Tip>
                            </th>
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {ctx.table.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            data-test-id="variable-row"
                            className="group border-b border-border/30 hover:bg-hover/50"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="px-4 py-1.5"
                                style={{ width: `${cell.column.getSize()}px` }}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex w-full shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-2">
                    <span className="text-xs text-muted">{panels.createVariable}</span>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          data-test-id="variables-add-variable"
                          className="flex cursor-pointer items-center gap-1.5 rounded bg-hover px-2.5 py-1.5 text-xs text-surface hover:bg-border"
                        >
                          <IconLucidePlus className="size-3.5" />
                          {panels.add}
                          <IconLucideChevronDown className="size-3" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          side="top"
                          sideOffset={8}
                          align="end"
                          className={menuCls.content}
                        >
                          {variableTypes.map((item) => {
                            const Icon = variableTypeIcons[item.type]
                            return (
                              <DropdownMenu.Item
                                key={item.type}
                                className={menuCls.item}
                                {...{ 'data-test-id': variablesAddTestId(item.type) }}
                                onSelect={() => ctx.addVariable(item.type)}
                              >
                                <Icon className={menuCls.icon} />
                                <span className="flex min-w-0 flex-1 flex-col">
                                  <span>{item.label}</span>
                                  <span className="truncate text-[10px] text-muted">
                                    {item.description}
                                  </span>
                                </span>
                              </DropdownMenu.Item>
                            )
                          })}
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </Tabs.Content>
              ))}
            </Tabs.Root>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
