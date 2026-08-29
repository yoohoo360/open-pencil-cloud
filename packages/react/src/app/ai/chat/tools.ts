import { computeAllLayouts } from '@open-pencil/core/layout'
import { CORE_TOOLS, toolChangesDocument, type ParamDef, type ToolDef } from '@open-pencil/core/tools'

import type { EditorStore } from '#react/app/editor/store'
import { makeFigmaFromStore } from '#react/app/ai/chat/figma'

export const MAX_AGENT_STEPS = 50

export type OpenAIFunctionTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, Record<string, unknown>>
      required: string[]
    }
  }
}

function paramToJsonSchema(param: ParamDef): Record<string, unknown> {
  if (param.type === 'string[]') {
    return {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      description: param.description
    }
  }
  if (param.type === 'number') {
    return {
      type: 'number',
      description: param.description,
      ...(param.min !== undefined ? { minimum: param.min } : {}),
      ...(param.max !== undefined ? { maximum: param.max } : {})
    }
  }
  if (param.type === 'boolean') {
    return { type: 'boolean', description: param.description }
  }
  return {
    type: 'string',
    description: param.type === 'color' ? `${param.description} (hex like #ff0000)` : param.description,
    ...(param.enum ? { enum: param.enum } : {})
  }
}

export function designToolsAsOpenAI(): OpenAIFunctionTool[] {
  return CORE_TOOLS.map((def) => {
    const properties: Record<string, Record<string, unknown>> = {}
    const required: string[] = []
    for (const [key, param] of Object.entries(def.params)) {
      properties[key] = paramToJsonSchema(param)
      if (param.required) required.push(key)
    }
    return {
      type: 'function' as const,
      function: {
        name: def.name,
        description: def.description,
        parameters: {
          type: 'object' as const,
          properties,
          required
        }
      }
    }
  })
}

function extractNodeIds(result: unknown): string[] {
  if (!result || typeof result !== 'object') return []
  const ids: string[] = []
  if ('id' in result && typeof result.id === 'string') ids.push(result.id)
  if ('deleted' in result && typeof result.deleted === 'string') return []
  if ('selection' in result && Array.isArray(result.selection)) {
    for (const item of result.selection) {
      if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        ids.push(item.id)
      }
    }
  }
  if ('results' in result && Array.isArray(result.results)) {
    for (const item of result.results) {
      if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        ids.push(item.id)
      }
    }
  }
  return ids
}

function toolByName(name: string): ToolDef | undefined {
  return CORE_TOOLS.find((tool) => tool.name === name)
}

export async function executeDesignTool(
  store: EditorStore,
  name: string,
  args: Record<string, unknown>
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  const def = toolByName(name)
  if (!def) return { ok: false, error: `Unknown tool: ${name}` }

  const mutates = toolChangesDocument(def)
  const beforeSnapshot = mutates ? store.snapshotPage() : null

  try {
    const figma = makeFigmaFromStore(store)
    const result = await def.execute(figma, args)
    if (mutates) {
      computeAllLayouts(store.graph, store.state.currentPageId)
      store.requestRender()
      if (beforeSnapshot) {
        const before = beforeSnapshot
        const after = store.snapshotPage()
        store.pushUndoEntry({
          label: `AI: ${def.name}`,
          forward: () => store.restorePageFromSnapshot(after),
          inverse: () => store.restorePageFromSnapshot(before)
        })
      }
      const ids = extractNodeIds(result)
      store.renderer?.aiClearActive()
      if (ids.length > 0) store.renderer?.aiFlashDone(ids)
      store.setSelectedIds(
        new Set(figma.currentPage.selection.map((node) => node.id).filter((id) => id.length > 0))
      )
      store.notify()
    }
    return { ok: true, result }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
