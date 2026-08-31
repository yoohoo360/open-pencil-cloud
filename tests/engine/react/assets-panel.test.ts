import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core/editor'
import { SceneGraph } from '@open-pencil/scene-graph'

import { expectDefined } from '#tests/helpers/assert'

import {
  assetInsertionPoint,
  filterAssets,
  groupAssets,
  listAssetLibraries,
  listAssets,
  listLocalAssets
} from '../../../packages/react/src/components/assets-panel/assets'
import { findAssetPage } from '../../../packages/react/src/components/assets-panel/page'
import { createInstanceFromComponent } from '../../../packages/react/src/graph/instances'
import { addLib, getLib } from '../../../packages/react/src/graph/remote-lib'

describe('findAssetPage', () => {
  test('walks to the owning canvas', () => {
    const editor = createEditor()
    const page = editor.graph.getPages()[0]
    const frame = editor.graph.createNode('FRAME', page.id)
    const component = editor.graph.createNode('COMPONENT', frame.id, { name: 'Card' })
    expect(findAssetPage(component, editor.graph)?.id).toBe(page.id)
  })
})

describe('listLocalAssets', () => {
  test('groups component sets and hides nested variants', () => {
    const editor = createEditor()
    const page = editor.graph.getPages()[0]
    const set = editor.graph.createNode('COMPONENT_SET', page.id, {
      name: 'Button',
      sourceLibraryKey: 'lk-test',
      symbolDescription: 'Reusable button',
      symbolLinks: [{ uri: 'https://example.com/button', displayName: 'Docs' }],
      componentPropertyDefinitions: [
        {
          id: 'prop:type',
          name: 'Type',
          type: 'VARIANT',
          defaultValue: 'Secondary',
          variantOptions: ['Primary', 'Secondary']
        }
      ]
    })
    const primary = editor.graph.createNode('COMPONENT', set.id, {
      name: 'Type=Primary',
      x: 0,
      componentPropertyValues: { Type: 'Primary' }
    })
    editor.graph.createNode('COMPONENT', set.id, {
      name: 'Type=Secondary',
      x: 120,
      width: 132,
      componentPropertyValues: { Type: 'Secondary' }
    })
    editor.graph.createNode('COMPONENT', set.id, {
      name: 'Type=Secondary duplicate',
      componentPropertyValues: { Type: 'Secondary' }
    })
    const card = editor.graph.createNode('COMPONENT', page.id, { name: 'Card' })

    const assets = listLocalAssets(editor, 'Page')
    expect(assets.map((asset) => asset.name)).toEqual(['Button', 'Card'])
    const button = assets.find((asset) => asset.id === set.id)
    expect(button?.componentId).toBe(primary.id)
    expect(button?.variantCount).toBe(3)
    expect(button?.hasConflicts).toBe(true)
    expect(button?.sourceLibraryKey).toBe('lk-test')
    expect(button?.description).toBe('Reusable button')
    expect(button?.docsURL).toBe('https://example.com/button')
    expect(button?.variants[0]).toEqual({ name: 'Type', values: ['Primary', 'Secondary'] })
    expect(assets.find((asset) => asset.id === card.id)?.componentId).toBe(card.id)
  })

  test('filters and groups by page name', () => {
    const editor = createEditor()
    const page = editor.graph.getPages()[0]
    const second = editor.graph.addPage('Components')
    editor.graph.createNode('COMPONENT', page.id, { name: 'Card' })
    editor.graph.createNode('COMPONENT', second.id, { name: 'Toolbar button' })

    const assets = listLocalAssets(editor, 'Page')
    const filtered = filterAssets(assets, 'card')
    expect(filtered.map((asset) => asset.name)).toEqual(['Card'])
    expect(filterAssets(assets, 'missing')).toEqual([])
    expect(groupAssets(assets).map((group) => group.pageName)).toEqual(['Components', page.name])
  })
})

describe('listAssetLibraries', () => {
  test('starts with the local file and appended remote libs', () => {
    const editor = createEditor()
    const lib = new SceneGraph()
    const page = lib.getPages()[0]
    lib.createNode('COMPONENT', page.id, { name: 'Remote card' })
    addLib(editor.graph, 'web_lib', 'Web lib', '/libs/web.fig', lib)

    expect(listAssetLibraries(editor.graph, 'Created in this file')).toEqual([
      { key: 'default', name: 'Created in this file', remote: false },
      { key: 'builtin', name: 'Built-in', remote: true },
      { key: 'web_lib', name: 'Web lib', remote: true }
    ])
    const remote = getLib(editor.graph, 'web_lib')
    expect(remote?.name).toBe('Web lib')
    const remapped = expectDefined(
      [...(remote?.graph.nodes.values() ?? [])].find((node) => node.type === 'COMPONENT'),
      'remapped component'
    )
    expect(remapped.id.startsWith('web_lib:')).toBe(true)
    expect(
      listAssets(editor, remote?.graph ?? editor.graph, 'Page').map((asset) => asset.name)
    ).toEqual(['Remote card'])
    const instanceId = expectDefined(
      createInstanceFromComponent(
        editor,
        remapped.id,
        10,
        20,
        editor.state.currentPageId,
        'web_lib'
      ),
      'instanceId'
    )
    const instance = expectDefined(editor.graph.getNode(instanceId), 'instance')
    expect(instance.type).toBe('INSTANCE')
    expect(instance.componentId).toBe(remapped.id)
    expect(instance.sourceLibraryKey).toBe('web_lib')
  })
})

describe('assetInsertionPoint', () => {
  test('centers the instance on the canvas point in the parent', () => {
    expect(
      assetInsertionPoint({ width: 120, height: 60 }, { x: 350, y: 270 }, { x: 200, y: 150 })
    ).toEqual({ x: 90, y: 90 })
  })
})
