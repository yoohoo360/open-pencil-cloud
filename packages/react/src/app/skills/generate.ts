import { throwChatHttpError } from '#react/app/ai/chat/provider-error'
import {
  chatProviderSettings,
  isChatConfigured,
  resolveChatModel,
  type ChatProviderSettings
} from '#react/app/ai/chat/settings'
import { chatCompletionsURL } from '#react/app/ai/chat/url'
import { loadSkillPackageText } from '#react/app/skills/package-load'
import type { PencilSkill } from '#react/lib/client'

const CODEGEN_SYSTEM = `You are a code generator for OpenPencil Dev mode.
Return ONLY the requested source code. No markdown fences, no commentary, no explanation.
Match the requested format exactly (Design JSX, Tailwind JSX, or HTML/CSS).
Treat the skill package (SKILL.md and references) as binding instructions for style, structure, naming, and output shape.
Design clipboard XML in the package is pre-decoded to JSON — use that structure, not raw clipboard markup.
When current code is provided, rewrite or improve it to satisfy the skill; when empty, generate from the selection context and skill.`

/** Personal working copies usable for Dev codegen (excludes team remotes). */
export function skillsForCodegen(skills: PencilSkill[]): PencilSkill[] {
  const seen = new Set<string>()
  const out: PencilSkill[] = []
  for (const skill of skills) {
    if (skill.team_id) continue
    if (seen.has(skill.id)) continue
    seen.add(skill.id)
    out.push(skill)
  }
  return out
}

export async function generateCodeWithSkill(options: {
  skill: PencilSkill
  sourceLabel: string
  baselineCode: string
  selectionSummary?: string
  signal?: AbortSignal
  settings?: ChatProviderSettings
  onPartial?: (text: string) => void
}): Promise<string> {
  const settings = options.settings ?? chatProviderSettings.get()
  if (!isChatConfigured(settings)) {
    throw new Error('Configure an AI provider in the AI panel first.')
  }
  const resolved = resolveChatModel(settings, 'high')
  if (!resolved) throw new Error('Configure at least one enabled AI model.')

  const packageText = (await loadSkillPackageText(options.skill)).trim()
  if (!packageText && options.skill.id !== 'inline-ai') {
    throw new Error('Skill package is empty. Open Skills and add SKILL.md content first.')
  }
  const userPrompt = [
    `Output format: ${options.sourceLabel}`,
    'Apply the skill package below as the primary guide for how to write the code.',
    options.selectionSummary ? `Canvas selection:\n${options.selectionSummary}` : '',
    `Current ${options.sourceLabel} code:\n\`\`\`\n${options.baselineCode || '(empty)'}\n\`\`\``,
    `Skill "${options.skill.name}" (${options.skill.skill_key}):\n${packageText || options.skill.content || '(no skill body)'}`
  ]
    .filter(Boolean)
    .join('\n\n')

  const response = await fetch(chatCompletionsURL(resolved.baseURL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolved.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: resolved.model,
      stream: true,
      temperature: 0.2,
      messages: [
        { role: 'system', content: CODEGEN_SYSTEM },
        { role: 'user', content: userPrompt }
      ]
    }),
    signal: options.signal
  })
  if (!response.ok) throwChatHttpError(response.status, await response.text())
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Streaming is unavailable.')

  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') {
        options.onPartial?.(stripCodeFences(text))
        return stripCodeFences(text)
      }
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string | null } }>
        }
        const chunk = parsed.choices?.[0]?.delta?.content
        if (typeof chunk === 'string' && chunk) {
          text += chunk
          options.onPartial?.(stripCodeFences(text))
        }
      } catch {
        // Ignore malformed SSE chunks.
      }
    }
  }
  return stripCodeFences(text)
}

function stripCodeFences(value: string): string {
  const trimmed = value.trim()
  const fenced = trimmed.match(/^```(?:[\w-]+)?\n([\s\S]*?)\n```$/)
  return fenced?.[1]?.trim() ?? trimmed
}
