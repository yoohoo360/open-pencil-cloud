import { useMemo } from 'react'

import type { Editor } from '@open-pencil/core/editor'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { useSceneComputed } from '#react/internal/scene-computed/use'
import type { RefObject } from 'react'

type CanvasVirtualReference = {
  getBoundingClientRect: () => DOMRect
}

export function useCanvasVirtualReference(
  canvasRef: RefObject<HTMLElement | null>,
  editor: Editor,
  anchor: Vector | null
) {
  const zoom = editor.state.zoom
  const panX = editor.state.panX
  const panY = editor.state.panY

  return useMemo<CanvasVirtualReference | null>(() => {
    const point = anchor
    const canvas = canvasRef.current
    if (!point || !canvas) return null

    return {
      getBoundingClientRect() {
        const rect = canvas.getBoundingClientRect()
        const x = rect.left + point.x * zoom + panX
        const y = rect.top + point.y * zoom + panY
        return new DOMRect(x, y, 0, 0)
      }
    }
  }, [anchor, canvasRef, panX, panY, zoom])
}
