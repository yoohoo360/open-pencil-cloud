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
export const INSERT_SKILL_TEMPLATE = 'insert_skill_template'
export const LIST_SKILL_TEMPLATES = 'list_skill_templates'

export const META_TOOL_NAMES = new Set([
  DISCOVER_TOOLS,
  ENABLE_TOOLS,
  READ_TOOL_OUTPUT,
  INSERT_SKILL_TEMPLATE,
  LIST_SKILL_TEMPLATES
])

export type SkillTemplateEntry = {
  id: string
  skillKey: string
  label: string
  xml: string
  summary: string
}

export type DesignToolSession = {
  /** Extra CORE_TOOLS names enabled after discover/enable. */
  enabled: Set<string>
  /** Design-clipboard templates from loaded skills (pasteable via insert_skill_template). */
  templates: Map<string, SkillTemplateEntry>
  /** Template ids successfully pasted this turn (gates forced tool_choice). */
  insertedTemplateIds: Set<string>
}

export function createDesignToolSession(
  templates: Iterable<SkillTemplateEntry> = []
): DesignToolSession {
  const map = new Map<string, SkillTemplateEntry>()
  for (const template of templates) map.set(template.id, template)
  return { enabled: new Set(), templates: map, insertedTemplateIds: new Set() }
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
