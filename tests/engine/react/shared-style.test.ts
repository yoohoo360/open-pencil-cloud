import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core/editor'
import { getSharedStyles, type Effect, type Fill, type SceneNode } from '@open-pencil/scene-graph'

import {
  canCreateSharedStyle,
  createSharedStyleDefinition,
  deleteSharedStyleDefinition,
  groupSharedStyles,
  sharedStyleCreateProps,
  sharedStyleDefaultCreateProps,
  sharedStyleDetachPatch,
  sharedStyleLeafName,
  sharedStylePatch,
  uniqueStyleName,
  updateSharedStyleDefinition
} from '../../../packages/react/src/controls/shared-style'

const red: Fill = {
  type: 'SOLID',
  color: { r: 1, g: 0, b: 0, a: 1 },
  opacity: 1,
  visible: true
}
const blue: Fill = {
  type: 'SOLID',
  color: { r: 0, g: 0.3, b: 1, a: 1 },
  opacity: 1,
  visible: true
}

function setSourceId(node: SceneNode, id: string) {
  node.source.id = id
}

describe('shared style model', () => {
  test('lists internal definitions and applies canonical domain properties', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const fillStyle = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Brand/Primary',
      fills: [red],
      sharedStyleType: 'FILL',
      internalOnly: true
    })
    setSourceId(fillStyle, '1:20')
    const target = editor.graph.createNode('RECTANGLE', pageId, { fills: [blue] })

    expect(getSharedStyles(editor.graph, 'fill')).toEqual([
      { id: '1:20', nodeId: fillStyle.id, name: 'Brand/Primary', type: 'FILL' }
    ])
    expect(sharedStylePatch('fill', target, '1:20', fillStyle)).toMatchObject({
      fillStyleId: '1:20',
      fills: [red]
    })
    expect(sharedStyleDetachPatch('fill')).toEqual({ fillStyleId: null })
  })

  test('applies text, effect, and grid style payloads', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const target = editor.graph.createNode('TEXT', pageId)
    const textStyle = editor.graph.createNode('TEXT', pageId, {
      fontFamily: 'Inter',
      fontSize: 24,
      fontWeight: 700,
      lineHeight: 32,
      textCase: 'UPPER'
    })
    const effect: Effect = {
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 0, y: 4 },
      radius: 8,
      spread: 0,
      visible: true
    }
    const effectStyle = editor.graph.createNode('RECTANGLE', pageId, { effects: [effect] })
    const gridStyle = editor.graph.createNode('FRAME', pageId, {
      layoutGrids: [{ pattern: 'COLUMNS', count: 12, gutterSize: 16, visible: true }]
    })

    expect(sharedStylePatch('text', target, '1:21', textStyle)).toMatchObject({
      textStyleId: '1:21',
      fontSize: 24,
      fontWeight: 700,
      lineHeight: 32,
      textCase: 'UPPER'
    })
    expect(sharedStylePatch('effect', target, '1:22', effectStyle)).toMatchObject({
      effectStyleId: '1:22',
      effects: [effect]
    })
    expect(sharedStylePatch('grid', target, '1:23', gridStyle)).toMatchObject({
      gridStyleId: '1:23',
      layoutGrids: [{ count: 12 }]
    })
  })

  test('creates local color, text, effect, and grid definitions from the selection', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const rect = editor.graph.createNode('RECTANGLE', pageId, {
      fills: [red],
      strokes: [
        { color: { r: 0, g: 0, b: 0, a: 1 }, weight: 2, opacity: 1, visible: true, align: 'CENTER' }
      ],
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.2 },
          offset: { x: 0, y: 4 },
          radius: 8,
          spread: 0,
          visible: true
        }
      ]
    })
    const text = editor.graph.createNode('TEXT', pageId, { fontFamily: 'Inter', fontSize: 18 })
    const frame = editor.graph.createNode('FRAME', pageId, {
      layoutGrids: [{ pattern: 'COLUMNS', count: 12, gutterSize: 16, visible: true }]
    })

    expect(canCreateSharedStyle(rect, 'fill')).toBe(true)
    expect(canCreateSharedStyle(rect, 'stroke')).toBe(true)
    expect(canCreateSharedStyle(rect, 'effect')).toBe(true)
    expect(canCreateSharedStyle(text, 'text')).toBe(true)
    expect(canCreateSharedStyle(frame, 'grid')).toBe(true)
    expect(uniqueStyleName(['Color style'], 'Color style')).toBe('Color style 2')

    const fillDef = sharedStyleCreateProps('fill', rect, 'Brand/Primary')
    expect(fillDef).toMatchObject({
      type: 'RECTANGLE',
      props: { sharedStyleType: 'FILL', internalOnly: true, fills: [red] }
    })
    const strokeDef = sharedStyleCreateProps('stroke', rect, 'Brand/Line')
    expect(strokeDef.props.fills?.[0]).toMatchObject({
      type: 'SOLID',
      color: { r: 0, g: 0, b: 0, a: 1 }
    })
    const textDef = sharedStyleCreateProps('text', text, 'Type/Body')
    expect(textDef).toMatchObject({
      type: 'TEXT',
      props: { sharedStyleType: 'TEXT', fontSize: 18 }
    })
    const gridDef = sharedStyleCreateProps('grid', frame, 'Grid/12')
    expect(gridDef).toMatchObject({
      type: 'FRAME',
      props: { sharedStyleType: 'GRID', layoutGrids: [{ count: 12 }] }
    })
  })

  test('manual visual edits detach only the matching style and undo restores it', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const target = editor.graph.createNode('RECTANGLE', pageId, {
      fills: [red],
      fillStyleId: '1:20',
      effectStyleId: '1:22'
    })

    editor.updateNodeWithUndo(target.id, { fills: [blue] }, 'Change fills')
    expect(editor.graph.getNode(target.id)).toMatchObject({
      fillStyleId: null,
      effectStyleId: '1:22',
      fills: [blue]
    })

    editor.undo.undo()
    expect(editor.graph.getNode(target.id)).toMatchObject({ fillStyleId: '1:20', fills: [red] })

    const text = editor.graph.createNode('TEXT', pageId, { fontSize: 16, textStyleId: '1:21' })
    editor.updateNodeWithUndo(text.id, { fontSize: 24 }, 'Change font size')
    expect(editor.graph.getNode(text.id)).toMatchObject({ fontSize: 24, textStyleId: null })
    editor.undo.undo()
    expect(editor.graph.getNode(text.id)).toMatchObject({ fontSize: 16, textStyleId: '1:21' })
  })

  test('groups folder prefixes and creates standalone definitions', () => {
    expect(sharedStyleLeafName('Type/Heading')).toBe('Heading')
    expect(
      groupSharedStyles([
        { id: '1', nodeId: 'n1', name: 'Type/Heading', type: 'TEXT' },
        { id: '2', nodeId: 'n2', name: 'Type/Body', type: 'TEXT' },
        { id: '3', nodeId: 'n3', name: 'Caption', type: 'TEXT' }
      ])
    ).toEqual([
      {
        folder: 'Type',
        styles: [
          { id: '1', nodeId: 'n1', name: 'Type/Heading', type: 'TEXT' },
          { id: '2', nodeId: 'n2', name: 'Type/Body', type: 'TEXT' }
        ]
      },
      { folder: null, styles: [{ id: '3', nodeId: 'n3', name: 'Caption', type: 'TEXT' }] }
    ])
    expect(sharedStyleDefaultCreateProps('text', 'Text style')).toMatchObject({
      type: 'TEXT',
      props: { sharedStyleType: 'TEXT', fontSize: 16, internalOnly: true }
    })
  })

  test('updates a text style definition and propagates to bound layers', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const created = createSharedStyleDefinition(editor, 'text', 'Heading')
    expect(created).toBeTruthy()
    if (!created) return
    const layer = editor.graph.createNode('TEXT', pageId, {
      fontSize: 16,
      textStyleId: created.styleId
    })
    updateSharedStyleDefinition(editor, created.node.id, { fontSize: 32, fontWeight: 700 })
    expect(editor.graph.getNode(created.node.id)).toMatchObject({ fontSize: 32, fontWeight: 700 })
    expect(editor.graph.getNode(layer.id)).toMatchObject({
      fontSize: 32,
      fontWeight: 700,
      textStyleId: created.styleId
    })

    deleteSharedStyleDefinition(editor, created.node.id)
    expect(editor.graph.getNode(created.node.id)).toBeUndefined()
    expect(editor.graph.getNode(layer.id)).toMatchObject({ textStyleId: null, fontSize: 32 })
  })
})
