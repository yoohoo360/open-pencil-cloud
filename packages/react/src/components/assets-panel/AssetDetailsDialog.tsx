import { BookOpen, Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { IS_BROWSER } from '@open-pencil/core/constants'

import { nodeIcon } from '#react/app/editor/icons'
import {
  insertAssetInstance,
  openExternalLink,
  renderAssetPreview,
  type LocalAsset
} from '#react/components/assets-panel/assets'
import { AppButton } from '#react/components/ui/AppButton'
import { useDialogUI } from '#react/components/ui/dialog'
import { useEditorStore } from '#react/app/editor/store'
import { getLib } from '#react/graph/remote-lib'
import { useI18n } from '#react/i18n'

export function AssetDetailsDialog({
  asset,
  libraryKey,
  onClose
}: {
  asset: LocalAsset
  libraryKey?: string
  onClose: () => void
}) {
  const store = useEditorStore()
  const { panels } = useI18n()
  const cls = useDialogUI(undefined, { size: 'lg' })
  const Icon = nodeIcon(asset.node)
  const [previewURL, setPreviewURL] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' || event.code === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const nodeId = asset.componentId
    if (!nodeId) {
      setPreviewURL(null)
      return
    }
    const graph = libraryKey ? getLib(store.graph, libraryKey)?.graph : store.graph
    const node = graph?.getNode(nodeId)
    if (!graph || !node) {
      setPreviewURL(null)
      return
    }
    let cancelled = false
    let objectURL: string | null = null
    setPreviewLoading(true)
    const maxSize = Math.max(node.width, node.height, 1)
    const scale = Math.min(176 / maxSize, 2)
    void renderAssetPreview(store, nodeId, scale, asset.pageId, graph).then((blob) => {
      if (cancelled) return
      setPreviewLoading(false)
      if (!blob) {
        setPreviewURL(null)
        return
      }
      objectURL = URL.createObjectURL(blob)
      setPreviewURL(objectURL)
    })
    return () => {
      cancelled = true
      if (objectURL) URL.revokeObjectURL(objectURL)
    }
  }, [asset.componentId, asset.pageId, libraryKey, store, store.state.sceneVersion])

  if (!IS_BROWSER) return null

  return createPortal(
    <>
      <div data-slot="dialog-overlay" className={cls.overlay} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        data-test-id="asset-details-dialog"
        className={cls.content}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="size-4 shrink-0 text-component" />
            <div className="min-w-0">
              <h2 className={cls.title}>{asset.name}</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                {asset.node.type === 'COMPONENT_SET' ? panels.componentSet : panels.component}
                {asset.variantCount > 0 ? ` · ${asset.variantCount} variants` : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-test-id="asset-details-close"
            className="flex size-7 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid min-h-0 grid-cols-[260px_1fr] gap-0">
          <div className="border-r border-border p-4">
            <div
              data-test-id="asset-details-preview"
              className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas/60"
            >
              {previewURL ? (
                <img
                  data-test-id="asset-details-preview-image"
                  src={previewURL}
                  alt={`${asset.name} preview`}
                  className="max-h-[120px] max-w-[210px] object-contain"
                />
              ) : (
                <div className="text-center">
                  {previewLoading ? (
                    <Loader2 className="mx-auto size-5 animate-spin text-muted" />
                  ) : (
                    <Icon className="mx-auto size-8 text-component" />
                  )}
                  <p className="mt-2 max-w-44 truncate text-xs font-medium text-surface">{asset.name}</p>
                </div>
              )}
            </div>
            <AppButton
              color="primary"
              variant="solid"
              size="md"
              data-test-id="asset-details-insert"
              className="mt-3 w-full"
              onClick={() => {
                insertAssetInstance(store, asset, libraryKey)
                onClose()
              }}
            >
              {panels.insertInstance}
            </AppButton>
          </div>
          <div className="min-w-0 p-4">
            {asset.description ? (
              <section className="mb-4">
                <h3 className="text-[11px] font-medium tracking-wider text-muted uppercase">
                  {panels.description}
                </h3>
                <p data-test-id="asset-details-description" className="mt-1 text-xs leading-5 text-surface">
                  {asset.description}
                </p>
              </section>
            ) : null}
            {asset.sourceLibraryKey ? (
              <section className="mb-4">
                <h3 className="text-[11px] font-medium tracking-wider text-muted uppercase">
                  {panels.assetLibraryBadge}
                </h3>
                <p data-test-id="asset-details-library" className="mt-1 break-all text-xs text-muted">
                  {asset.sourceLibraryKey}
                </p>
              </section>
            ) : null}
            {asset.docsURL ? (
              <section className="mb-4">
                <h3 className="text-[11px] font-medium tracking-wider text-muted uppercase">
                  {panels.documentation}
                </h3>
                <AppButton
                  color="primary"
                  variant="link"
                  size="xs"
                  data-test-id="asset-details-docs"
                  className="mt-1"
                  onClick={() => {
                    if (asset.docsURL) openExternalLink(asset.docsURL)
                  }}
                >
                  <BookOpen className="size-3" />
                  {panels.openDocs}
                </AppButton>
              </section>
            ) : null}
            {asset.variants.length > 0 ? (
              <section>
                <h3 className="text-[11px] font-medium tracking-wider text-muted uppercase">
                  {panels.properties}
                </h3>
                <div className="mt-2 flex flex-col gap-2">
                  {asset.variants.map((variant) => (
                    <div
                      key={variant.name}
                      data-test-id="asset-details-property"
                      className="rounded border border-border bg-input/40 px-2 py-1.5"
                    >
                      <div className="text-xs font-medium text-surface">{variant.name}</div>
                      <div className="mt-1 text-[11px] text-muted">{variant.values.join(', ')}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
