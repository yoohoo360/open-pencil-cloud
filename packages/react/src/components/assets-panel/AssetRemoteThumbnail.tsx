import { Component } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useEditorStore } from '#react/app/editor/store'
import { getLib } from '#react/graph/remote-lib'
import { renderAssetPreview } from '#react/components/assets-panel/assets'
import { ASSET_GRID_THUMBNAIL_SIZE, ASSET_THUMBNAIL_RENDER_SCALE } from '#react/constants'

export function AssetRemoteThumbnail({
  nodeId,
  alt,
  remoteKey,
  size
}: {
  nodeId: string
  alt: string
  remoteKey: string
  size: number
}) {
  const store = useEditorStore()
  const rootRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [previewURL, setPreviewURL] = useState<string | null>(null)
  const isGridThumbnail = size === ASSET_GRID_THUMBNAIL_SIZE

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(Boolean(entry?.isIntersecting))
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const graph = getLib(store.graph, remoteKey)?.graph
    const node = graph?.getNode(nodeId)
    if (!graph || !node) {
      setPreviewURL(null)
      return
    }
    let cancelled = false
    let objectURL: string | null = null
    const pageId = graph.getPages()[0]?.id
    const maxDimension = Math.max(node.width, node.height, 1)
    const scale = (size * ASSET_THUMBNAIL_RENDER_SCALE) / maxDimension
    void renderAssetPreview(store, nodeId, scale, pageId, graph).then((blob) => {
      if (cancelled) return
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
  }, [nodeId, remoteKey, size, store, visible])

  return (
    <div
      ref={rootRef}
      data-slot="asset-thumbnail"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded bg-canvas/60 ${
        isGridThumbnail ? 'size-24' : 'size-10'
      }`}
    >
      {previewURL ? (
        <img src={previewURL} alt={alt} className="max-h-full max-w-full object-contain" draggable={false} />
      ) : (
        <Component className="size-4 text-component" aria-hidden="true" />
      )}
    </div>
  )
}
