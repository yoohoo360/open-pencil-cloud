import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@nanostores/react'

import { throwChatHttpError } from '#react/app/ai/chat/provider-error'
import {
  chatProviderSettings,
  isChatConfigured
} from '#react/app/ai/chat/settings'
import type { ChatMessage, ChatStatus } from '#react/app/ai/chat/types'
import { chatCompletionsURL } from '#react/app/ai/chat/url'
import { readActiveOrgId } from '#react/app/org/active'
import {
  emptyCodegenArtifacts,
  extractGeneratedCode,
  extractLookups,
  extractSkillKeys,
  parseCodegenReply,
  type CodegenArtifacts
} from '#react/app/skills/codegen-reply'
import {
  isSkillEnabledForCodegen,
  skillChatPreferences
} from '#react/app/skills/preferences'
import {
  gatherPlanningSceneContext,
  resolvePlanningLookups
} from '#react/app/skills/scene-context'
import type { EditorStore } from '#react/app/editor/store'
import {
  collectPersonalSkills,
  loadSkillPackageText,
  skillCatalogBlock,
  withSkillsInPlan
} from '#react/app/skills/package-load'
import { skillAPI, type PencilSkill } from '#react/lib/client'

export type { CodegenArtifacts } from '#react/app/skills/codegen-reply'
export { extractGeneratedCode, parseCodegenReply } from '#react/app/skills/codegen-reply'

export type CodegenPhase = 'route' | 'loading-skills' | 'generate' | 'done'

/** Assistant messages carry parsed artifacts so the code box never mixes in think/plan. */
export type CodegenChatMessage = ChatMessage & {
  reasoning?: string
  artifacts?: CodegenArtifacts
  phase?: CodegenPhase
  selectedSkillKeys?: string[]
}

type ApiChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/** Phase 1: catalog only — pick steps and which skills each step needs. */
function buildRoutePrompt(options: {
  sourceLabel: string
  baselineCode: string
  skills: PencilSkill[]
  sceneContext: string
}): string {
  return `You are a code assistant in OpenPencil Dev mode.
Help the user generate or refine ${options.sourceLabel} for the current selection.

You only see a catalog of enabled skills (key + name + description). Do not invent package contents.
Break the work into steps and choose which skill keys apply. Prefer few skills; omit unused ones.

Canvas context below includes a semantic describe of the selection, plus related layers
outside the selection (parent/siblings) and nearby text/copy. Use that copy when planning
labels, placeholders, and helper text. If you still need another layer by name or id, list it in
<lookup> (one query per line); the app will describe those nodes before code generation.

Reply with ONLY these XML sections (no fenced code in this phase):
<thinking>
Brief reasoning about the request, canvas copy, and which skills fit which steps.
</thinking>
<plan>
Short plan. When you pick skills, name them by key. Reference real copy from the canvas when relevant.
</plan>
<steps>
Numbered steps; include skill keys next to steps that need them.
</steps>
<skills>
exact-skill-key
</skills>
<lookup>
optional-name-or-id
</lookup>

In <skills>, list exact keys from the catalog (one per line). Empty if none.
Leave <lookup> empty when the canvas context is enough.
Do not output source code in this phase.

Canvas context:
${options.sceneContext || '(none)'}

Enabled skill catalog:
${skillCatalogBlock(options.skills)}

Current ${options.sourceLabel} code:
\`\`\`
${options.baselineCode || '(empty)'}
\`\`\``
}

/** Phase 2: load only selected skill packages and produce code only. */
function buildGeneratePrompt(options: {
  sourceLabel: string
  baselineCode: string
  skillPackages: Array<{ name: string; key: string; body: string }>
  plan: string
  steps: string
  sceneContext: string
  lookupContext: string
}): string {
  const skillsBlock =
    options.skillPackages.length === 0
      ? '(No skill packages selected. Use general best practices for the format.)'
      : options.skillPackages
          .map(
            (skill) =>
              `## Skill ${skill.name} (${skill.key})\n${skill.body || '(empty package)'}`
          )
          .join('\n\n')
  return `You are a code assistant in OpenPencil Dev mode.
Produce the final ${options.sourceLabel} for the selection.
Follow the plan/steps and ONLY the skill packages below as binding instructions.
Match real copy/text from the canvas context and any looked-up layers.

Plan:
${options.plan || '(none)'}

Steps:
${options.steps || '(none)'}

Canvas context:
${options.sceneContext || '(none)'}

${options.lookupContext ? `Additional looked-up layers:\n${options.lookupContext}\n` : ''}
Selected skill packages:
${skillsBlock}

Current ${options.sourceLabel} code:
\`\`\`
${options.baselineCode || '(empty)'}
\`\`\`

Output ONLY one fenced code block with the full updated source.
Do not output <thinking>, <plan>, <steps>, or any prose outside the fence.`
}

