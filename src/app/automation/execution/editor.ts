import { executeAtomicTool } from '@open-pencil/core/editor'
import type { FigmaAPI } from '@open-pencil/core/figma-api'
import type { ToolDef } from '@open-pencil/core/tools'

import type { EditorStore } from '@/app/editor/active-store'
import { ensureGraphFonts } from '@/app/editor/fonts'

/** Commit first; asynchronous font availability is presentation work, not a transaction. */
export async function executeAtomicEditorTool(
  store: EditorStore,
  figma: FigmaAPI,
  def: ToolDef,
  args: Record<string, unknown>,
  options: Parameters<typeof executeAtomicTool>[4] = {}
): Promise<unknown> {
  const result = executeAtomicTool(store, figma, def, args, options)
  const targetId = typeof args.id === 'string' ? args.id : figma.currentPageId
  if (figma.graph.getNode(targetId)?.type === 'TEXT') {
    try {
      await ensureGraphFonts(figma.graph, [targetId], store.renderer)
      if (store.graph === figma.graph && options.isLive?.() !== false) {
        store.runLayoutForNode(targetId)
        store.requestRender()
      }
    } catch (error) {
      // The edit is already committed and undoable. Font failure must not report it as failed.
      console.warn('[Agent fonts]', error)
    }
  }
  return result
}
