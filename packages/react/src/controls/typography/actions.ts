import { useMemo } from 'react'

import type { Editor } from '@open-pencil/core/editor'
import { FONT_WEIGHT_NAMES, weightToStyle } from '@open-pencil/core/text'
import type { SceneNode, TextDecoration } from '@open-pencil/scene-graph'

import type { UseTypographyOptions } from '#react/controls/typography/use'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { useNodeFontStatus } from '#react/shared/font-status/use'

type TextAlign = SceneNode['textAlignHorizontal']
type TextDirection = SceneNode['textDirection']
type TextVerticalAlign = SceneNode['textAlignVertical']
type TextCase = SceneNode['textCase']
type TextTruncation = SceneNode['textTruncation']

export const TYPOGRAPHY_WEIGHTS = Object.entries(FONT_WEIGHT_NAMES).map(([value, label]) => ({
  value: Number(value),
  label
}))

export function createTypographyState(editor: Editor) {
  const node = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)
  const { missingFonts, hasMissingFonts } = useNodeFontStatus(() => node)
  const fontFamily = useMemo(() => node?.fontFamily ?? '', [node])
  const fontWeight = useMemo(() => node?.fontWeight ?? 400, [node])
  const fontSize = useMemo(() => node?.fontSize ?? 16, [node])
  const currentWeightLabel = useMemo(
    () => FONT_WEIGHT_NAMES[node?.fontWeight ?? 400] ?? 'Regular',
    [node]
  )
  const activeFormatting = useMemo(() => {
    if (!node) return []
    const result: string[] = []
    if (node.fontWeight >= 700) result.push('bold')
    if (node.italic) result.push('italic')
    if (node.textDecoration === 'UNDERLINE') result.push('underline')
    if (node.textDecoration === 'STRIKETHROUGH') result.push('strikethrough')
    return result
  }, [node])

  return {
    node,
    fontFamily,
    fontWeight,
    fontSize,
    currentWeightLabel,
    activeFormatting,
    missingFonts,
    hasMissingFonts
  }
}

type TypographyActionOptions = {
  editor: Editor
  node: SceneNode | null
  currentWeightLabel: string
  activeFormatting: string[]
  options: UseTypographyOptions
}

export function createTypographyActions({
  editor,
  node,
  currentWeightLabel,
  activeFormatting,
  options
}: TypographyActionOptions) {
  let propBeforePreview:
    | { key: keyof SceneNode; value: SceneNode[keyof SceneNode]; textStyleId: string | null }
    | undefined

  async function doLoadFont(family: string, style: string) {
    await options.fontLoader?.load(family, style)
  }

  async function setFamily(family: string) {
    if (!node) return
    await doLoadFont(family, currentWeightLabel)
    editor.updateNodeWithUndo(node.id, { fontFamily: family }, 'Change font')
  }

  async function setWeight(weight: number) {
    if (!node) return
    const { id, fontFamily } = node
    const style = weightToStyle(weight)
    editor.updateNodeWithUndo(id, { fontWeight: weight }, 'Change font weight')
    await doLoadFont(fontFamily, style)
  }

  function setAlign(align: TextAlign) {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { textAlignHorizontal: align },
      'Change text alignment'
    )
  }

  function setDirection(direction: TextDirection) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textDirection: direction }, 'Change text direction')
  }

  function setVerticalAlign(align: TextVerticalAlign) {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { textAlignVertical: align },
      'Change vertical text alignment'
    )
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

  function onFormattingChange(values: string[]) {
    if (!node) return
    const prev = activeFormatting
    const added = values.filter((v) => !prev.includes(v))
    const removed = prev.filter((v) => !values.includes(v))
    for (const item of [...added, ...removed]) {
      if (item === 'bold') toggleBold()
      else if (item === 'italic') toggleItalic()
      else if (item === 'underline') toggleDecoration('UNDERLINE')
      else if (item === 'strikethrough') toggleDecoration('STRIKETHROUGH')
    }
  }

  function updateProp(key: keyof SceneNode, value: number | string | null) {
    if (!node) return
    if (!propBeforePreview || propBeforePreview.key !== key) {
      propBeforePreview = {
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
    const snapshot = propBeforePreview?.key === key ? propBeforePreview : undefined
    editor.commitNodeUpdate(
      node.id,
      {
        [key]: snapshot ? snapshot.value : previous,
        ...(snapshot ? { textStyleId: snapshot.textStyleId } : {})
      } as Partial<SceneNode>,
      `Change ${String(key)}`
    )
    propBeforePreview = undefined
  }

  return {
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
    onFormattingChange,
    updateProp,
    commitProp
  }
}