function deltaReasoning(delta: {
  content?: string | null
  reasoning?: string | null
  reasoning_content?: string | null
}): string {
  if (typeof delta.reasoning_content === 'string') return delta.reasoning_content
  if (typeof delta.reasoning === 'string') return delta.reasoning
  return ''
}

async function streamChatCompletion(options: {
  settings: { baseURL: string; apiKey: string; model: string }
  messages: ApiChatMessage[]
  signal: AbortSignal
  onDelta: (text: string, reasoning: string) => void
}): Promise<{ text: string; reasoning: string }> {
  const response = await fetch(chatCompletionsURL(options.settings.baseURL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.settings.model,
      stream: true,
      temperature: 0.2,
      messages: options.messages
    }),
    signal: options.signal
  })
  if (!response.ok) throwChatHttpError(response.status, await response.text())
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Streaming is unavailable.')
  const decoder = new TextDecoder()
  let buffer = ''
  let textOut = ''
  let reasoningOut = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine.startsWith('data:')) continue
      const data = trimmedLine.slice(5).trim()
      if (data === '[DONE]') break
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{
            delta?: {
              content?: string | null
              reasoning?: string | null
              reasoning_content?: string | null
            }
          }>
        }
        const delta = parsed.choices?.[0]?.delta
        if (!delta) continue
        const reasoningChunk = deltaReasoning(delta)
        if (reasoningChunk) reasoningOut += reasoningChunk
        const chunk = delta.content
        if (typeof chunk === 'string' && chunk) textOut += chunk
        if (!reasoningChunk && !(typeof chunk === 'string' && chunk)) continue
        options.onDelta(textOut, reasoningOut)
      } catch {
        // ignore malformed SSE
      }
    }
  }
  return { text: textOut, reasoning: reasoningOut }
}

