import { tool } from 'langchain/tools'
import { z } from 'zod'

/**
 * Schema-only design tools. The browser implements them via
 * `tool.implement(...)` + `useStream({ tools })` → EditorStore.
 */
const emptyObject = z.object({})

export const getSelectionTool = tool({
  name: 'get_selection',
  description: 'Get the currently selected layers on the canvas.',
  schema: emptyObject
})

export const getNodeTool = tool({
  name: 'get_node',
  description: 'Get a node by id with optional depth for children.',
  schema: z.object({
    id: z.string().describe('Node id'),
    depth: z.number().optional().describe('Child depth')
  })
})

export const findNodesTool = tool({
  name: 'find_nodes',
  description: 'Find nodes by name, type, or other filters.',
  schema: z.object({
    query: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    limit: z.number().optional()
  })
})

export const renderTool = tool({
  name: 'render',
  description:
    'Render OpenPencil JSX to design nodes. One root element per call. Use replace_id to replace a placeholder.',
  schema: z.object({
    jsx: z.string().describe('JSX string to render'),
    replace_id: z.string().optional(),
    parent_id: z.string().optional(),
    insert_index: z.number().optional(),
    x: z.number().optional(),
    y: z.number().optional()
  })
})

export const updateNodeTool = tool({
  name: 'update_node',
  description: 'Update properties on an existing node.',
  schema: z.object({
    id: z.string(),
    props: z.record(z.string(), z.unknown()).optional()
  })
})

export const setLayoutTool = tool({
  name: 'set_layout',
  description: 'Set auto-layout on a frame (flex direction, gap, padding, justify, items).',
  schema: z.object({
    id: z.string(),
    flex: z.enum(['row', 'col']).optional(),
    gap: z.number().optional(),
    padding: z.number().optional(),
    justify: z.string().optional(),
    items: z.string().optional()
  })
})

export const setLayoutChildTool = tool({
  name: 'set_layout_child',
  description: 'Set layout child sizing (fill, hug, grow) on a node.',
  schema: z.object({
    id: z.string(),
    w: z.union([z.string(), z.number()]).optional(),
    h: z.union([z.string(), z.number()]).optional(),
    grow: z.number().optional()
  })
})

export const setTextTool = tool({
  name: 'set_text',
  description: 'Set text content on a text node.',
  schema: z.object({
    id: z.string(),
    characters: z.string()
  })
})

export const setFillTool = tool({
  name: 'set_fill',
  description: 'Set solid fill color on a node (hex).',
  schema: z.object({
    id: z.string(),
    color: z.string()
  })
})

export const setRadiusTool = tool({
  name: 'set_radius',
  description: 'Set corner radius on a node.',
  schema: z.object({
    id: z.string(),
    radius: z.number()
  })
})

export const describeTool = tool({
  name: 'describe',
  description:
    'Semantic description of one or more nodes for layout verification. Prefer after each content render.',
  schema: z.object({
    id: z.string().optional(),
    ids: z.array(z.string()).optional(),
    depth: z.number().optional(),
    grid: z.number().optional()
  })
})

export const calcTool = tool({
  name: 'calc',
  description: 'Evaluate layout arithmetic. Pass a string or JSON array of expressions.',
  schema: z.object({
    expr: z.string()
  })
})

export const deleteNodeTool = tool({
  name: 'delete_node',
  description: 'Delete a node by id.',
  schema: z.object({
    id: z.string()
  })
})

export const stockPhotoTool = tool({
  name: 'stock_photo',
  description: 'Place Pexels stock photos on leaf shapes (JSON array of requests).',
  schema: z.object({
    requests: z.string().describe('JSON array of stock photo requests')
  })
})

export const discoverToolsTool = tool({
  name: 'discover_tools',
  description: 'List canvas tools not yet loaded. Call before enable_tools.',
  schema: emptyObject
})

export const enableToolsTool = tool({
  name: 'enable_tools',
  description: 'Load additional canvas tools by name for the rest of this turn.',
  schema: z.object({
    names: z.array(z.string())
  })
})

export const readToolOutputTool = tool({
  name: 'read_tool_output',
  description: 'Read a previously stashed large tool output by id.',
  schema: z.object({
    id: z.string(),
    offset: z.number().optional(),
    limit: z.number().optional()
  })
})

/** Tools registered on the design LangGraph agent (headless / client-executed). */
export const designHeadlessTools = [
  getSelectionTool,
  getNodeTool,
  findNodesTool,
  renderTool,
  updateNodeTool,
  setLayoutTool,
  setLayoutChildTool,
  setTextTool,
  setFillTool,
  setRadiusTool,
  describeTool,
  calcTool,
  deleteNodeTool,
  stockPhotoTool,
  discoverToolsTool,
  enableToolsTool,
  readToolOutputTool
] as const

export type DesignHeadlessTool = (typeof designHeadlessTools)[number]
