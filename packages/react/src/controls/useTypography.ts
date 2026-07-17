import { FONT_WEIGHT_NAMES, weightToStyle } from '@open-pencil/core/text'
import type { SceneNode, TextDecoration } from '@open-pencil/scene-graph'

import { useEditor } from '../context/editorContext'
import { useSceneComputed } from '../internal/useSceneComputed'
import { useNodeFontStatus } from '../shared/useFontStatus'

type TextAlign = 'LEFT' | 'CENTER' | 'RIGHT'
type TextDirection = SceneNode['textDirection']

const WEIGHTS = Object.entries(FONT_WEIGHT_NAMES).map(([value, label]) => ({
  value: Number(value),
  label
}))

/**
 * Options for {@link useTypography}.
 */
export interface UseTypographyOptions {
  /**
   * Optional font loader invoked before changing family or weight.
   */
  loadFont?: (family: string, style: string) => Promise<unknown>
}

/**
 * Returns typography-related state and actions for the current text selection.
 */
export function useTypography(options: UseTypographyOptions = {}) {
  const editor = useEditor()

  const node = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)

  const { missingFonts, hasMissingFonts } = useNodeFontStatus(() => node)

  const fontFamily = node?.fontFamily ?? ''
  const fontWeight = node?.fontWeight ?? 400
  const fontSize = node?.fontSize ?? 16

  const currentWeightLabel = FONT_WEIGHT_NAMES[node?.fontWeight ?? 400] ?? 'Regular'

  const activeFormatting = (() => {
    if (!node) return [] as string[]
    const result: string[] = []
    if (node.fontWeight >= 700) result.push('bold')
    if (node.italic) result.push('italic')
    if (node.textDecoration === 'UNDERLINE') result.push('underline')
    if (node.textDecoration === 'STRIKETHROUGH') result.push('strikethrough')
    return result
  })()

  async function doLoadFont(family: string, style: string) {
    if (options.loadFont) await options.loadFont(family, style)
  }

  async function setFamily(family: string) {
    if (!node) return
    await doLoadFont(family, currentWeightLabel)
    editor.updateNodeWithUndo(node.id, { fontFamily: family }, 'Change font')
  }

  async function setWeight(weight: number) {
    if (!node) return
    const style = weightToStyle(weight)
    await doLoadFont(node.fontFamily, style)
    editor.updateNodeWithUndo(node.id, { fontWeight: weight }, 'Change font weight')
  }

  function setAlign(align: TextAlign) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textAlignHorizontal: align }, 'Change text alignment')
  }

  function setDirection(direction: TextDirection) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textDirection: direction }, 'Change text direction')
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

  function updateProp(key: string, value: number | string) {
    if (node) editor.updateNode(node.id, { [key]: value })
  }

  function commitProp(key: string, _value: number | string, previous: number | string) {
    if (node) {
      editor.commitNodeUpdate(node.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
    }
  }

  return {
    editor,
    node,
    fontFamily,
    fontWeight,
    fontSize,
    weights: WEIGHTS,
    currentWeightLabel,
    activeFormatting,
    missingFonts,
    hasMissingFonts,
    setFamily,
    setWeight,
    setAlign,
    setDirection,
    toggleBold,
    toggleItalic,
    toggleDecoration,
    onFormattingChange,
    updateProp,
    commitProp
  }
}
