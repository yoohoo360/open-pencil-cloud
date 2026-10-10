import { writePageSnapshot } from '#react/app/document/page-loading/idb'
import type { EditorStore } from '#react/app/editor/store'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { isLazyFigImportRootPopulated } from '#core/kiwi/fig/lazy-import.override'

function collectSubtreeNodes(graph: SceneGraph, rootId: string): SceneNode[] {
  const nodes: SceneNode[] = []
  const stack = [rootId]
  const seen = new Set<string>()
  while (stack.length > 0) {
    const id = stack.pop()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const node = graph.getNode(id)
    if (!node) continue
    nodes.push(structuredClone(node))
    for (let i = node.childIds.length - 1; i >= 0; i--) {
      stack.push(node.childIds[i])
    }
  }
  return nodes
}

export function capturePageSnapshotInput(
  store: EditorStore,
  pageId: string
): Parameters<typeof writePageSnapshot>[0] | null {
  const documentKey = store.state.documentKey?.trim()
  if (!documentKey) return null
  const page = store.graph.getNode(pageId)
  if (!page || page.type !== 'CANVAS') return null
  const nodes = collectSubtreeNodes(store.graph, pageId)
  if (nodes.length === 0) return null
  return {
    documentKey,
    pageId,
    pageName: page.name,
    sceneVersion: store.state.sceneVersion,
    nodes,
    pageChildIds: [...page.childIds]
  }
}

/** Skip captures that would clone too much on the main thread. */
const MAX_SNAPSHOT_NODES = 8_000

/**
 * Idle writer: one populated page per true-idle slice.
 * Not started from the editor store until `readPageSnapshot` is used on switch —
 * forced idle timeouts + full-page `structuredClone` contended with page switches.
 */
export function startIdlePageSnapshotWriter(store: EditorStore): () => void {
  if (typeof window === 'undefined') return () => undefined

  const written = new Set<string>()
  let cancelled = false
  let handle: number | null = null

  const schedule = () => {
    if (cancelled) return
    const ric = window.requestIdleCallback?.bind(window)
    if (ric) {
      // No timeout: never force capture while the tab is busy switching pages.
      handle = ric(tick)
    } else {
      handle = window.setTimeout(
        () => tick({ timeRemaining: () => 16, didTimeout: false }),
        2_000
      ) as unknown as number
    }
  }

  const tick = (deadline: { timeRemaining: () => number; didTimeout: boolean }) => {
    handle = null
    if (cancelled) return
    if (store.state.loading || store.state.pageLoading.visible) {
      schedule()
      return
    }
    // Need real idle time — skip forced/timeout callbacks.
    if (deadline.didTimeout || deadline.timeRemaining() < 24) {
      schedule()
      return
    }
    const documentKey = store.state.documentKey?.trim()
    if (!documentKey) {
      schedule()
      return
    }

    for (const page of store.graph.getPages()) {
      if (written.has(page.id)) continue
      if (!isLazyFigImportRootPopulated(store.graph, page.id)) continue

      const input = capturePageSnapshotInput(store, page.id)
      if (!input || input.nodes.length > MAX_SNAPSHOT_NODES) {
        written.add(page.id)
        continue
      }
      written.add(page.id)
      void writePageSnapshot(input)
      break
    }

    const pages = store.graph.getPages()
    if (pages.some((page) => !written.has(page.id))) schedule()
  }

  schedule()
  return () => {
    cancelled = true
    if (handle != null) {
      window.cancelIdleCallback?.(handle)
      window.clearTimeout(handle)
    }
  }
}
