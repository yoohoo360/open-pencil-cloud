import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown,
  Ellipsis,
  Folder,
  FolderPlus,
  Hash,
  Palette,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  Trash2,
  Type,
  X
} from 'lucide-react'
import type { VariableType } from '@open-pencil/scene-graph'

import { IS_BROWSER } from '@open-pencil/core/constants'

import { RenameInput } from '#react/components/properties/variables/EditableCell'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { VariableTable } from '#react/components/properties/variables/VariableTable'
import { AppPlaceholder } from '#react/components/ui/AppPlaceholder'
import { useDialogUI } from '#react/components/ui/dialog'
import { useMenuUI } from '#react/components/ui/menu'
import { Tip } from '#react/components/ui/Tip'
import { useI18n } from '#react/i18n'
import { variablesAddTestId } from '#react/testing/test-id'
import { useVariablesDialogState } from '#react/variables/dialog'

const VARIABLE_TYPES: VariableType[] = ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']

export function VariablesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open || !IS_BROWSER) return null
  return <VariablesDialogOpen onClose={onClose} />
}

function VariablesDialogOpen({ onClose }: { onClose: () => void }) {
  const { dialogs, panels, variableTypes } = useI18n()
  const ctx = useVariablesDialogState()
  const cls = useDialogUI({ content: 'w-[800px] max-w-[90vw]' }, { height: 'tall' })
  const menuCls = useMenuUI({ content: 'w-40', item: 'justify-start gap-2' })
  const addVariableMenuCls = useMenuUI({ content: 'w-48', item: 'justify-start gap-2' })
  const collectionMenuRef = useRef<HTMLButtonElement>(null)
  const addVariableRef = useRef<HTMLButtonElement>(null)
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false)
  const [addVariableOpen, setAddVariableOpen] = useState(false)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' && event.code !== 'Escape') return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('[data-menu-content], [data-picker-content]')) {
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const typeItems = VARIABLE_TYPES.map((type) => ({
    type,
    label: typeLabel(type, variableTypes),
    description: typeHint(type, variableTypes),
    Icon: typeIcon(type)
  }))

  return createPortal(
    <>
      <div data-slot="dialog-overlay" className={cls.overlay} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        data-test-id="variables-dialog"
        className={cls.content}
      >
        <h2 className="sr-only">{dialogs.localVariables}</h2>
        {!ctx.hasCollections ? (
          <div className="flex flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-surface">{dialogs.localVariables}</h2>
              <button
                type="button"
                aria-label={dialogs.close}
                className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                onClick={onClose}
              >
                <X className="size-4" />
              </button>
            </div>
            <AppPlaceholder
              label={dialogs.noVariableCollections}
              icon={<Folder className="size-5" />}
              action={
                <button
                  type="button"
                  data-test-id="variables-create-collection"
                  className="cursor-pointer rounded bg-hover px-3 py-1.5 text-xs text-surface hover:bg-border"
                  onClick={ctx.addCollection}
                >
                  {dialogs.createCollection}
                </button>
              }
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center border-b border-border">
              <div className="flex flex-1 gap-0.5 overflow-x-auto px-3 py-1" role="tablist">
                {ctx.collections.map((collection) =>
                  ctx.collectionRename.editingId === collection.id ? (
                    <RenameInput
                      key={collection.id}
                      className="w-24 rounded border border-accent bg-input px-2 py-0.5 text-xs text-surface outline-none"
                      defaultValue={collection.name}
                      onCommit={(event) => ctx.collectionRename.commit(collection.id, event)}
                      onKeyDown={ctx.collectionRename.onKeydown}
                    />
                  ) : (
                    <button
                      key={collection.id}
                      type="button"
                      role="tab"
                      data-test-id="variables-collection-tab"
                      data-state={
                        collection.id === ctx.activeCollectionId ? 'active' : 'inactive'
                      }
                      className="cursor-pointer rounded border-none px-2.5 py-1 text-xs whitespace-nowrap text-muted data-[state=active]:bg-hover data-[state=active]:text-surface"
                      onClick={() => ctx.setActiveCollection(collection.id)}
                      onDoubleClick={() => ctx.startRenameCollection(collection.id)}
                    >
                      {collection.name}
                    </button>
                  )
                )}
              </div>
              <div className="flex items-center gap-1.5 px-3">
                <button
                  ref={collectionMenuRef}
                  type="button"
                  data-test-id="variables-collection-menu"
                  className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                  onClick={() => setCollectionMenuOpen((current) => !current)}
                >
                  <Ellipsis className="size-3.5" />
                </button>
                <div className="flex items-center gap-1 rounded border border-border px-2 py-0.5">
                  <Search className="size-3 text-muted" />
                  <input
                    data-test-id="variables-search-input"
                    className="w-24 border-none bg-transparent text-xs text-surface outline-none placeholder:text-muted"
                    placeholder={dialogs.search}
                    value={ctx.searchTerm}
                    onChange={(event) => ctx.setSearchTerm(event.target.value)}
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
                <button
                  type="button"
                  aria-label={dialogs.close}
                  className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                  onClick={onClose}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            {ctx.activeCollection ? (
              <VariableTable ctx={ctx} collection={ctx.activeCollection} />
            ) : null}
            <div className="flex w-full shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-2">
              <span className="text-xs text-muted">{panels.createVariable}</span>
              <button
                ref={addVariableRef}
                type="button"
                data-test-id="variables-add-variable"
                className="flex cursor-pointer items-center gap-1.5 rounded bg-hover px-2.5 py-1.5 text-xs text-surface hover:bg-border"
                onClick={() => setAddVariableOpen((current) => !current)}
              >
                <Plus className="size-3.5" />
                {panels.add}
                <ChevronDown className="size-3" />
              </button>
            </div>
          </div>
        )}
      </div>
      <FloatingMenu
        open={collectionMenuOpen}
        onClose={() => setCollectionMenuOpen(false)}
        triggerRef={collectionMenuRef}
        className={menuCls.content}
      >
        <button
          type="button"
          role="menuitem"
          className={menuCls.item}
          onClick={() => {
            ctx.startRenameCollection(ctx.activeCollectionId)
            setCollectionMenuOpen(false)
          }}
        >
          <Pencil className={menuCls.icon} />
          {dialogs.renameCollection}
        </button>
        <div className="mx-1.5 my-1 h-px bg-border" />
        <button
          type="button"
          role="menuitem"
          className={`${menuCls.item} text-red-500`}
          data-test-id="variables-delete-collection"
          onClick={() => {
            ctx.removeCollection(ctx.activeCollectionId)
            setCollectionMenuOpen(false)
          }}
        >
          <Trash2 className={menuCls.icon} />
          {dialogs.deleteCollection}
        </button>
      </FloatingMenu>
      <FloatingMenu
        open={addVariableOpen}
        onClose={() => setAddVariableOpen(false)}
        triggerRef={addVariableRef}
        side="top"
        align="end"
        sideOffset={8}
        className={addVariableMenuCls.content}
      >
        {typeItems.map((item) => (
          <button
            key={item.type}
            type="button"
            role="menuitem"
            className={menuCls.item}
            data-test-id={variablesAddTestId(item.type)}
            onClick={() => {
              ctx.addVariable(item.type)
              setAddVariableOpen(false)
            }}
          >
            <item.Icon className={menuCls.icon} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span>{item.label}</span>
              <span className="truncate text-[10px] text-muted">{item.description}</span>
            </span>
          </button>
        ))}
      </FloatingMenu>
    </>,
    document.body
  )
}

function typeLabel(
  type: VariableType,
  variableTypes: { color: string; number: string; text: string; boolean: string }
): string {
  if (type === 'COLOR') return variableTypes.color
  if (type === 'FLOAT') return variableTypes.number
  if (type === 'STRING') return variableTypes.text
  return variableTypes.boolean
}

function typeHint(
  type: VariableType,
  variableTypes: {
    colorHint: string
    numberHint: string
    textHint: string
    booleanHint: string
  }
): string {
  if (type === 'COLOR') return variableTypes.colorHint
  if (type === 'FLOAT') return variableTypes.numberHint
  if (type === 'STRING') return variableTypes.textHint
  return variableTypes.booleanHint
}

function typeIcon(type: VariableType) {
  if (type === 'COLOR') return Palette
  if (type === 'FLOAT') return Hash
  if (type === 'STRING') return Type
  return ToggleLeft
}
