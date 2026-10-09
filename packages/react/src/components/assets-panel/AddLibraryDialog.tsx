import { Check, Image, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { IS_BROWSER } from '@open-pencil/core/constants'

import { OssCoverImage } from '#react/app/document/oss-cover'
import { useDialogUI } from '#react/components/ui/dialog'
import { AppInput } from '#react/components/ui/AppInput'
import { useI18n } from '#react/i18n'
import type { RemoteLibraryCatalogItem } from '#react/lib/client'

export function AddLibraryDialog({
  items,
  loading,
  attachedKeys,
  onClose,
  onSelect
}: {
  items: RemoteLibraryCatalogItem[]
  loading: boolean
  attachedKeys?: ReadonlySet<string>
  onClose: () => void
  onSelect: (item: RemoteLibraryCatalogItem) => void | Promise<void>
}) {
  const { panels } = useI18n()
  const cls = useDialogUI(undefined, { size: 'xl', height: 'tall' })
  const [query, setQuery] = useState('')
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(normalized) ||
        item.key.toLowerCase().includes(normalized)
    )
  }, [items, query])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' || event.code === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setQuery('')
    setPendingKey(null)
  }, [items])

  if (!IS_BROWSER) return null

  async function select(item: RemoteLibraryCatalogItem) {
    if (attachedKeys?.has(item.key) || pendingKey) return
    setPendingKey(item.key)
    try {
      await onSelect(item)
    } finally {
      setPendingKey(null)
    }
  }

  return createPortal(
    <>
      <div data-slot="dialog-overlay" className={cls.overlay} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        data-test-id="add-library-dialog"
        className={cls.content}
      >
        <div className={cls.header}>
          <div className={cls.heading}>
            <h2 className={cls.title}>{panels.addLibraryTitle}</h2>
            <p className={cls.description}>{panels.addLibraryHelp}</p>
          </div>
          <button
            type="button"
            data-test-id="add-library-close"
            className={cls.close}
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <AppInput
              type="search"
              value={query}
              placeholder={panels.searchLibraries}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className={`${cls.body} scrollbar-overlay`}>
          {loading ? (
            <div className="py-16 text-center text-sm text-muted">{panels.loading}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted">{panels.noRemoteLibraries}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => {
                const attached = attachedKeys?.has(item.key) ?? false
                const pending = pendingKey === item.key
                return (
                  <button
                    key={item.id ?? item.key}
                    type="button"
                    data-test-id="add-library-item"
                    disabled={attached || pending}
                    className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-transparent text-left transition-colors disabled:cursor-default ${
                      attached
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-border hover:border-accent/50 hover:bg-hover'
                    }`}
                    onClick={() => void select(item)}
                  >
                    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-canvas">
                      {item.thumbnail_url ? (
                        <OssCoverImage
                          path={item.thumbnail_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image className="size-10 text-muted" aria-hidden="true" />
                      )}
                      {attached ? (
                        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-accent text-white shadow">
                          <Check className="size-3.5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-1 p-3">
                      <div className="truncate text-sm font-medium text-surface">{item.name}</div>
                      <div className="truncate text-[10px] text-muted">
                        {attached
                          ? panels.libraryAlreadyAdded
                          : pending
                            ? panels.addingLibrary
                            : `v${item.version || '1.0.0'}`}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
