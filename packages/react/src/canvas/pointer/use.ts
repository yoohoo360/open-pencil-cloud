import type { MutableRef } from '#react/shared/input/ref'

import type { Editor } from '@open-pencil/core/editor'
import type { SceneNode } from '@open-pencil/scene-graph'

import {
  canvasToLocalPoint,
  getPointerCoords,
  hitTestInEditorScope,
  isInsideEditorContainerBounds
} from '#react/shared/input/geometry'
import type { HitTestFns } from '#react/shared/input/select'

export function createCanvasPointer(
  canvasRef: MutableRef<HTMLCanvasElement | null>,
  editor: Editor,
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null,
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null,
  hitTestFrameTitle: (cx: number, cy: number) => SceneNode | null
) {
  const canvasToLocal = (cx: number, cy: number, scopeId: string) =>
    canvasToLocalPoint(cx, cy, scopeId, editor)
  const hitTestInScope = (cx: number, cy: number, deep: boolean) =>
    hitTestInEditorScope(cx, cy, deep, editor)
  const isInsideContainerBounds = (cx: number, cy: number, containerId: string) =>
    isInsideEditorContainerBounds(cx, cy, containerId, editor, canvasToLocal)

  const hitFns: HitTestFns = {
    hitTestInScope,
    isInsideContainerBounds,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }

  return {
    getCoords: (e: MouseEvent) => getPointerCoords(e, canvasRef.current, editor),
    canvasToLocal,
    hitTestInScope,
    isInsideContainerBounds,
    hitFns
  }
}
