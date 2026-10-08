import { createHostedComponentContext } from '#react/hosted-components/context'
import { matchHostedComponent } from '#react/hosted-components/match'
import { listHostedComponents } from '#react/hosted-components/registry'

import type { Editor } from '@open-pencil/core/editor'

export function hydrateHostedInstance(editor: Editor, hostId: string): void {
  const host = editor.graph.getNode(hostId)
  if (!host) return
  const def = matchHostedComponent(host, editor.graph)
  if (!def || host.type !== 'INSTANCE') return
  def.hydrate(createHostedComponentContext(editor), hostId)
}

export function hydrateHostedInstances(editor: Editor): void {
  if (listHostedComponents().length === 0) return
  for (const node of editor.graph.getAllNodes()) {
    if (node.type !== 'INSTANCE') continue
    if (!matchHostedComponent(node, editor.graph)) continue
    hydrateHostedInstance(editor, node.id)
  }
}
