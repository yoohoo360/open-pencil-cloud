import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

test('editing section labels preserve dark and light label presentation', async () => {
  const sections = [
    { id: 'dark-section', y: 160, color: { r: 0.37, g: 0.37, b: 0.37, a: 1 } },
    { id: 'light-section', y: 400, color: { r: 0.92, g: 0.82, b: 0.38, a: 1 } }
  ] as const
  await editor.page.evaluate((items) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    for (const item of items) {
      store.graph.createNode('SECTION', store.state.currentPageId, {
        id: item.id,
        name: 'Components',
        x: 120,
        y: item.y,
        width: 280,
        height: 180,
        fills: [{ type: 'SOLID', color: item.color, visible: true, opacity: 1 }]
      })
    }
    store.requestRender()
  }, sections)
  await editor.canvas.waitForRender()

  const canvas = editor.page.getByTestId('canvas-element')
  const input = editor.page.getByRole('textbox', { name: 'Layer name' })
  const expected = [
    { y: 142, background: 'rgb(94, 94, 94)', foreground: 'rgb(255, 255, 255)' },
    { y: 382, background: 'rgb(235, 209, 97)', foreground: 'rgb(0, 0, 0)' }
  ]

  for (const item of expected) {
    await canvas.dblclick({ position: { x: 128, y: item.y } })
    await expect(input).toBeVisible()
    const editorPill = input.locator('xpath=../..')
    await expect(editorPill).toHaveCSS('height', '24px')
    await expect(editorPill).toHaveCSS('background-color', item.background)
    await expect(input).toHaveCSS('color', item.foreground)
    const width = await editorPill.evaluate((element) => element.getBoundingClientRect().width)
    expect(width).toBeGreaterThan(80)
    expect(width).toBeLessThan(100)
    await input.press('Escape')
    await expect(input).toBeHidden()
  }
})

test('double-clicking a section title renames it inline', async () => {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const pageId = store.state.currentPageId
    store.graph.createNode('SECTION', pageId, {
      id: 'section-inline-rename',
      name: 'Components',
      x: 120,
      y: 160,
      width: 280,
      height: 180,
      fills: [
        { type: 'SOLID', color: { r: 0.37, g: 0.37, b: 0.37, a: 1 }, visible: true, opacity: 1 }
      ]
    })
    store.requestRender()
  })
  await editor.canvas.waitForRender()

  const canvas = editor.page.getByTestId('canvas-element')
  await canvas.dblclick({ position: { x: 128, y: 142 } })
  const input = editor.page.getByRole('textbox', { name: 'Layer name' })
  await expect(input).toBeVisible()
  await expect(input).toHaveValue('Components')

  await input.fill('Primitives')
  await input.press('Enter')

  await expect(input).toBeHidden()
  await expect
    .poll(() =>
      editor.page.evaluate(
        () => window.openPencil?.getStore?.().graph.getNode('section-inline-rename')?.name
      )
    )
    .toBe('Primitives')
})
