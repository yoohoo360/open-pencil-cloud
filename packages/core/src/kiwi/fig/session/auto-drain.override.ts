import type { SceneGraph } from '@open-pencil/scene-graph'

import {
  hasReaderSession,
  isReaderPagePending,
  recoverReaderPage
} from '#core/kiwi/fig/session/document-state'

const draining = new WeakSet<SceneGraph>()

function yieldBetween(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 48 })
      return
    }
    setTimeout(resolve, 0)
  })
}

/**
 * After a priority `populate: 'all'` open, finish unread pages without blocking
 * the open critical path. One page per idle slice.
 */
export function scheduleFigAutoDrain(graph: SceneGraph): void {
  if (draining.has(graph) || !hasReaderSession(graph)) return
  draining.add(graph)
  void (async () => {
    try {
      for (;;) {
        const pending = graph.getPages().find((page) => isReaderPagePending(graph, page.id))
        if (!pending) break
        recoverReaderPage(graph, pending.id)
        await yieldBetween()
      }
    } finally {
      draining.delete(graph)
    }
  })()
}
