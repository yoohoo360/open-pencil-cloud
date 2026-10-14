import { parseFigmaClipboard, parseOpenPencilClipboard } from '@open-pencil/core/clipboard'
import { computeAllLayouts } from '@open-pencil/core/layout'
import { CORE_TOOLS, toolChangesDocument, type ToolDef } from '@open-pencil/core/tools'
import { pruneUnmountedNodes } from '@open-pencil/scene-graph'
import { toStandardJsonSchema as toStandardJSONSchema } from '@valibot/to-json-schema'

import type { EditorStore } from '#react/app/editor/store'
import { makeFigmaFromStore } from '#react/app/ai/chat/figma'
import {
  DISCOVER_TOOLS,
  ENABLE_TOOLS,
  INSERT_SKILL_TEMPLATE,
  LIST_SKILL_TEMPLATES,
  META_TOOL_NAMES,
  READ_TOOL_OUTPUT,
  STATIC_DESIGN_TOOL_NAMES,
  type DesignToolSession,
  visibleDesignToolNames
} from '#react/app/ai/chat/tools-catalog'

export {
  DISCOVER_TOOLS,
  ENABLE_TOOLS,
  INSERT_SKILL_TEMPLATE,
  LIST_SKILL_TEMPLATES,
  READ_TOOL_OUTPUT,
  STATIC_DESIGN_TOOL_NAMES,
  createDesignToolSession,
  type DesignToolSession
} from '#react/app/ai/chat/tools-catalog'

export const MAX_AGENT_STEPS = 50

/** Stash large tool JSON so the model can page it instead of filling context. */
const TOOL_OUTPUT_STASH_CHARS = 6_000
const toolOutputStore = new Map<string, string>()
let toolOutputSeq = 0

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

function inputToOpenAIParameters(def: ToolDef): OpenAIFunctionTool['function']['parameters'] {
  const schema = toStandardJSONSchema(def.input) as {
    type?: string
    properties?: Record<string, Record<string, unknown>>
    required?: string[]
  }
  return {
    type: 'object',
    properties: schema.properties ?? {},
    required: schema.required ?? []
  }
}

function metaToolsAsOpenAI(): OpenAIFunctionTool[] {
  return [
    {
      type: 'function',
      function: {
        name: DISCOVER_TOOLS,
        description:
          'List canvas tools not yet loaded (name + short description). Call before enable_tools when you need a capability outside the default set.',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: ENABLE_TOOLS,
        description:
          'Load additional canvas tools by name for the rest of this turn. Names come from discover_tools.',
        parameters: {
          type: 'object',
          properties: {
            names: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tool names to enable'
            }
          },
          required: ['names']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: READ_TOOL_OUTPUT,
        description:
          'Read a previously stashed large tool output by id. Prefer offset near the end for errors.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Stash id from a prior tool result' },
            offset: {
              type: 'number',
              description: 'Byte/char offset (default 0). Negative counts from end.'
            },
            limit: {
              type: 'number',
              description: 'Max characters to return (default 4000)'
            }
          },
          required: ['id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: LIST_SKILL_TEMPLATES,
        description:
          'List design clipboard templates from loaded skills (id + summary). Use before insert_skill_template.',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: INSERT_SKILL_TEMPLATE,
        description:
          'REQUIRED first when loaded skills include Figma/OpenPencil clipboard templates: paste that template onto the canvas as real nodes. Returns created root ids — then modify those ids with batch_update / set_* / describe. Never rebuild the same UI with render while templates remain unused.',
        parameters: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description:
                'Exact template id from the Skill design templates list (e.g. my-skill/0). Required.'
            },
            parent_id: {
              type: 'string',
              description: 'Optional parent frame/page id to paste into (default: current paste target)'
            }
          },
          required: ['template_id']
        }
      }
    }
  ]
}

