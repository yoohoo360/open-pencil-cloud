/**
 * Always exposed — covers most design turns without loading the full catalog.
 * Prefer `batch_update` / `calc` / `stock_photo` batches over many tiny writes.
 */
export const STATIC_DESIGN_TOOL_NAMES = new Set([
  'get_selection',
  'get_node',
  'find_nodes',
  'render',
  'update_node',
  'set_layout',
  'set_layout_child',
  'set_text',
  'set_fill',
  'set_radius',
  'describe',
  'calc',
  'delete_node',
  'stock_photo',
  'batch_update',
  'eval'
])

export const DISCOVER_TOOLS = 'discover_tools'
export const ENABLE_TOOLS = 'enable_tools'
export const READ_TOOL_OUTPUT = 'read_tool_output'

export const META_TOOL_NAMES = new Set([DISCOVER_TOOLS, ENABLE_TOOLS, READ_TOOL_OUTPUT])

export type DesignToolSession = {
  /** Extra CORE_TOOLS names enabled after discover/enable. */
  enabled: Set<string>
}

export function createDesignToolSession(): DesignToolSession {
  return { enabled: new Set() }
}

/** Which tool names should appear in the OpenAI `tools` array for this session. */
export function visibleDesignToolNames(
  allNames: readonly string[],
  session?: DesignToolSession
): string[] {
  const enabled = session?.enabled ?? new Set<string>()
  return allNames.filter(
    (name) => STATIC_DESIGN_TOOL_NAMES.has(name) || enabled.has(name)
  )
}
