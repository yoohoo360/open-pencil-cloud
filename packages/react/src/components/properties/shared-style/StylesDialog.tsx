import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Type, X } from 'lucide-react'

import { IS_BROWSER } from '@open-pencil/core/constants'
import type { SharedStyleKind } from '@open-pencil/scene-graph'

import { TextStyleEditor } from '#react/components/properties/shared-style/TextStyleEditor'
import { AppInput } from '#react/components/ui/AppInput'
import { AppPlaceholder } from '#react/components/ui/AppPlaceholder'
import { IconButton } from '#react/components/ui/IconButton'
import { useDialogUI } from '#react/components/ui/dialog'
import {
  SHARED_STYLE_CATALOG_KINDS,
  sharedStyleLeafName,
  sharedStylePreview,
  sharedStyleSwatch,
  styleGroupMessageKey,
  useSharedStyleCatalog,
  type SharedStyleCatalogKind
} from '#react/controls/shared-style'
import { useI18n } from '#react/i18n'

function defaultName(kind: SharedStyleKind, panels: ReturnType<typeof useI18n>['panels']) {
  if (kind === 'text') return panels.textStyle
  if (kind === 'effect') return panels.effectStyle
  if (kind === 'grid') return panels.gridStyle
  return panels.colorStyle
}

export function StylesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open || !IS_BROWSER) return null
  return <StylesDialogOpen onClose={onClose} />
}

function StylesDialogOpen({ onClose }: { onClose: () => void }) {
  const { dialogs, panels } = useI18n()
  const catalog = useSharedStyleCatalog()
  const cls = useDialogUI({ content: 'w-[640px] max-w-[92vw]' }, { height: 'tall' })
  const [kind, setKind] = useState<SharedStyleCatalogKind>('text')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [nameDraft, setNameDraft] = useState(defaultName('text', panels))
  const group = catalog.groups.find((item) => item.kind === kind)
  const styles = group?.styles ?? []
  const selected = styles.find((style) => style.nodeId === selectedId) ?? styles[0] ?? null
  const selectedNode = selected ? catalog.styleNode(selected.nodeId) : null

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function startCreate() {
    setNameDraft(defaultName(kind, panels))
    setCreating(true)
  }

  function commitCreate() {
    const created = catalog.create(kind, nameDraft)
    setCreating(false)
    if (created) setSelectedId(created.node.id)
  }

  return createPortal(
    <>
      <div data-slot="dialog-overlay" className={cls.overlay} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        data-test-id="styles-dialog"
        className={cls.content}
      >
        <div className={cls.header}>
          <div className={cls.heading}>
            <h2 className={cls.title}>{dialogs.localStyles}</h2>
          </div>
          <button type="button" aria-label={dialogs.close} className={cls.close} onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex w-56 shrink-0 flex-col border-r border-border">
            <div className="flex gap-0.5 overflow-x-auto px-2 py-2" role="tablist">
              {SHARED_STYLE_CATALOG_KINDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  data-state={item === kind ? 'active' : 'inactive'}
                  className="cursor-pointer rounded border-none px-2 py-1 text-[11px] whitespace-nowrap text-muted data-[state=active]:bg-hover data-[state=active]:text-surface"
                  onClick={() => {
                    setKind(item)
                    setSelectedId(null)
                    setCreating(false)
                  }}
                >
                  {panels[styleGroupMessageKey(item)]}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {styles.length === 0 && !creating ? (
                <p className="px-1 py-2 text-[11px] text-muted">{panels.noLocalStyles}</p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {styles.map((style) => {
                    const node = catalog.styleNode(style.nodeId)
                    const swatch = node ? sharedStyleSwatch(node) : null
                    const active = selected?.nodeId === style.nodeId
                    return (
                      <li key={style.id}>
                        <button
                          type="button"
                          data-state={active ? 'active' : 'inactive'}
                          className="flex w-full min-w-0 items-center gap-1.5 rounded px-2 py-1.5 text-left text-[11px] text-muted data-[state=active]:bg-hover data-[state=active]:text-surface"
                          onClick={() => setSelectedId(style.nodeId)}
                        >
                          {kind === 'fill' && swatch ? (
                            <span
                              className="size-3 shrink-0 rounded-sm border border-border"
                              style={{ background: swatch }}
                            />
                          ) : kind === 'text' ? (
                            <Type className="size-3 shrink-0" />
                          ) : null}
                          <span className="min-w-0 flex-1 truncate">{sharedStyleLeafName(style.name)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {creating ? (
                <div className="mt-1 flex items-center gap-1">
                  <AppInput
                    value={nameDraft}
                    aria-label={panels.styleName}
                    autoFocus
                    onChange={(event) => setNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitCreate()
                      if (event.key === 'Escape') setCreating(false)
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-2">
              <IconButton label={panels.createStyle} onClick={creating ? commitCreate : startCreate}>
                <Plus className="size-3.5" />
              </IconButton>
              {selected ? (
                <IconButton
                  label={panels.deleteStyle}
                  onClick={() => {
                    catalog.remove(selected.nodeId)
                    setSelectedId(null)
                  }}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              ) : null}
            </div>
          </div>
          <div className={`${cls.body} flex-1`}>
            {selectedNode && kind === 'text' ? (
              <TextStyleEditor
                node={selectedNode}
                onRename={(name) => catalog.rename(selectedNode.id, name)}
                onChange={(changes) => catalog.update(selectedNode.id, changes)}
              />
            ) : selectedNode ? (
              <div className="flex flex-col gap-2">
                <AppInput
                  key={selectedNode.id}
                  defaultValue={selectedNode.name}
                  aria-label={panels.styleName}
                  onBlur={(event) => catalog.rename(selectedNode.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') catalog.rename(selectedNode.id, event.currentTarget.value)
                  }}
                />
                <p className="text-[11px] text-muted">{sharedStylePreview(selectedNode)}</p>
              </div>
            ) : (
              <AppPlaceholder label={panels.noLocalStyles} fill={false} size="panel" />
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
