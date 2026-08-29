import { ALL_TOOLS, toolChangesDocument } from '@open-pencil/core/tools'

export type MCPToolEffect = 'read' | 'write'

export type MCPToolInfo = {
  name: string
  description: string
  effect: MCPToolEffect
}

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
  }
]

export function configurableMCPTools(): MCPToolInfo[] {
  const core = ALL_TOOLS.filter((tool) => tool.name !== 'eval').map((tool) => ({
    name: tool.name,
    description: tool.description,
    effect: (toolChangesDocument(tool) ? 'write' : 'read') as MCPToolEffect
  }))
  return [...core, ...MCP_HOST_TOOLS]
}
