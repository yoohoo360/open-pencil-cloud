import IconLucideBookOpen from '~icons/lucide/book-open'
import IconLucideLoader2 from '~icons/lucide/loader-2'
import IconLucidePlus from '~icons/lucide/plus'
import IconLucideX from '~icons/lucide/x'
import * as Dialog from '@radix-ui/react-dialog'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { SceneNode } from '@open-pencil/scene-graph'
import { useI18n, useSceneComputed } from '@open-pencil/react'
import { nodeIcon } from '@/app/editor/icons'
import { useEditorStore } from '@/app/editor/active-store'
import { openExternalLink } from '@/app/shell/ui'
import AppInput from '@/components/ui/AppInput'
import { useButtonUI } from '@/components/ui/button'
import { useDialogUI } from '@/components/ui/dialog'
import Tip from '@/components/ui/Tip'

type LocalAsset = {
  id: string
  name: string
  node: SceneNode
  componentId: string | null
  variants: Array<{ name: string; values: string[] }>
  variantCount: number
  hasConflicts: boolean
  sourceLibraryKey: string | null
  description: string
  docsUrl: string | null
}

export const AssetsPanel = memo(function AssetsPanel() {
  const editor = useEditorStore()
  const { panels, commands } = useI18n()
  const [query, setQuery] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewRequestIdRef = useRef(0)
  const insertButton = useButtonUI({ tone: 'ghost', size: 'iconSm' })
  const primaryButton = useButtonUI({ tone: 'accent', size: 'md' })
  const dialog = useDialogUI({ content: 'flex w-[720px] max-w-[92vw] flex-col overflow-hidden' })

  const componentSetVariantInfo = useCallback(
    (componentSetId: string) =>
      [...editor.collectVariantOptions(componentSetId)].map(([name, values]) => ({
        name,
        values: [...values].sort((a, b) => a.localeCompare(b))
      })),
    [editor]
  )

  const sceneVersion = useSceneComputed(() => editor.state.sceneVersion)

  const assets = useSceneComputed<LocalAsset[]>(() => {
    return [...editor.graph.nodes.values()]
      .filter((node) => node.type === 'COMPONENT' || node.type === 'COMPONENT_SET')
      .filter((node) => {
        if (node.type === 'COMPONENT_SET') return true
        const parent = node.parentId ? editor.graph.getNode(node.parentId) : null
        return parent?.type !== 'COMPONENT_SET'
      })
      .map((node) => {
        const defaultVariant =
          node.type === 'COMPONENT_SET' ? editor.getDefaultVariantForComponentSet(node.id) : node
        const conflicts =
          node.type === 'COMPONENT_SET' ? editor.getComponentSetVariantConflicts(node.id) : []
        const variants = node.type === 'COMPONENT_SET' ? componentSetVariantInfo(node.id) : []
        return {
          id: node.id,
          name: node.name,
          node,
          componentId: defaultVariant?.id ?? null,
          variants,
          variantCount: node.type === 'COMPONENT_SET' ? node.childIds.length : 0,
          hasConflicts: conflicts.length > 0,
          sourceLibraryKey: node.sourceLibraryKey,
          description: node.symbolDescription,
          docsUrl: node.symbolLinks[0]?.uri ?? null
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return assets
    return assets.filter((asset) => asset.name.toLowerCase().includes(normalized))
  }, [assets, query])

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  )
  const selectedPreviewNodeId = selectedAsset?.componentId ?? null

  const clearPreview = useCallback(() => {
    setPreviewBlob(null)
  }, [])

  useEffect(() => {
    if (!previewBlob) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(previewBlob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [previewBlob])

  useEffect(() => {
    const requestId = ++previewRequestIdRef.current
    const nodeId = selectedPreviewNodeId

    if (!detailsOpen || !nodeId) {
      clearPreview()
      return
    }

    const node = editor.getNode(nodeId)
    if (!node) {
      clearPreview()
      return
    }

    setPreviewLoading(true)
    void (async () => {
      try {
        const maxSize = Math.max(node.width, node.height, 1)
        const scale = Math.min(176 / maxSize, 2)
        const data = await editor.renderExportImage([nodeId], scale, 'PNG')
        if (requestId !== previewRequestIdRef.current) return
        setPreviewBlob(data ? new Blob([new Uint8Array(data)], { type: 'image/png' }) : null)
      } finally {
        if (requestId === previewRequestIdRef.current) setPreviewLoading(false)
      }
    })()
  }, [clearPreview, detailsOpen, editor, sceneVersion, selectedPreviewNodeId])

  const openDetails = useCallback((asset: LocalAsset) => {
    setSelectedAssetId(asset.id)
    setDetailsOpen(true)
  }, [])

  const insertionPoint = useCallback(
    (component: SceneNode, parentId: string) => {
      const canvasCenter = editor.viewportCanvasCenter()
      const center = editor.screenToCanvas(canvasCenter.x, canvasCenter.y)
      const parentOffset =
        parentId === editor.state.currentPageId
          ? { x: 0, y: 0 }
          : editor.graph.getAbsolutePosition(parentId)
      return {
        x: center.x - parentOffset.x - component.width / 2,
        y: center.y - parentOffset.y - component.height / 2
      }
    },
    [editor]
  )

  const insertAsset = useCallback(
    (asset: LocalAsset) => {
      if (!asset.componentId) return
      const component = editor.graph.getNode(asset.componentId)
      if (!component) return
      const parentId = editor.state.enteredContainerId ?? editor.state.currentPageId
      const point = insertionPoint(component, parentId)
      editor.createInstanceFromComponent(asset.componentId, point.x, point.y, parentId)
      editor.requestRender()
    },
    [editor, insertionPoint]
  )

  const insertSelectedAsset = useCallback(() => {
    if (!selectedAsset) return
    insertAsset(selectedAsset)
    setDetailsOpen(false)
  }, [insertAsset, selectedAsset])

  const SelectedAssetIcon = selectedAsset ? nodeIcon(selectedAsset.node) : null

  return (
    <section data-test-id="assets-panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-3 py-2 text-[11px] font-semibold text-surface">
        {panels.assets}
      </header>
      <div className="shrink-0 px-2 pb-2">
        <AppInput
          value={query}
          onValueChange={setQuery}
          type="search"
          data-test-id="assets-search"
          size="sm"
          placeholder={panels.searchLocalComponents}
        />
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-1 pb-2">
        {filteredAssets.map((asset) => {
          const AssetIcon = nodeIcon(asset.node)
          return (
            <button
              key={asset.id}
              type="button"
              data-test-id="asset-item"
              data-asset-id={asset.id}
              className="group/asset flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-surface hover:bg-hover"
              onClick={() => openDetails(asset)}
              onDoubleClick={() => insertAsset(asset)}
            >
              <AssetIcon className="size-3.5 shrink-0 text-component" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span data-test-id="asset-name" className="truncate">
                    {asset.name}
                  </span>
                  {asset.sourceLibraryKey ? (
                    <span
                      data-test-id="asset-library-badge"
                      className="shrink-0 rounded bg-component/15 px-1 py-px text-[9px] font-medium text-component uppercase"
                    >
                      {panels.assetLibraryBadge}
                    </span>
                  ) : null}
                </span>
                {asset.variants.length > 0 ? (
                  <span
                    data-test-id="asset-variant-summary"
                    className="mt-0.5 block truncate text-[10px] text-muted"
                  >
                    {panels.assetVariantSummary({
                      count: asset.variantCount,
                      names: asset.variants.map((variant) => variant.name).join(', ')
                    })}
                  </span>
                ) : null}
                {asset.description ? (
                  <span
                    data-test-id="asset-description"
                    className="mt-0.5 block truncate text-[10px] text-muted"
                  >
                    {asset.description}
                  </span>
                ) : null}
                {asset.hasConflicts ? (
                  <span
                    data-test-id="asset-variant-conflict"
                    className="mt-0.5 block truncate text-[10px] text-[var(--color-warning-text)]"
                  >
                    {panels.duplicateVariantValues}
                  </span>
                ) : null}
              </span>
              {asset.docsUrl ? (
                <Tip label={panels.openDocumentation}>
                  <span
                    className={insertButton.base}
                    data-test-id="asset-docs"
                    onPointerDown={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (asset.docsUrl) openExternalLink(asset.docsUrl)
                    }}
                  >
                    <IconLucideBookOpen className="size-3" />
                  </span>
                </Tip>
              ) : null}
              <Tip label={commands.createInstance}>
                <span
                  className={insertButton.base}
                  data-test-id="asset-insert"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    insertAsset(asset)
                  }}
                >
                  <IconLucidePlus className="size-3" />
                </span>
              </Tip>
            </button>
          )
        })}

        {filteredAssets.length === 0 ? (
          <div data-test-id="assets-empty" className="px-3 py-6 text-center text-xs text-muted">
            {panels.noLocalComponents}
          </div>
        ) : null}
      </div>

      <Dialog.Root open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={dialog.overlay} />
          {selectedAsset && SelectedAssetIcon ? (
            <Dialog.Content
              data-test-id="asset-details-dialog"
              className={dialog.content}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <SelectedAssetIcon className="size-4 shrink-0 text-component" />
                  <div className="min-w-0">
                    <Dialog.Title className={`${dialog.title} truncate`}>
                      {selectedAsset.name}
                    </Dialog.Title>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {selectedAsset.node.type === 'COMPONENT_SET'
                        ? panels.componentSet
                        : panels.component}
                      {selectedAsset.variantCount > 0 ? (
                        <span> · {selectedAsset.variantCount} variants</span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <Dialog.Close
                  data-test-id="asset-details-close"
                  className="flex size-7 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                >
                  <IconLucideX className="size-4" />
                </Dialog.Close>
              </div>

              <div className="grid min-h-0 grid-cols-[260px_1fr] gap-0">
                <div className="border-r border-border p-4">
                  <div
                    data-test-id="asset-details-preview"
                    className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas/60"
                  >
                    {previewUrl ? (
                      <img
                        data-test-id="asset-details-preview-image"
                        src={previewUrl}
                        alt={`${selectedAsset.name} preview`}
                        className="max-h-[120px] max-w-[210px] object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        {previewLoading ? (
                          <IconLucideLoader2 className="mx-auto size-5 animate-spin text-muted" />
                        ) : (
                          <SelectedAssetIcon className="mx-auto size-8 text-component" />
                        )}
                        <p className="mt-2 max-w-44 truncate text-xs font-medium text-surface">
                          {selectedAsset.name}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    data-test-id="asset-details-insert"
                    className={`${primaryButton.base} mt-3 w-full`}
                    onClick={insertSelectedAsset}
                  >
                    {panels.insertInstance}
                  </button>
                </div>

                <div className="min-w-0 p-4">
                  {selectedAsset.description ? (
                    <section className="mb-4">
                      <h3 className="text-[11px] font-medium tracking-wider text-muted uppercase">
                        {panels.description}
                      </h3>
                      <p
                        data-test-id="asset-details-description"
                        className="mt-1 text-xs leading-5 text-surface"
                      >
                        {selectedAsset.description}
                      </p>
                    </section>
                  ) : null}

                  {selectedAsset.sourceLibraryKey ? (
                    <section className="mb-4">
                      <h3 className="text-[11px] font-medium tracking-wider text-muted uppercase">
                        {panels.assetLibraryBadge}
                      </h3>
                      <p
                        data-test-id="asset-details-library"
                        className="mt-1 break-all text-xs text-muted"
                      >
                        {selectedAsset.sourceLibraryKey}
                      </p>
                    </section>
                  ) : null}

                  {selectedAsset.docsUrl ? (
                    <section className="mb-4">
                      <h3 className="text-[11px] font-medium tracking-wider text-muted uppercase">
                        {panels.documentation}
                      </h3>
                      <button
                        type="button"
                        data-test-id="asset-details-docs"
                        className="mt-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-component hover:bg-component/10"
                        onClick={() => {
                          if (selectedAsset.docsUrl) openExternalLink(selectedAsset.docsUrl)
                        }}
                      >
                        <IconLucideBookOpen className="size-3" />
                        {panels.openDocs}
                      </button>
                    </section>
                  ) : null}

                  {selectedAsset.variants.length > 0 ? (
                    <section>
                      <h3 className="text-[11px] font-medium tracking-wider text-muted uppercase">
                        {panels.properties}
                      </h3>
                      <div className="mt-2 flex flex-col gap-2">
                        {selectedAsset.variants.map((variant) => (
                          <div
                            key={variant.name}
                            data-test-id="asset-details-property"
                            className="rounded border border-border bg-input/40 px-2 py-1.5"
                          >
                            <div className="text-xs font-medium text-surface">{variant.name}</div>
                            <div className="mt-1 text-[11px] text-muted">
                              {variant.values.join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </Dialog.Content>
          ) : null}
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
})

AssetsPanel.displayName = 'AssetsPanel'
export default AssetsPanel
