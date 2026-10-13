import { createAgent } from 'langchain'

import { byokModelMiddleware } from '../byok.ts'
import { systemPromptMiddleware } from '../prompt.ts'
import { skillsContextMiddleware } from '../skills.ts'
import { designHeadlessTools } from '../tools/design-headless.ts'

/**
 * Design / Edit agent with headless canvas tools (executed in the browser).
 * Full system prompt, scene context, skills, and BYOK come via run `configurable`.
 */
export const graph = createAgent({
  model: 'openai:gpt-4o-mini',
  tools: [...designHeadlessTools],
  middleware: [byokModelMiddleware, systemPromptMiddleware, skillsContextMiddleware],
  systemPrompt: `You are the OpenPencil design agent.
Workflow: plan briefly → build with canvas tools → verify with describe → fix → next section.
Keep each render under ~40 elements. Prefer calc for layout arithmetic.
When skills are provided, follow them.`
})
