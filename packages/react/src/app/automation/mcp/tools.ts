import { ALL_TOOLS, toolChangesDocument } from '@open-pencil/core/tools'

export type MCPToolEffect = 'read' | 'write'

export type MCPToolInfo = {
  name: string
  description: string
  effect: MCPToolEffect
}

/** Host-only MCP tools (not in `ALL_TOOLS`); keep in sync with `packages/mcp` `createToolDescriptors`. */
const MCP_HOST_TOOLS: readonly MCPToolInfo[] = [
  {
    name: 'list_documents',
    description:
      'List open OpenPencil documents/tabs with their IDs, file paths, current pages, and pages.',
    effect: 'read'
  },
  {
    name: 'save_file',
    description:
      'Save the current document to disk. An optional path must stay inside the configured MCP root.',
    effect: 'write'
  },
  {
    name: 'open_file',
    description: 'Open a .fig or .pen file from inside the configured MCP root.',
    effect: 'read'
  },
  {
    name: 'new_document',
    description:
      'Create a new empty document with an optional save path inside the configured MCP root.',
    effect: 'write'
  },
  {
    name: 'close_file',
    description:
      'Close an open document tab. With unsaved changes it fails unless unsaved is "save" or "discard".',
    effect: 'write'
  },
  {
    name: 'activate_document',
    description:
      'Bring an open document tab to the front in the app, optionally switching it to a page.',
    effect: 'read'
  },
  {
    name: 'undo',
    description: 'Undo the newest change made through MCP or the CLI in a document.',
    effect: 'write'
  },
  {
    name: 'redo',
    description: 'Redo the newest change undone through MCP or the CLI.',
    effect: 'write'
  },
  {
    name: 'get_settings',
    description: 'Read editor settings exposed to automation.',
    effect: 'read'
  },
  {
    name: 'update_settings',
    description: 'Change editor settings with a partial object shaped like get_settings output.',
    effect: 'write'
  },
  {
    name: 'get_codegen_prompt',
    description:
      'Get design-to-code generation guidelines. Call before generating frontend code.',
    effect: 'read'
  }
]

export function configurableMCPTools(): MCPToolInfo[] {
  const core = ALL_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    effect: (toolChangesDocument(tool) ? 'write' : 'read') as MCPToolEffect
  }))
  return [...core, ...MCP_HOST_TOOLS]
}
