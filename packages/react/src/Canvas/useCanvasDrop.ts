import { useState, type RefObject } from 'react'

import { useEventListener } from '../internal/useEventListener'

import type { Editor } from '@open-pencil/core/editor'

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])

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

    const files = filterImageFiles(e.dataTransfer?.files ?? null)
    if (!files.length) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { x: cx, y: cy } = editor.screenToCanvas(sx, sy)

    void editor.placeImageFiles(files, cx, cy)
  })

  return { isDraggingOver }
}

function hasImageFiles(e: DragEvent): boolean {
  if (!e.dataTransfer?.types.includes('Files')) return false
  for (const item of e.dataTransfer.items) {
    if (item.kind === 'file' && ACCEPTED_TYPES.has(item.type)) return true
  }
  return false
}

function filterImageFiles(files: FileList | null): File[] {
  if (!files) return []
  const result: File[] = []
  for (const file of files) {
    if (ACCEPTED_TYPES.has(file.type)) result.push(file)
  }
  return result
}

export function extractImageFilesFromClipboard(e: ClipboardEvent): File[] {
  return filterImageFiles(e.clipboardData?.files ?? null)
}
