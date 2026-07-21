import { describe, expect, test } from 'bun:test'

import { computed } from 'vue'

import { createEditor } from '@open-pencil/core/editor'

import { createTypographyActions } from '#react/controls/typography/actions'

describe('typography depth actions', () => {
  test('restores nullable max lines and text style after preview undo', () => {
    const editor = createEditor()
    const text = editor.graph.createNode('TEXT', editor.state.currentPageId, {
      maxLines: null,
      textStyleId: '1:20'
    })
    const node = computed(() => editor.graph.getNode(text.id) ?? null)
    const actions = createTypographyActions({
      editor,
      node,
      currentWeightLabel: computed(() => 'Regular'),
      activeFormatting: computed(() => []),
      options: {}
    })

    actions.updateProp('maxLines', 3)
    actions.commitProp('maxLines', 3, 1)
    expect(editor.graph.getNode(text.id)).toMatchObject({ maxLines: 3, textStyleId: '1:20' })

    editor.undo.undo()
    expect(editor.graph.getNode(text.id)).toMatchObject({ maxLines: null, textStyleId: '1:20' })
  })

  test('updates OpenType features and detaches text styles in one undo step', () => {
    const editor = createEditor()
    const text = editor.graph.createNode('TEXT', editor.state.currentPageId, {
      fontFeatures: [{ tag: 'kern', enabled: true }],
      textStyleId: '1:21'
    })
    const actions = createTypographyActions({
      editor,
      node: computed(() => editor.graph.getNode(text.id) ?? null),
      currentWeightLabel: computed(() => 'Regular'),
      activeFormatting: computed(() => []),
      options: {}
    })

    actions.setFontFeature('LIGA', false)
    expect(editor.graph.getNode(text.id)).toMatchObject({
      fontFeatures: [
        { tag: 'kern', enabled: true },
        { tag: 'LIGA', enabled: false }
      ],
      textStyleId: null
    })
    editor.undo.undo()
    expect(editor.graph.getNode(text.id)).toMatchObject({
      fontFeatures: [{ tag: 'kern', enabled: true }],
      textStyleId: '1:21'
    })
  })
})
