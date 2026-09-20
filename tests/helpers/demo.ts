import type { Page } from '@playwright/test'

export async function waitForDemo(page: Page) {
  await page.waitForFunction(() => {
    const store = window.openPencil?.getStore?.()
    return (
      store?.graph.getNode(store.state.currentPageId)?.name === '01 · Components & variables' &&
      store.state.preparation === null
    )
  })
}

export async function selectDemoReferencePage(page: Page) {
  await waitForDemo(page)
  await page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const reference = store.graph
      .getPages()
      .find((page) => page.name === 'Reference · original examples')
    if (!reference) throw new Error('Demo reference page not found')
    await store.switchPage(reference.id)
  })
}
