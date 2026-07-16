import { useState } from 'react'

import {
  getFillOkHCL,
  getStrokeOkHCL,
  resolveOkHCLForPreview,
  rgbaToOkHCL,
  setNodeFillOkHCL,
  setNodeStrokeOkHCL
} from '@open-pencil/core'

import { useEditor } from '../context/editorContext'

import type { ColorFieldFormat } from '../ColorPicker/types'
import type { OkHCLColor, SceneNode } from '@open-pencil/core'

export function useOkHCL() {
  const editor = useEditor()
  const [fieldFormats, setFieldFormats] = useState(() => new Map<string, ColorFieldFormat>())

  function fieldKey(kind: 'fill' | 'stroke', nodeId: string, index: number) {
    return `${kind}:${nodeId}:${index}`
  }

  function getFillOkHCLColor(node: SceneNode | null, index: number): OkHCLColor | null {
    return node ? (getFillOkHCL(node, index)?.color ?? null) : null
  }

  function getStrokeOkHCLColor(node: SceneNode | null, index: number): OkHCLColor | null {
    return node ? (getStrokeOkHCL(node, index)?.color ?? null) : null
  }

  function ensureFillOkHCL(node: SceneNode, index: number) {
    const color =
      getFillOkHCLColor(node, index) ??
      rgbaToOkHCL(node.fills[index]?.color ?? { r: 0, g: 0, b: 0, a: 1 })
    editor.updateNodeWithUndo(
      node.id,
      setNodeFillOkHCL(node, index, color),
      'Update fill color model'
    )
  }

  function ensureStrokeOkHCL(node: SceneNode, index: number) {
    const color =
      getStrokeOkHCLColor(node, index) ??
      rgbaToOkHCL(node.strokes[index]?.color ?? { r: 0, g: 0, b: 0, a: 1 })
    editor.updateNodeWithUndo(
      node.id,
      setNodeStrokeOkHCL(node, index, color),
      'Update stroke color model'
    )
  }

  function updateFillOkHCL(node: SceneNode, index: number, patch: Partial<OkHCLColor>) {
    const current =
      getFillOkHCLColor(node, index) ??
      rgbaToOkHCL(node.fills[index]?.color ?? { r: 0, g: 0, b: 0, a: 1 })
    editor.updateNodeWithUndo(
      node.id,
      setNodeFillOkHCL(node, index, { ...current, ...patch }),
      'Change fill OkHCL'
    )
  }

  function updateStrokeOkHCL(node: SceneNode, index: number, patch: Partial<OkHCLColor>) {
    const current =
      getStrokeOkHCLColor(node, index) ??
      rgbaToOkHCL(node.strokes[index]?.color ?? { r: 0, g: 0, b: 0, a: 1 })
    editor.updateNodeWithUndo(
      node.id,
      setNodeStrokeOkHCL(node, index, { ...current, ...patch }),
      'Change stroke OkHCL'
    )
  }

  function getFillPreviewInfo(node: SceneNode | null, index: number) {
    const documentColorSpace = editor.graph.documentColorSpace
    const okhcl = getFillOkHCLColor(node, index)
    if (!okhcl) return { previewColorSpace: documentColorSpace, clipped: false }
    const resolved = resolveOkHCLForPreview(okhcl, { documentColorSpace })
    return { previewColorSpace: resolved.targetSpace, clipped: resolved.clipped }
  }

  function getStrokePreviewInfo(node: SceneNode | null, index: number) {
    const documentColorSpace = editor.graph.documentColorSpace
    const okhcl = getStrokeOkHCLColor(node, index)
    if (!okhcl) return { previewColorSpace: documentColorSpace, clipped: false }
    const resolved = resolveOkHCLForPreview(okhcl, { documentColorSpace })
    return { previewColorSpace: resolved.targetSpace, clipped: resolved.clipped }
  }

  function getFieldFormat(node: SceneNode | null, index: number, kind: 'fill' | 'stroke') {
    if (!node) return 'rgb' as const
    const key = fieldKey(kind, node.id, index)
    const stored = fieldFormats.get(key)
    if (stored) return stored
    return (kind === 'fill' ? getFillOkHCL(node, index) : getStrokeOkHCL(node, index))
      ? 'okhcl'
      : 'rgb'
  }

  function setFillFieldFormat(node: SceneNode, index: number, format: ColorFieldFormat) {
    setFieldFormats((prev) => {
      const next = new Map(prev)
      next.set(fieldKey('fill', node.id, index), format)
      return next
    })
    if (format === 'okhcl') ensureFillOkHCL(node, index)
  }

  function setStrokeFieldFormat(node: SceneNode, index: number, format: ColorFieldFormat) {
    setFieldFormats((prev) => {
      const next = new Map(prev)
      next.set(fieldKey('stroke', node.id, index), format)
      return next
    })
    if (format === 'okhcl') ensureStrokeOkHCL(node, index)
  }

  return {
    getFillOkHCLColor,
    getStrokeOkHCLColor,
    getFillPreviewInfo,
    getStrokePreviewInfo,
    getFieldFormat,
    setFillFieldFormat,
    setStrokeFieldFormat,
    updateFillOkHCL,
    updateStrokeOkHCL,
    fieldOptions: [
      { value: 'rgb' as const, label: 'RGB' },
      { value: 'hsl' as const, label: 'HSL' },
      { value: 'hsb' as const, label: 'HSB' },
      { value: 'okhcl' as const, label: 'OkHCL' }
    ]
  }
}
