import { computeAllLayouts } from '@open-pencil/core/layout'

import type { EditorStore } from '@/app/editor/session'

import { createAnnouncementSection } from './announcement/section'
import { loadDemoFonts } from './fonts'
import { createPaintSection } from './paint/section'
import { createReferenceExamples } from './reference'
import { createTypographySection } from './typography/section'
import { fitDemoPagesOnFirstVisit } from './viewport'

export async function createDemoShapes(store: EditorStore) {
  const { graph } = store
  const referencePageId = store.state.currentPageId
  await store.canvasReady
  await loadDemoFonts()
  // A file opened while the canvas was loading must not receive demo content.
  if (
    store.graph !== graph ||
    store.state.currentPageId !== referencePageId ||
    graph.getPages().length !== 1 ||
    graph.getChildren(referencePageId).length > 0
  )
    return

  graph.updateNode(referencePageId, { name: 'Reference · original examples' })
  await createReferenceExamples(store)
  if (store.graph !== graph) return

  const announcements = graph.addPage('01 · Components & variables')
  const typography = graph.addPage('02 · Typography')
  const paint = graph.addPage('03 · Paint & effects')
  await createAnnouncementSection(graph, announcements.id)
  await createTypographySection(graph, typography.id)
  await createPaintSection(graph, paint.id)

  for (const page of graph.getPages()) {
    await store.loadFontsForNodes(page.childIds)
    computeAllLayouts(graph, page.id)
  }
  if (store.graph !== graph) return
  store.movePage(referencePageId, graph.getPages().length - 1)
  store.undo.clear()
  fitDemoPagesOnFirstVisit(
    store,
    graph.getPages().map((page) => page.id)
  )
  await store.switchPage(announcements.id)
  if (store.graph !== graph) return
  store.clearSelection()
  store.zoomToFit()
  store.requestRender()
}
