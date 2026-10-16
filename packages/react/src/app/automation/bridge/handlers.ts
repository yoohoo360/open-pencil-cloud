import * as v from 'valibot'

import { executeRPCCommand } from '@open-pencil/core/rpc'
import {
  ALL_TOOLS,
  isAtomicTool,
  isToolExposed,
  toolChangesDocument
} from '@open-pencil/core/tools'
import { executeAtomicTool } from '@open-pencil/core/editor'
import type { JSONObject } from '@open-pencil/scene-graph/primitives'

import { makeFigmaFromStore } from '#react/app/ai/chat/figma'
import type { EditorStore } from '#react/app/editor/store'

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function extractNodeIds(result: unknown): string[] {
  if (!result || typeof result !== 'object') return []
  const obj = result as JSONObject
  if (typeof obj.deleted === 'string') return []
  const ids: string[] = []
  if (typeof obj.id === 'string') ids.push(obj.id)
  if (Array.isArray(obj.results)) {
    for (const item of obj.results) {
      if (item && typeof item === 'object' && typeof (item as JSONObject).id === 'string') {
        ids.push((item as JSONObject).id as string)
      }
    }
  }
  return ids
}

async function handleTool(store: EditorStore, args: unknown): Promise<unknown> {
  const toolName = isUnknownRecord(args) ? args.name : undefined
  const toolArgs =
    isUnknownRecord(args) && isUnknownRecord(args.args) ? args.args : ({} as Record<string, unknown>)
  if (typeof toolName !== 'string' || !toolName) throw new Error('Missing "name" in args')

  const def = ALL_TOOLS.find((tool) => tool.name === toolName && isToolExposed(tool, 'mcp'))
  if (!def) throw new Error(`Unknown tool: ${toolName}`)

  const figma = makeFigmaFromStore(store)
  let result: unknown
  if (isAtomicTool(def)) {
    result = await executeAtomicTool(store, figma, def, toolArgs)
  } else if (def.mutates) {
    result = await def.execute(figma, toolArgs)
    if (toolChangesDocument(def)) store.requestRender()
  } else {
    result = await def.execute(figma, toolArgs)
  }

  if (def.mutates) {
    store.requestRender()
    const ids = extractNodeIds(result)
    for (const id of ids) store.renderer?.flashNode?.(id)
  }
  return { ok: true, result }
}

async function handleSelection(store: EditorStore): Promise<unknown> {
  const figma = makeFigmaFromStore(store)
  const def = ALL_TOOLS.find((tool) => tool.name === 'get_selection')
  if (!def) throw new Error('get_selection tool missing')
  const result = await def.execute(figma, {})
  return { ok: true, result }
}

async function handleRPCFallback(
  store: EditorStore,
  command: string,
  args: unknown
): Promise<unknown> {
  const result = executeRPCCommand(store.graph, command, args ?? {})
  return { ok: true, result }
}

export function createAutomationCommandHandlers() {
  return {
    async handleRequest(store: EditorStore, command: string, args: unknown): Promise<unknown> {
      if (command === 'list_documents') {
        return {
          ok: true,
          result: {
            documents: [
              {
                id: store.state.documentKey || 'active',
                name: store.state.documentName || 'Untitled',
                pageId: store.state.currentPageId
              }
            ]
          }
        }
      }
      if (command === 'agent_session_closed') return { ok: true }
      if (command === 'selection') return handleSelection(store)
      if (command === 'tool') return handleTool(store, args)
      if (command === 'get_settings') return { ok: true, result: {} }
      return handleRPCFallback(store, command, args)
    }
  }
}

/** Requests from the MCP bridge; other message types are ignored. */
export const AutomationRequestJSON = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({
    type: v.literal('request'),
    id: v.pipe(v.string(), v.nonEmpty()),
    command: v.string(),
    args: v.optional(v.unknown())
  })
)
