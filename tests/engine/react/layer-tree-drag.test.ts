import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core/editor'

import { applyLayerDrag } from '../../../packages/react/src/components/LayerTree/apply'

function setupTree() {
  const editor = createEditor()
  const page = editor.graph.getPages()[0]
  const frame = editor.graph.createNode('FRAME', page.id, { name: 'Frame' })
  const first = editor.graph.createNode('RECTANGLE', page.id, { name: 'First' })
  const second = editor.graph.createNode('ELLIPSE', page.id, { name: 'Second' })
  return { editor, page, frame, first, second }
}

describe('applyLayerDrag', () => {
  test('reorders a sibling above another layer', () => {
    const { editor, page, first, second } = setupTree()
    expect(page.childIds.slice(-2)).toEqual([first.id, second.id])
    expect(applyLayerDrag(editor, second.id, first.id, { type: 'reorder-above' })).toBe(true)
    expect(page.childIds.slice(-2)).toEqual([second.id, first.id])
  })

  test('reorders a sibling below another layer', () => {
    const { editor, page, first, second } = setupTree()
    expect(applyLayerDrag(editor, first.id, second.id, { type: 'reorder-below' })).toBe(true)
    expect(page.childIds.slice(-2)).toEqual([second.id, first.id])
  })

  test('makes a layer a child of a container', () => {
    const { editor, frame, first } = setupTree()
    expect(applyLayerDrag(editor, first.id, frame.id, { type: 'make-child' })).toBe(true)
    expect(frame.childIds).toEqual([first.id])
    expect(editor.graph.getNode(first.id)?.parentId).toBe(frame.id)
  })

  test('rejects dropping a layer onto its descendant', () => {
    const { editor, frame, first } = setupTree()
    editor.graph.reorderChild(first.id, frame.id, 0)
    expect(applyLayerDrag(editor, frame.id, first.id, { type: 'reorder-above' })).toBe(false)
  })
})
