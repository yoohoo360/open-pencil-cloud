import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import type { MakeSelectionNode } from '#react/app/make/bridge'
import { useDialogUI } from '#react/components/ui/dialog'
import { useI18n } from '#react/i18n'

import { IS_BROWSER } from '@open-pencil/core/constants'

export function MakeSelectionDialog({
  open,
  nodes,
  loading,
  onClose
}: {
  open: boolean
  nodes: readonly MakeSelectionNode[]
  loading: boolean
  onClose: () => void
}) {
  const { panels, dialogs } = useI18n()
  const cls = useDialogUI(
    { content: 'flex max-h-[min(80vh,40rem)] w-[min(36rem,94vw)] max-w-none flex-col' },
    { size: 'lg', height: 'auto' }
  )

  if (!IS_BROWSER || !open) return null

  return createPortal(
    <>
      <div data-slot="dialog-overlay" className={cls.overlay} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        data-test-id="make-selection-dialog"
        className={cls.content}
      >
        <header data-slot="dialog-header" className={cls.header}>
          <div className={cls.heading}>
            <h2 className={cls.title}>{panels.makeSelectedNodesDialogTitle}</h2>
            <p className={cls.description}>
              {panels.makeSelectedNodesCount({ count: String(nodes.length) })}
            </p>
          </div>
          <button type="button" className={cls.close} aria-label={dialogs.close} onClick={onClose}>
            <X className="size-4" />
          </button>
        </header>
        <div data-slot="dialog-body" className={`${cls.body} overflow-y-auto`}>
          {loading ? (
            <p className="text-[11px] text-muted">{panels.makeSelectedNodesLoading}</p>
          ) : nodes.length === 0 ? (
            <p className="text-[11px] text-muted">{panels.makeSelectedNodesEmpty}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {nodes.map((node) => (
                <li
                  key={node.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-border bg-hover/30"
                >
                  <div className="flex aspect-square items-center justify-center bg-neutral-200 p-2">
                    {node.imageDataUrl ? (
                      <img
                        src={node.imageDataUrl}
                        alt={node.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-muted">{panels.makeNodePreviewMissing}</span>
                    )}
                  </div>
                  <div className="space-y-0.5 border-t border-border px-2 py-1.5">
                    <p className="truncate text-[11px] font-medium text-surface" title={node.name}>
                      {node.name}
                    </p>
                    <p className="truncate text-[10px] text-muted" title={node.type}>
                      {node.type}
                    </p>
                    <p className="truncate font-mono text-[9px] text-muted" title={node.id}>
                      {node.id}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
