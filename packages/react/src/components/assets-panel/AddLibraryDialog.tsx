import { Image, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { IS_BROWSER } from '@open-pencil/core/constants'

import { useDialogUI } from '#react/components/ui/dialog'
import { useI18n } from '#react/i18n'
import type { RemoteLibraryCatalogItem } from '#react/lib/client'

export function AddLibraryDialog({
  items,
  loading,
  onClose,
  onSelect
}: {
  items: RemoteLibraryCatalogItem[]
  loading: boolean
  onClose: () => void
  onSelect: (item: RemoteLibraryCatalogItem) => void
}) {
  const { panels } = useI18n()
  const cls = useDialogUI(undefined, { size: 'lg' })

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' || event.code === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!IS_BROWSER) return null

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
        <div className="flex items-center justify-end border-b border-border px-4 py-3">
          <button
            type="button"
            data-test-id="add-library-close"
            className="flex size-7 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id ?? item.key}
              type="button"
              data-test-id="add-library-item"
              className="cursor-pointer overflow-hidden rounded-lg border border-border bg-transparent text-left hover:bg-hover hover:shadow-md"
              onClick={() => onSelect(item)}
            >
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image className="size-10 text-muted" aria-hidden="true" />
                )}
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="mt-1.5 text-[10px] text-muted">v{item.version || '1.0.0'}</div>
              </div>
            </button>
          ))}
          {!loading && items.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-muted">
              {panels.noRemoteLibraries}
            </div>
          ) : null}
        </div>
      </div>
    </>,
    document.body
  )
}