export function useCodegenChat(options: {
  sourceLabel: string
  getBaselineCode: () => string
  onArtifacts: (artifacts: CodegenArtifacts) => void
  active: boolean
  /** Editor store for planning-time describe / find_nodes (React bridge only). */
  store: EditorStore
}) {
  const settings = useStore(chatProviderSettings)
  const prefs = useStore(skillChatPreferences('codegen'))
  const configured = isChatConfigured(settings)
  const [messages, setMessages] = useState<CodegenChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [enabledSkills, setEnabledSkills] = useState<PencilSkill[]>([])
  const [skillsReady, setSkillsReady] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const operationRef = useRef(0)
  const getBaselineCode = options.getBaselineCode
  const onArtifacts = options.onArtifacts
  const sourceLabel = options.sourceLabel
  const store = options.store

  useEffect(() => {
    if (!options.active) return
    let cancelled = false
    setSkillsReady(false)
    void skillAPI
      .catalog({ org_id: readActiveOrgId() || undefined })
      .then((response) => {
        if (cancelled) return
        const personal = collectPersonalSkills(response.data ?? [])
        setEnabledSkills(personal.filter((skill) => isSkillEnabledForCodegen(skill, prefs)))
        setSkillsReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setEnabledSkills([])
        setSkillsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [options.active, prefs])

  const resetChat = useCallback(() => {
    operationRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setStatus('ready')
    onArtifacts(emptyCodegenArtifacts())
  }, [onArtifacts])

  useEffect(() => () => abortRef.current?.abort(), [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (status === 'streaming' || status === 'submitted') return
      const trimmed = text.trim()
      if (!trimmed) return
      if (!configured) return
      const operation = ++operationRef.current
      const userId = crypto.randomUUID()
      const assistantId = crypto.randomUUID()
      const history: CodegenChatMessage[] = [
        ...messages,
        { id: userId, role: 'user', parts: [{ type: 'text', text: trimmed }] }
      ]
      setMessages([
        ...history,
        {
          id: assistantId,
          role: 'assistant',
          parts: [{ type: 'text', text: '' }],
          reasoning: '',
          artifacts: emptyCodegenArtifacts(),
          phase: 'route',
          selectedSkillKeys: []
        }
      ])
      setStatus('submitted')
      const controller = new AbortController()
      abortRef.current = controller

      const publish = (patch: {
        text?: string
        reasoning?: string
        artifacts: CodegenArtifacts
        phase: CodegenPhase
        selectedSkillKeys?: string[]
      }) => {
        setMessages((current) =>
          current.map((message) => {
            if (message.id !== assistantId) return message
            const prevText = message.parts
              .filter((part) => part.type === 'text')
              .map((part) => part.text)
              .join('\n')
            return {
              ...message,
              parts: [{ type: 'text', text: patch.text ?? prevText }],
              reasoning: patch.reasoning ?? message.reasoning,
              artifacts: patch.artifacts,
              phase: patch.phase,
              selectedSkillKeys: patch.selectedSkillKeys ?? message.selectedSkillKeys
            }
          })
        )
        onArtifacts(patch.artifacts)
      }

      try {
        if (operation !== operationRef.current) return
        const baselineCode = getBaselineCode()
        const historyApi: ApiChatMessage[] = history.map((message) => ({
          role: message.role as 'user' | 'assistant',
          content: message.parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n')
        }))

        setStatus('streaming')
        // Planning context via React tool bridge (describe / related copy) — no core/fig edits.
        const sceneContext = await gatherPlanningSceneContext(store)
        if (operation !== operationRef.current) return

        const route = await streamChatCompletion({
          settings,
          signal: controller.signal,
          messages: [
            {
              role: 'system',
              content: buildRoutePrompt({
                sourceLabel,
                baselineCode,
                skills: enabledSkills,
                sceneContext
              })
            },
            ...historyApi
          ],
          onDelta: (textOut, reasoningOut) => {
            if (operation !== operationRef.current) return
            publish({
              text: textOut,
              reasoning: reasoningOut,
              artifacts: parseCodegenReply(textOut, reasoningOut),
              phase: 'route'
            })
          }
        })
        if (operation !== operationRef.current) return

        const catalog = enabledSkills.map((skill) => ({
          key: skill.skill_key,
          name: skill.name
        }))
        const selectedKeys = extractSkillKeys(route.text, catalog)
        const routeArtifacts = parseCodegenReply(route.text, route.reasoning)
        let planWithSkills = withSkillsInPlan(routeArtifacts.plan, selectedKeys)

        publish({
          text: route.text,
          reasoning: route.reasoning,
          artifacts: { ...routeArtifacts, plan: planWithSkills, code: '' },
          phase: 'loading-skills',
          selectedSkillKeys: selectedKeys
        })

        // Optional <lookup> from the plan → describe nodes outside the first context.
        let lookupContext = ''
        if (extractLookups(route.text).length > 0) {
          lookupContext = await resolvePlanningLookups(store, route.text)
          if (operation !== operationRef.current) return
          if (lookupContext) {
            planWithSkills = `${planWithSkills.trim()}\n\nLooked-up layers:\n${lookupContext}`.trim()
            publish({
              artifacts: { ...routeArtifacts, plan: planWithSkills, code: '' },
              phase: 'loading-skills',
              selectedSkillKeys: selectedKeys
            })
          }
        }

        const selectedSkills = enabledSkills.filter((skill) =>
          selectedKeys.includes(skill.skill_key)
        )
        const packages = await Promise.all(
          selectedSkills.map(async (skill) => ({
            name: skill.name,
            key: skill.skill_key,
            body: await loadSkillPackageText(skill)
          }))
        )
        if (operation !== operationRef.current) return

        publish({
          artifacts: { ...routeArtifacts, plan: planWithSkills, code: '' },
          phase: 'generate',
          selectedSkillKeys: selectedKeys
        })

        const generate = await streamChatCompletion({
          settings,
          signal: controller.signal,
          messages: [
            {
              role: 'system',
              content: buildGeneratePrompt({
                sourceLabel,
                baselineCode,
                skillPackages: packages,
                plan: planWithSkills,
                steps: routeArtifacts.steps,
                sceneContext,
                lookupContext
              })
            },
            ...historyApi,
            {
              role: 'user',
              content:
                'Output only the final fenced source code now. No thinking, plan, or steps tags.'
            }
          ],
          onDelta: (textOut) => {
            if (operation !== operationRef.current) return
            const code = extractGeneratedCode(textOut)
            publish({
              text: `${route.text}\n\n${textOut}`,
              reasoning: route.reasoning,
              artifacts: {
                thinking: routeArtifacts.thinking,
                plan: planWithSkills,
                steps: routeArtifacts.steps,
                code
              },
              phase: 'generate',
              selectedSkillKeys: selectedKeys
            })
          }
        })
        if (operation !== operationRef.current) return

        const finalCode = extractGeneratedCode(generate.text)
        publish({
          text: `${route.text}\n\n${generate.text}`,
          reasoning: route.reasoning,
          artifacts: {
            thinking: routeArtifacts.thinking,
            plan: planWithSkills,
            steps: routeArtifacts.steps,
            code: finalCode
          },
          phase: 'done',
          selectedSkillKeys: selectedKeys
        })
        if (operation === operationRef.current) setStatus('ready')
      } catch (error) {
        if (controller.signal.aborted || operation !== operationRef.current) return
        const message =
          error instanceof Error ? error.message : 'Code generation failed'
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  parts: [{ type: 'text', text: message }],
                  reasoning: '',
                  phase: 'done'
                }
              : item
          )
        )
        setStatus('error')
      } finally {
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [
      configured,
      enabledSkills,
      getBaselineCode,
      messages,
      onArtifacts,
      settings,
      sourceLabel,
      status,
      store
    ]
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('ready')
  }, [])

  return {
    isConfigured: configured,
    messages,
    status,
    enabledSkills,
    skillsReady,
    sendMessage,
    stop,
    resetChat
  }
}
