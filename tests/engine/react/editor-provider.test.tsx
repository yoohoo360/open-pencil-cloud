import { describe, expect, test } from 'bun:test'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { createEditor } from '@open-pencil/core/editor'
import { EditorProvider, createEditorStore, useEditor, useEditorVersion } from '@open-pencil/react'

function Probe() {
  const editor = useEditor()
  const version = useEditorVersion()
  return createElement(
    'div',
    { 'data-test-id': 'react-editor-probe' },
    `${editor.state.documentName}:${version}`
  )
}

describe('@open-pencil/react EditorProvider', () => {
  test('shares the same editor instance through context', () => {
    const editor = createEditor()
    editor.state.documentName = 'ReactProbe'
    const store = createEditorStore(editor)

    const html = renderToStaticMarkup(
      createElement(EditorProvider, { store }, createElement(Probe))
    )

    expect(html).toContain('data-test-id="react-editor-probe"')
    expect(html).toContain('ReactProbe')
    expect(createEditorStore(editor)).toBe(store)
  })

  test('requestRender notifies React store version', () => {
    const editor = createEditor()
    const store = createEditorStore(editor)
    const before = store.getVersion()
    editor.requestRender()
    expect(store.getVersion()).toBeGreaterThan(before)
  })
})
