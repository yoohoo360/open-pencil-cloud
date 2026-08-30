import { useRef, useState } from 'react'
import { Check, ChevronLeft, LayoutGrid, Plus, Settings2, Unlink } from 'lucide-react'

import { AppInput } from '#react/components/ui/AppInput'
import { IconButton } from '#react/components/ui/IconButton'
import { useMenuUI } from '#react/components/ui/menu'
import { usePopoverUI } from '#react/components/ui/popover'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { TextStyleEditor } from '#react/components/properties/shared-style/TextStyleEditor'
import { MIXED } from '#react/controls/mixed'
import {
  groupSharedStyles,
  sharedStyleLeafName,
  sharedStylePreview,
  useSharedStyleBinding,
  useSharedStyleCatalog
} from '#react/controls/shared-style'
import { useI18n } from '#react/i18n'

type PickerView = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; nodeId: string }

export function TextStylePicker() {
  const { panels } = useI18n()
  const binding = useSharedStyleBinding('text')
  const catalog = useSharedStyleCatalog()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<PickerView>({ mode: 'list' })
  const [nameDraft, setNameDraft] = useState(panels.textStyle)
  const menuCls = useMenuUI({ content: 'w-72 p-1.5', item: 'justify-start gap-2' })
  const popover = usePopoverUI({
    header: 'flex items-center justify-between gap-2 px-1 pb-1.5',
    body: 'flex max-h-80 flex-col gap-1 overflow-y-auto'
  })
  const query = search.trim().toLowerCase()
  const filtered = binding.styles.filter((style) => style.name.toLowerCase().includes(query))
  const groups = groupSharedStyles(filtered)
  const bound = typeof binding.styleId === 'string'
  const editing = view.mode === 'edit' ? catalog.styleNode(view.nodeId) : null

  function close() {
    setOpen(false)
    setSearch('')
    setView({ mode: 'list' })
  }

  function openCreate() {
    setNameDraft(panels.textStyle)
    setView({ mode: 'create' })
  }

  return (
    <>
      {bound ? (
        <IconButton label={panels.detachStyle} onClick={binding.unbind}>
          <Unlink className="size-3.5" />
        </IconButton>
      ) : null}
      <IconButton
        ref={triggerRef}
        label={panels.textStyles}
        active={open}
        data-test-id="text-style-picker"
        onClick={() => {
          if (open) close()
          else {
            setView({ mode: 'list' })
            setOpen(true)
          }
        }}
      >
        <LayoutGrid className="size-3.5" />
      </IconButton>
      <FloatingMenu
        open={open}
        onClose={close}
        triggerRef={triggerRef}
        align="end"
        className={`${menuCls.content} ${popover.content}`}
      >
        {view.mode === 'edit' && editing ? (
          <>
            <div className={popover.header}>
              <IconButton label={panels.textStyles} onClick={() => setView({ mode: 'list' })}>
                <ChevronLeft className="size-3.5" />
              </IconButton>
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-surface">
                {panels.editStyle}
              </span>
            </div>
            <div className="px-1 pb-1">
              <TextStyleEditor
                node={editing}
                onRename={(name) => catalog.rename(editing.id, name)}
                onChange={(changes) => catalog.update(editing.id, changes)}
              />
            </div>
          </>
        ) : view.mode === 'create' ? (
          <>
            <div className={popover.header}>
              <IconButton label={panels.textStyles} onClick={() => setView({ mode: 'list' })}>
                <ChevronLeft className="size-3.5" />
              </IconButton>
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-surface">
                {panels.createStyle}
              </span>
            </div>
            <div className="flex items-center gap-1 px-1 pb-1">
              <AppInput
                value={nameDraft}
                aria-label={panels.styleName}
                autoFocus
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    binding.create(nameDraft)
                    close()
                  }
                }}
              />
              <IconButton
                label={panels.createStyle}
                onClick={() => {
                  binding.create(nameDraft)
                  close()
                }}
              >
                <Check className="size-3.5" />
              </IconButton>
            </div>
          </>
        ) : (
          <>
            <div className={popover.header}>
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-surface">
                {panels.textStyles}
              </span>
              {binding.canCreate ? (
                <IconButton label={panels.createStyle} onClick={openCreate}>
                  <Plus className="size-3.5" />
                </IconButton>
              ) : null}
            </div>
            <AppInput
              value={search}
              aria-label={panels.searchStyles}
              placeholder={panels.searchStyles}
              className="mb-1"
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className={popover.body} role="listbox" aria-label={panels.textStyles}>
              <button
                type="button"
                role="option"
                aria-selected={!bound && binding.styleId !== MIXED}
                className={menuCls.item}
                onClick={() => {
                  binding.unbind()
                  close()
                }}
              >
                <span className="min-w-0 flex-1 truncate">{panels.none}</span>
                {!bound && binding.styleId !== MIXED ? <Check className="size-3 shrink-0" /> : null}
              </button>
              {binding.styleId === MIXED ? (
                <div className={`${menuCls.item} text-muted`} data-disabled>
                  {panels.mixed}
                </div>
              ) : null}
              {groups.map((group) => (
                <div key={group.folder ?? 'root'} className="pt-1">
                  {group.folder ? (
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted">{group.folder}</div>
                  ) : null}
                  {group.styles.map((style) => {
                    const selected = binding.styleId === style.id
                    const node = catalog.styleNode(style.nodeId)
                    return (
                      <div key={style.id} className="flex items-center gap-0.5">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`${menuCls.item} min-w-0 flex-1`}
                          onClick={() => {
                            binding.bind(style.id)
                            close()
                          }}
                        >
                          <span
                            className="min-w-0 flex-1 truncate"
                            style={node ? { fontFamily: `'${node.fontFamily}', sans-serif` } : undefined}
                          >
                            <span className="block truncate text-surface">{sharedStyleLeafName(style.name)}</span>
                            {node ? (
                              <span className="block truncate text-[10px] text-muted">
                                {sharedStylePreview(node)}
                              </span>
                            ) : null}
                          </span>
                          {selected ? <Check className="size-3 shrink-0" /> : null}
                        </button>
                        <IconButton
                          label={panels.editStyle}
                          onClick={() => setView({ mode: 'edit', nodeId: style.nodeId })}
                        >
                          <Settings2 className="size-3.5" />
                        </IconButton>
                      </div>
                    )
                  })}
                </div>
              ))}
              {filtered.length === 0 && binding.styles.length > 0 ? (
                <div className="px-2 py-2 text-[11px] text-muted">{panels.noStylesFound}</div>
              ) : null}
            </div>
          </>
        )}
      </FloatingMenu>
    </>
  )
}
