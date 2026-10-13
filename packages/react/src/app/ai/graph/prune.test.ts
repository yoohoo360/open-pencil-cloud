import { describe, expect, test } from 'bun:test'

import { SceneGraph, findUnmountedNodeIds, pruneUnmountedNodes } from '@open-pencil/scene-graph'

function pageId(graph: SceneGraph) {
  return graph.getPages()[0].id
}

function rect(graph: SceneGraph, name: string) {
  return graph.createNode('RECTANGLE', pageId(graph), { name, width: 50, height: 50 }).id
}

describe('pruneUnmountedNodes', () => {
  test('leaves a normal page tree untouched', () => {
    const graph = new SceneGraph()
    rect(graph, 'A')
    expect(findUnmountedNodeIds(graph)).toEqual([])
    expect(pruneUnmountedNodes(graph)).toEqual([])
  })

  test('removes nodes created with a null parent', () => {
    const graph = new SceneGraph()
    const mounted = rect(graph, 'Keep')
    const orphan = graph.createNodeWithId('orphan:1', 'RECTANGLE', null, { name: 'Loose' })
    const child = graph.createNodeWithId('orphan:2', 'RECTANGLE', orphan.id, {
      name: 'Loose child'
    })

    expect(findUnmountedNodeIds(graph).sort()).toEqual([child.id, orphan.id].sort())
    const deleted = pruneUnmountedNodes(graph)
    expect(deleted.sort()).toEqual([child.id, orphan.id].sort())
    expect(graph.getNode(mounted)).toBeDefined()
    expect(graph.getNode(orphan.id)).toBeUndefined()
    expect(graph.getNode(child.id)).toBeUndefined()
  })

  test('removes nodes dropped from a parent childIds list', () => {
    const graph = new SceneGraph()
    const page = pageId(graph)
    const frame = graph.createNode('FRAME', page, { name: 'Frame' })
    const stray = graph.createNode('RECTANGLE', frame.id, { name: 'Stray' })
    frame.childIds = frame.childIds.filter((id) => id !== stray.id)

    expect(findUnmountedNodeIds(graph)).toEqual([stray.id])
    expect(pruneUnmountedNodes(graph)).toEqual([stray.id])
    expect(graph.getNode(stray.id)).toBeUndefined()
    expect(graph.getNode(frame.id)).toBeDefined()
  })
})