export function designToolsAsOpenAI(session?: DesignToolSession): OpenAIFunctionTool[] {
  const visible = new Set(
    visibleDesignToolNames(
      CORE_TOOLS.map((def) => def.name),
      session
    )
  )
  const defs = CORE_TOOLS.filter((def) => visible.has(def.name))
  const core = defs.map((def) => ({
    type: 'function' as const,
    function: {
      name: def.name,
      description: def.description,
      parameters: inputToOpenAIParameters(def)
    }
  }))
  const meta = metaToolsAsOpenAI()
  // When skill clipboard templates exist, surface insert/list first so the model picks them.
  if (session && session.templates.size > 0) {
    const templateTools = meta.filter(
      (tool) =>
        tool.function.name === INSERT_SKILL_TEMPLATE || tool.function.name === LIST_SKILL_TEMPLATES
    )
    const otherMeta = meta.filter(
      (tool) =>
        tool.function.name !== INSERT_SKILL_TEMPLATE && tool.function.name !== LIST_SKILL_TEMPLATES
    )
    return [...templateTools, ...core, ...otherMeta]
  }
  return [...core, ...meta]
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

function stashIfLarge(payload: unknown): unknown {
  const text = JSON.stringify(payload ?? null)
  if (text.length <= TOOL_OUTPUT_STASH_CHARS) return payload
  toolOutputSeq += 1
  const id = `tool-out-${toolOutputSeq}`
  toolOutputStore.set(id, text)
  return {
    stashed: true,
    id,
    chars: text.length,
    preview: text.slice(0, 800),
    hint: 'Call read_tool_output with id; use negative offset to read the end.'
  }
}

function readStashedOutput(args: Record<string, unknown>): unknown {
  const id = typeof args.id === 'string' ? args.id : ''
  const stored = toolOutputStore.get(id)
  if (!stored) return { error: `Unknown stash id: ${id}` }
  const limit =
    typeof args.limit === 'number' && Number.isFinite(args.limit)
      ? Math.min(Math.max(1, Math.floor(args.limit)), 20_000)
      : 4_000
  let offset =
    typeof args.offset === 'number' && Number.isFinite(args.offset)
      ? Math.floor(args.offset)
      : 0
  if (offset < 0) offset = Math.max(0, stored.length + offset)
  const slice = stored.slice(offset, offset + limit)
  return {
    id,
    offset,
    limit,
    total: stored.length,
    content: slice,
    done: offset + slice.length >= stored.length
  }
}

function runMetaTool(
  session: DesignToolSession,
  name: string,
  args: Record<string, unknown>
): { ok: true; result: unknown } | { ok: false; error: string } {
  if (name === DISCOVER_TOOLS) {
    const catalog = CORE_TOOLS.filter(
      (def) => !STATIC_DESIGN_TOOL_NAMES.has(def.name) && !session.enabled.has(def.name)
    ).map((def) => ({ name: def.name, description: def.description }))
    return {
      ok: true,
      result: {
        available: catalog,
        alreadyLoaded: [...STATIC_DESIGN_TOOL_NAMES, ...session.enabled]
      }
    }
  }
  if (name === ENABLE_TOOLS) {
    const names = Array.isArray(args.names)
      ? args.names.filter((item): item is string => typeof item === 'string')
      : []
    const known = new Set(CORE_TOOLS.map((def) => def.name))
    const enabled: string[] = []
    const unknown: string[] = []
    for (const toolName of names) {
      if (!known.has(toolName) || META_TOOL_NAMES.has(toolName)) {
        unknown.push(toolName)
        continue
      }
      session.enabled.add(toolName)
      enabled.push(toolName)
    }
    return { ok: true, result: { enabled, unknown } }
  }
  if (name === READ_TOOL_OUTPUT) {
    return { ok: true, result: readStashedOutput(args) }
  }
  if (name === LIST_SKILL_TEMPLATES) {
    return {
      ok: true,
      result: {
        templates: [...session.templates.values()].map((template) => ({
          id: template.id,
          skillKey: template.skillKey,
          label: template.label,
          summary: template.summary
        }))
      }
    }
  }
  return { ok: false, error: `Unknown meta tool: ${name}` }
}

async function decodeSkillTemplateXML(
  xml: string
): Promise<{ kind: 'openpencil' | 'figma' } | { error: string }> {
  const openPencil = parseOpenPencilClipboard(xml)
  if (openPencil) {
    if (openPencil.nodes.length === 0) {
      return { error: 'OpenPencil clipboard decoded but contains no nodes.' }
    }
    return { kind: 'openpencil' }
  }
  try {
    const figma = await parseFigmaClipboard(xml)
    if (figma && figma.nodes.length > 0) return { kind: 'figma' }
  } catch (error) {
    return {
      error: `Figma clipboard decode failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  return {
    error:
      'Could not decode template XML as OpenPencil or Figma clipboard. Re-paste the design clipboard into the skill as a figma-xml / openpencil-xml fence.'
  }
}

async function insertSkillTemplate(
  store: EditorStore,
  session: DesignToolSession,
  args: Record<string, unknown>
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  const templateId = typeof args.template_id === 'string' ? args.template_id.trim() : ''
  if (!templateId) return { ok: false, error: 'template_id is required' }
  const template = session.templates.get(templateId)
  if (!template) {
    const known = [...session.templates.keys()]
    return {
      ok: false,
      error:
        known.length === 0
          ? `Unknown template_id "${templateId}". No skill design templates are loaded.`
          : `Unknown template_id "${templateId}". Known: ${known.join(', ')}`
    }
  }

  const decoded = await decodeSkillTemplateXML(template.xml)
  if ('error' in decoded) return { ok: false, error: decoded.error }

  const parentId = typeof args.parent_id === 'string' ? args.parent_id.trim() : ''
  const previousEntered = store.state.enteredContainerId
  if (parentId && store.graph.getNode(parentId)) {
    store.state.enteredContainerId = parentId
  }

  const beforeSnapshot = store.snapshotPage()
  const beforeSelection = [...store.state.selectedIds].sort().join('\0')
  try {
    await store.pasteFromHTML(template.xml)
    computeAllLayouts(store.graph, store.state.currentPageId)
    store.requestRender()
    const created = [...store.state.selectedIds]
    const afterSelection = [...created].sort().join('\0')
    if (
      created.length === 0 ||
      (afterSelection === beforeSelection && beforeSelection.length > 0)
    ) {
      return {
        ok: false,
        error: `Paste of ${decoded.kind} template "${template.id}" produced no new nodes. Check the clipboard XML in the skill.`
      }
    }
    const after = store.snapshotPage()
    store.pushUndoEntry({
      label: `AI: ${INSERT_SKILL_TEMPLATE}`,
      forward: () => store.restorePageFromSnapshot(after),
      inverse: () => store.restorePageFromSnapshot(beforeSnapshot)
    })
    store.renderer?.aiClearActive()
    store.renderer?.aiFlashDone(created)
    store.notify()
    session.insertedTemplateIds.add(template.id)
    return {
      ok: true,
      result: {
        template_id: template.id,
        kind: decoded.kind,
        label: template.label,
        summary: template.summary,
        created,
        hint: 'Modify these ids with batch_update / set_text / set_fill / describe. Do not recreate the template with render.'
      }
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    store.state.enteredContainerId = previousEntered
  }
}

/**
 * After an AI prototype turn, drop nodes that are not reachable from the
 * document root so detached leftovers do not accumulate.
 */
export function pruneUnmountedAfterAiTurn(store: EditorStore): string[] {
  const deleted = pruneUnmountedNodes(store.graph)
  if (deleted.length === 0) return deleted
  computeAllLayouts(store.graph, store.state.currentPageId)
  store.requestRender()
  store.notify()
  return deleted
}

export async function executeDesignTool(
  store: EditorStore,
  name: string,
  args: Record<string, unknown>,
  session?: DesignToolSession
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  if (name === INSERT_SKILL_TEMPLATE) {
    if (!session) return { ok: false, error: `Tool session required for ${name}` }
    return insertSkillTemplate(store, session, args)
  }
  if (META_TOOL_NAMES.has(name)) {
    if (!session) return { ok: false, error: `Tool session required for ${name}` }
    return runMetaTool(session, name, args)
  }

  const def = toolByName(name)
  if (!def) return { ok: false, error: `Unknown tool: ${name}` }
  if (
    session &&
    !STATIC_DESIGN_TOOL_NAMES.has(name) &&
    !session.enabled.has(name)
  ) {
    return {
      ok: false,
      error: `Tool "${name}" is not loaded. Call discover_tools then enable_tools with that name.`
    }
  }

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
      const selected = figma.currentPage.selection
        .map((node) => node.id)
        .filter((id) => id.length > 0)
      store.select(selected)
      store.notify()
    }
    return { ok: true, result: stashIfLarge(result) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
