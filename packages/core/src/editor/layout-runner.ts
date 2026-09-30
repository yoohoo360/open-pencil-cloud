import {
  collectSceneMutation,
  mutationLayoutScopeIds,
  type SceneGraph,
  type SceneMutationImpact
} from '@open-pencil/scene-graph'

import { computeAllLayouts, computeLayout } from '#core/layout'

type LayoutRunnerOptions = {
  getGraph: () => SceneGraph
  /** Called once after a silent layout pass so callers can invalidate + requestRender. */
  afterSilentLayout?: () => void
}

export function createLayoutRunner(
  getGraphOrOptions: (() => SceneGraph) | LayoutRunnerOptions
) {
  const getGraph =
    typeof getGraphOrOptions === 'function' ? getGraphOrOptions : getGraphOrOptions.getGraph
  const afterSilentLayout =
    typeof getGraphOrOptions === 'function' ? undefined : getGraphOrOptions.afterSilentLayout

  function runLayoutPass(run: () => void) {
    const graph = getGraph()
    graph.withLayoutMutations(() => {
      graph.runSilentMutations(run)
    })
    afterSilentLayout?.()
  }

  function runLayoutForNode(id: string) {
    const graph = getGraph()
    const node = graph.getNode(id)
    if (!node) return

    runLayoutPass(() => {
      computeAllLayouts(graph, id)

      let parent = node.parentId ? graph.getNode(node.parentId) : undefined
      while (parent) {
        if (parent.layoutMode !== 'NONE') {
          computeLayout(graph, parent.id)
        }
        parent = parent.parentId ? graph.getNode(parent.parentId) : undefined
      }
    })
  }

  function compactLayoutScope(impact: SceneMutationImpact): string[] {
    const graph = getGraph()
    const candidates = new Set(mutationLayoutScopeIds(impact).filter((id) => graph.getNode(id)))
    return [...candidates].filter((id) => {
      let parentId = graph.getNode(id)?.parentId ?? null
      while (parentId) {
        if (candidates.has(parentId)) return false
        parentId = graph.getNode(parentId)?.parentId ?? null
      }
      return true
    })
  }

  async function runMutationWithLayout<T>(
    operation: () => T | Promise<T>,
    fallbackId?: string,
    beforeLayout?: (result: T) => Promise<void> | void
  ): Promise<T> {
    const graph = getGraph()
    const { result, impact } = await collectSceneMutation(graph, operation)
    await beforeLayout?.(result)
    const scopeIds = compactLayoutScope(impact)
    if (scopeIds.length > 0) {
      for (const id of scopeIds) runLayoutForNode(id)
    } else if (fallbackId) {
      runLayoutPass(() => {
        computeAllLayouts(graph, fallbackId)
      })
    }
    return result
  }

  return { runLayoutForNode, runMutationWithLayout }
}
