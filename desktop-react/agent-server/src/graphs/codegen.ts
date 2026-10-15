import { createAgent } from 'langchain'

import { byokModelMiddleware } from '../byok.ts'
import { systemPromptMiddleware } from '../prompt.ts'
import { skillsContextMiddleware } from '../skills.ts'

/**
 * Dev / Make codegen agent.
 * Full system prompt, scene context, skills, and BYOK come via run `configurable`.
 */
export const graph = createAgent({
  model: 'openai:gpt-4o-mini',
  middleware: [byokModelMiddleware, systemPromptMiddleware, skillsContextMiddleware],
  systemPrompt: `You are the OpenPencil codegen agent.
Produce clear plans and fenced source for the user's selection or Make project.
Prefer independent file tasks that can run in parallel without writing the same path twice.
When skills are provided, follow them.
Do not invent package-lock.json.`
})
