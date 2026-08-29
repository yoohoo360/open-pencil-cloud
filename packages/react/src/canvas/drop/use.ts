import { useEffect, type RefObject } from 'react'

import type { Editor } from '@open-pencil/core/editor'

import {
  COMPONENT_LIB_MIME,
  COMPONENT_MIME,
  assetInsertionPoint,
  resolveAssetGraph
} from '#react/components/assets-panel/assets'
import { createInstanceFromComponent } from '#react/graph/instances'
import { findMoveDropTarget } from '#react/shared/input/drop-target'

const RASTER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif'
])

function hasComponentData(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(COMPONENT_MIME) ?? false
}

function hasFileData(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}

function dropPoint(event: DragEvent, canvas: HTMLCanvasElement, editor: Editor) {
  const rect = canvas.getBoundingClientRect()
  return editor.screenToCanvas(event.clientX - rect.left, event.clientY - rect.top)
}

function componentDropPlacement(
  componentId: string,
  cx: number,
  cy: number,
  editor: Editor,
  sourceLibraryKey?: string
) {
  const component = resolveAssetGraph(editor, sourceLibraryKey).getNode(componentId)
  if (component?.type !== 'COMPONENT') return null
  const target = findMoveDropTarget(cx, cy, editor)
  const parentId = target?.id ?? editor.state.currentPageId
  const parentOffset =
    parentId === editor.state.currentPageId
      ? { x: 0, y: 0 }
      : editor.graph.getAbsolutePosition(parentId)
  const point = assetInsertionPoint(component, { x: cx, y: cy }, parentOffset)
  return { parentId, x: point.x, y: point.y }
}

function isSVGFile(file: File): boolean {
  return (
    file.type === 'image/svg+xml' || (file.type === '' && file.name.toLowerCase().endsWith('.svg'))
  )
}

function filterCanvasFiles(files: ArrayLike<File> | Iterable<File> | null): File[] {
  if (!files) return []
  return Array.from(files).filter((file) => RASTER_IMAGE_TYPES.has(file.type) || isSVGFile(file))
}

export function useCanvasDrop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  editor: Editor,
  onActivate?: () => void
) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function onDragOver(event: DragEvent) {
      if (!hasComponentData(event) && !hasFileData(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }

    function onDragEnter(event: DragEvent) {
      if (!hasComponentData(event) && !hasFileData(event)) return
      onActivate?.()
      event.preventDefault()
    }

    function onDrop(event: DragEvent) {
      onActivate?.()
      event.preventDefault()
      const target = canvasRef.current
      if (!target) return
      const point = dropPoint(event, target, editor)
      const componentId = event.dataTransfer?.getData(COMPONENT_MIME)
      const sourceLibraryKey = event.dataTransfer?.getData(COMPONENT_LIB_MIME) || undefined
      if (componentId) {
        const placement = componentDropPlacement(
          componentId,
          point.x,
          point.y,
          editor,
          sourceLibraryKey
        )
        if (!placement) return
        createInstanceFromComponent(
          editor,
          componentId,
          placement.x,
          placement.y,
          placement.parentId,
          sourceLibraryKey
        )
        editor.requestRender()
        return
      }
      const files = filterCanvasFiles(event.dataTransfer?.files ?? null)
      if (!files.length) return
      void editor.placeFiles(files, point.x, point.y).catch((error: unknown) => {
        console.error('Failed to place dropped files', error)
      })
    }

    canvas.addEventListener('dragover', onDragOver)
    canvas.addEventListener('dragenter', onDragEnter)
    canvas.addEventListener('drop', onDrop)
    return () => {
      canvas.removeEventListener('dragover', onDragOver)
      canvas.removeEventListener('dragenter', onDragEnter)
      canvas.removeEventListener('drop', onDrop)
    }
  }, [canvasRef, editor, onActivate])
}
