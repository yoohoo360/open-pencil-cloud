import type { EditorStore } from '#react/app/editor/store'
import {
  DISCOVER_TOOLS,
  ENABLE_TOOLS,
  READ_TOOL_OUTPUT,
  STATIC_DESIGN_TOOL_NAMES,
  createDesignToolSession,
  executeDesignTool
} from '#react/app/ai/chat/tools'

/** Names must match headless tools registered on the Agent Server `design` graph. */
const DESIGN_HEADLESS_TOOL_NAMES = [
  ...STATIC_DESIGN_TOOL_NAMES,
  DISCOVER_TOOLS,
  ENABLE_TOOLS,
  READ_TOOL_OUTPUT
] as const

/**
 * Client implementations for Agent Server headless design tools.
 * Shape matches LangGraph SDK `HeadlessToolImplementation` (name + execute only).
 */
export function createDesignHeadlessImplementations(store: EditorStore) {
  const session = createDesignToolSession()

  return DESIGN_HEADLESS_TOOL_NAMES.map((name) => ({
    tool: { name },
    execute: async (args: Record<string, unknown>) => {
      const executed = await executeDesignTool(store, name, args ?? {}, session)
      if (!executed.ok) {
        throw new Error(executed.error)
      }
      return executed.result ?? null
    }
  }))
}
