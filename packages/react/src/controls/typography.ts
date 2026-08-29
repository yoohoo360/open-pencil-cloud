import { useRef } from 'react'

import { DEFAULT_FONT_FAMILY } from '@open-pencil/core/constants'
import { FONT_WEIGHT_NAMES, fontManager, weightToStyle } from '@open-pencil/core/text'
import type { SceneNode, TextDecoration } from '@open-pencil/scene-graph'

import { loadFont } from '#react/app/editor/fonts'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

type TextAlign = SceneNode['textAlignHorizontal']
type TextDirection = SceneNode['textDirection']
type TextVerticalAlign = SceneNode['textAlignVertical']
type TextCase = SceneNode['textCase']
type TextTruncation = SceneNode['textTruncation']

export const TYPOGRAPHY_WEIGHTS = Object.entries(FONT_WEIGHT_NAMES).map(([value, label]) => ({
  value: Number(value),
  label
}))

export function useTypography() {
  const editor = useEditor()
  const node = useSceneComputed(() => editor.getSelectedNode() ?? null)
  const missingFonts = node?.type === 'TEXT' ? missingFontsFor(node) : []
  const activeFormatting = formattingFor(node)
  const propBeforePreview = useRef<
    { key: keyof SceneNode; value: SceneNode[keyof SceneNode]; textStyleId: string | null } | undefined
  >(undefined)

  async function setFamily(family: string) {
    if (!node) return
    await loadFont(family, weightToStyle(node.fontWeight, node.italic))
    editor.updateNodeWithUndo(node.id, { fontFamily: family }, 'Change font')
  }

  async function setWeight(weight: number) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { fontWeight: weight }, 'Change font weight')
    await loadFont(node.fontFamily, weightToStyle(weight, node.italic))
  }

  function setAlign(align: TextAlign) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textAlignHorizontal: align }, 'Change text alignment')
  }

  function setDirection(direction: TextDirection) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textDirection: direction }, 'Change text direction')
  }

  function setVerticalAlign(align: TextVerticalAlign) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textAlignVertical: align }, 'Change vertical text alignment')
  }

  function setTextCase(textCase: TextCase) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textCase }, 'Change text case')
  }

  function setTruncation(textTruncation: TextTruncation) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textTruncation }, 'Change text truncation')
  }

  function setFontFeature(tag: string, enabled: boolean) {
    if (!node) return
    const fontFeatures = node.fontFeatures.filter((feature) => feature.tag !== tag)
    fontFeatures.push({ tag, enabled })
    editor.updateNodeWithUndo(node.id, { fontFeatures }, `Change ${tag} feature`)
  }

  function toggleBold() {
    if (!node) return
    void setWeight(node.fontWeight >= 700 ? 400 : 700)
  }

  function toggleItalic() {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { italic: !node.italic }, 'Toggle italic')
  }

  function toggleDecoration(deco: 'UNDERLINE' | 'STRIKETHROUGH') {
    if (!node) return
    const current = node.textDecoration
    editor.updateNodeWithUndo(
      node.id,
      { textDecoration: (current === deco ? 'NONE' : deco) as TextDecoration },
      `Toggle ${deco.toLowerCase()}`
    )
  }

  function updateProp(key: keyof SceneNode, value: number | string | null) {
    if (!node) return
    if (!propBeforePreview.current || propBeforePreview.current.key !== key) {
      propBeforePreview.current = {
        key,
        value: node[key],
        textStyleId: node.textStyleId
      }
    }
    editor.updateNode(node.id, { [key]: value } as Partial<SceneNode>)
  }

  function commitProp(
    key: keyof SceneNode,
    _value: number | string | null,
    previous: number | string | null
  ) {
    if (!node) return
    const snapshot = propBeforePreview.current?.key === key ? propBeforePreview.current : undefined
    editor.commitNodeUpdate(
      node.id,
      {
        [key]: snapshot ? snapshot.value : previous,
        ...(snapshot ? { textStyleId: snapshot.textStyleId } : {})
      } as Partial<SceneNode>,
      `Change ${String(key)}`
    )
    propBeforePreview.current = undefined
  }

  return {
    editor,
    node,
    fontFamily: node?.fontFamily ?? '',
    fontWeight: node?.fontWeight ?? 400,
    fontSize: node?.fontSize ?? 16,
    activeFormatting,
    missingFonts,
    hasMissingFonts: missingFonts.length > 0,
    weights: TYPOGRAPHY_WEIGHTS,
    setFamily,
    setWeight,
    setAlign,
    setDirection,
    setVerticalAlign,
    setTextCase,
    setTruncation,
    setFontFeature,
    toggleBold,
    toggleItalic,
    toggleDecoration,
    updateProp,
    commitProp
  }
}

function missingFontsFor(node: SceneNode): string[] {
  const families = new Set<string>()
  families.add(node.fontFamily || DEFAULT_FONT_FAMILY)
  for (const run of node.styleRuns) {
    if (run.style.fontFamily) families.add(run.style.fontFamily)
  }
  return [...families].filter((family) => !fontManager.isLoaded(family))
}

function formattingFor(node: SceneNode | null): string[] {
  if (!node) return []
  const result: string[] = []
  if (node.fontWeight >= 700) result.push('bold')
  if (node.italic) result.push('italic')
  if (node.textDecoration === 'UNDERLINE') result.push('underline')
  if (node.textDecoration === 'STRIKETHROUGH') result.push('strikethrough')
  return result
}
