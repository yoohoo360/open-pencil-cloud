import { useState, type RefObject } from 'react'

import type { Editor } from '@open-pencil/core/editor'

import { useEventListener } from '#react/shared/dom/hooks'

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])

export function extractImageFilesFromClipboard(event: ClipboardEvent): File[] {
  const files = event.clipboardData?.files
  if (!files?.length) return []
  return [...files].filter((file) => ACCEPTED_TYPES.has(file.type))
}

export function useCanvasDrop(canvasRef: RefObject<HTMLCanvasElement | null>, editor: Editor) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  useEventListener(canvasRef, 'dragover', (e: DragEvent) => {
    if (!hasImageFiles(e)) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    setIsDraggingOver(true)
  })

  useEventListener(canvasRef, 'dragenter', (e: DragEvent) => {
    if (!hasImageFiles(e)) return
    e.preventDefault()
    setIsDraggingOver(true)
  })

  useEventListener(canvasRef, 'dragleave', () => {
    setIsDraggingOver(false)
  })

  useEventListener(canvasRef, 'drop', (e: DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    if (!hasImageFiles(e) || !e.dataTransfer) return
    const file = [...e.dataTransfer.files].find((f) => ACCEPTED_TYPES.has(f.type))
    if (!file) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    void editor.placeImageFiles([file], cx, cy)
  })

  return { isDraggingOver }
}

function hasImageFiles(e: DragEvent) {
  if (!e.dataTransfer) return false
  return [...e.dataTransfer.items].some(
    (item) => item.kind === 'file' && ACCEPTED_TYPES.has(item.type)
  )
}
