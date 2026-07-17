import { useEffect, useRef, useState, type RefObject } from 'react'

import type { Editor } from '@open-pencil/core/editor'

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])

export function useCanvasDrop(canvasRef: RefObject<HTMLCanvasElement | null>, editor: Editor) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const editorRef = useRef(editor)
  editorRef.current = editor

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function onDragOver(e: DragEvent) {
      if (!hasImageFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
      setIsDraggingOver(true)
    }

    function onDragEnter(e: DragEvent) {
      if (!hasImageFiles(e)) return
      e.preventDefault()
      setIsDraggingOver(true)
    }

    function onDragLeave() {
      setIsDraggingOver(false)
    }

    function onDrop(e: DragEvent) {
      e.preventDefault()
      setIsDraggingOver(false)

      const files = filterImageFiles(e.dataTransfer?.files ?? null)
      if (!files.length) return

      const el = canvasRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const { x: cx, y: cy } = editorRef.current.screenToCanvas(sx, sy)

      void editorRef.current.placeImageFiles(files, cx, cy)
    }

    canvas.addEventListener('dragover', onDragOver)
    canvas.addEventListener('dragenter', onDragEnter)
    canvas.addEventListener('dragleave', onDragLeave)
    canvas.addEventListener('drop', onDrop)

    return () => {
      canvas.removeEventListener('dragover', onDragOver)
      canvas.removeEventListener('dragenter', onDragEnter)
      canvas.removeEventListener('dragleave', onDragLeave)
      canvas.removeEventListener('drop', onDrop)
    }
  }, [canvasRef])

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
