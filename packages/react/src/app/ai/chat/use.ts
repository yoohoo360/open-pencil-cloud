import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@nanostores/react'

import {
  formatAgentTasksSteps,
  resolveAgentTasks,
  runAgentSubtasks,
  toPendingAgentTasks,
  type AgentTaskState
} from '#react/app/ai/agent/parallel'
import {
  chatProviderSettings,
  isChatConfigured,
  resolveChatModel
} from '#react/app/ai/chat/settings'
import {
  analyzeAttachedImages,
  designMessageWithImageFindings
} from '#react/app/ai/attachment/image/analyze'
import {
  isImageAttachmentMediaType,
  prepareImageAttachment
} from '#react/app/ai/attachment/image/prepare'
import {
  clearImageAttachmentPresentations,
  setImageAttachmentPresentations
} from '#react/app/ai/attachment/image/presentation'
import type { ImageAttachmentDraft } from '#react/app/ai/attachment/image/types'
import { buildDesignExecuteExtra, buildDesignRoutePrompt } from '#react/app/ai/chat/design-route'
import {
  clearChatMemory,
  finalizeStoppedMessages,
  loadChatMemory,
  pullUserMessageForEdit,
  saveChatMemory
} from '#react/app/ai/chat/memory'
import { failureReasonFromError } from '#react/app/ai/chat/provider-error'
import { streamChatCompletion } from '#react/app/ai/chat/stream'
import { streamTextCompletion } from '#react/app/ai/chat/text-stream'
import type {
  ChatFailure,
  ChatMessage,
  ChatStatus,
  DesignChatPhase,
  DesignPlanArtifacts
} from '#react/app/ai/chat/types'
import { useEditorStore } from '#react/app/editor/store'
import { readActiveOrgId } from '#react/app/org/active'
import {
  extractLookups,
  extractSkillKeys,
  parseCodegenReply
} from '#react/app/skills/codegen-reply'
import {
  collectPersonalSkills,
  skillCatalogBlock,
  withSkillsInPlan
} from '#react/app/skills/package-load'
import {
  formatSkillTemplatesCatalog,
  loadSkillPackageForDesign,
  type SkillDesignTemplate
} from '#react/app/skills/templates'
import {
  isSkillEnabledForCodegen,
  skillChatPreferences
} from '#react/app/skills/preferences'
import {
  gatherPlanningSceneContext,
  resolvePlanningLookups
} from '#react/app/skills/scene-context'
import { getActiveTab, subscribeActiveTab } from '#react/app/tabs'
import { skillAPI, type PencilSkill } from '#react/lib/client'

function activeTabId(): string {
  return getActiveTab()?.id ?? 'default'
}

const emptyPlan = (): DesignPlanArtifacts => ({
  thinking: '',
  plan: '',
  steps: ''
})

function planFromReply(text: string, reasoning: string): DesignPlanArtifacts {
  const parsed = parseCodegenReply(text, reasoning)
  return {
    thinking: parsed.thinking,
    plan: parsed.plan,
    steps: parsed.steps
  }
}

export function useAIChat() {
  const store = useEditorStore()
  const settings = useStore(chatProviderSettings)
  const prefs = useStore(skillChatPreferences('design'))
  const configured = isChatConfigured(settings)
  const tabIdRef = useRef(activeTabId())
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatMemory(tabIdRef.current))
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [chatFailure, setChatFailure] = useState<ChatFailure | null>(null)
  const [enabledSkills, setEnabledSkills] = useState<PencilSkill[]>([])
  const [skillsReady, setSkillsReady] = useState(false)
  /** Bumps when Stop / Edit seeds the composer with a prior user turn. */
  const [composerSeed, setComposerSeed] = useState<{ key: number; text: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const operationRef = useRef(0)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  useEffect(() => {
    saveChatMemory(tabIdRef.current, messages)
  }, [messages])

  useEffect(() => {
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
  }, [prefs])

  const resetChat = useCallback(async () => {
    operationRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    clearImageAttachmentPresentations()
    clearChatMemory(tabIdRef.current)
    setMessages([])
    setStatus('ready')
    setChatFailure(null)
    setComposerSeed(null)
  }, [])

  useEffect(() => {
    return subscribeActiveTab(() => {
      const nextId = activeTabId()
      if (nextId === tabIdRef.current) return
      operationRef.current += 1
      abortRef.current?.abort()
      abortRef.current = null
      saveChatMemory(tabIdRef.current, messagesRef.current)
      tabIdRef.current = nextId
      setMessages(loadChatMemory(nextId))
      setStatus('ready')
      setChatFailure(null)
      setComposerSeed(null)
    })
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  const sendMessage = useCallback(
    async (text: string, images: ImageAttachmentDraft[] = []) => {
      if (status === 'streaming' || status === 'submitted') return
      const trimmed = text.trim()
      if (!trimmed) return
      const operation = ++operationRef.current
      const userId = crypto.randomUUID()
      const assistantId = crypto.randomUUID()
      const history: ChatMessage[] = [
        ...messages,
        { id: userId, role: 'user', parts: [{ type: 'text', text: trimmed }] }
      ]
      if (images.length > 0) {
        setImageAttachmentPresentations(
          userId,
          images.map((image) => ({
            id: crypto.randomUUID(),
            messageId: userId,
            name: image.file.name,
            mediaType: isImageAttachmentMediaType(image.file.type) ? image.file.type : 'image/png',
            originalWidth: 0,
            originalHeight: 0,
            previewWidth: 0,
            previewHeight: 0,
            previewURL: image.previewURL,
            displayText: trimmed
          }))
        )
      }
      setMessages([
        ...history,
        {
          id: assistantId,
          role: 'assistant',
          parts: [],
          planArtifacts: emptyPlan(),
          phase: 'route',
          selectedSkillKeys: [],
          reasoning: ''
        }
      ])
      setStatus('submitted')
      setChatFailure(null)
      const controller = new AbortController()
      abortRef.current = controller

      const publish = (patch: {
        parts?: ChatMessage['parts']
        planArtifacts?: DesignPlanArtifacts
        phase?: DesignChatPhase
        selectedSkillKeys?: string[]
        reasoning?: string
        agentTasks?: AgentTaskState[]
      }) => {
        setMessages((current) =>
          current.map((message) => {
            if (message.id !== assistantId) return message
            return {
              ...message,
              parts: patch.parts ?? message.parts,
              planArtifacts: patch.planArtifacts ?? message.planArtifacts,
              phase: patch.phase ?? message.phase,
              selectedSkillKeys: patch.selectedSkillKeys ?? message.selectedSkillKeys,
              reasoning: patch.reasoning ?? message.reasoning,
              agentTasks: patch.agentTasks ?? message.agentTasks
            }
          })
        )
      }

      try {
        let apiMessages = history
        if (images.length > 0) {
          const prepared = await Promise.all(images.map((image) => prepareImageAttachment(image.file)))
          if (operation !== operationRef.current) return
          const findings = await analyzeAttachedImages(settings, trimmed, prepared, controller.signal)
          if (operation !== operationRef.current) return
          const designText = designMessageWithImageFindings(
            trimmed,
            images.map((image) => image.file.name),
            findings
          )
          apiMessages = history.map((message) =>
            message.id === userId ? { ...message, parts: [{ type: 'text', text: designText }] } : message
          )
          setMessages((current) =>
            current.map((message) =>
              message.id === userId ? { ...message, parts: [{ type: 'text', text: designText }] } : message
            )
          )
        }

        setStatus('streaming')
        const sceneContext = await gatherPlanningSceneContext(store)
        if (operation !== operationRef.current) return

        // Follow-ups already have transcript context — skip a second planning LLM call.
        const isFollowUp = messages.some((message) => message.role === 'assistant')

        let planWithSkills = 'Continue from the conversation; inspect only what you still need, then edit.'
        let stepsWithTasks = ''
        let selectedKeys: string[] = []
        let lookupNotes = ''
        let packages: Array<{ name: string; key: string; body: string }> = []
        let skillTemplates: SkillDesignTemplate[] = []
        let agentTasks: AgentTaskState[] = toPendingAgentTasks([
          { id: 'build', title: 'Build', tier: 'high', dependsOn: [] }
        ])
        let routePlan = emptyPlan()

        if (!isFollowUp) {
          // Medium tier is enough for a short checklist; saves TTFT vs high.
          const routeModel = resolveChatModel(settings, 'medium')
          if (!routeModel) throw new Error('Configure at least one enabled AI model.')
          const route = await streamTextCompletion({
            apiKey: routeModel.apiKey,
            baseURL: routeModel.baseURL,
            model: routeModel.model,
            signal: controller.signal,
            messages: [
              {
                role: 'system',
                content: buildDesignRoutePrompt({
                  catalog: skillCatalogBlock(enabledSkills),
                  sceneContext
                })
              },
              ...apiMessages.map((message) => ({
                role: message.role as 'user' | 'assistant',
                content: message.parts
                  .filter((part) => part.type === 'text')
                  .map((part) => part.text)
                  .join('\n')
              }))
            ],
            onDelta: (textOut, reasoningOut) => {
              if (operation !== operationRef.current) return
              publish({
                planArtifacts: planFromReply(textOut, reasoningOut),
                phase: 'route',
                reasoning: reasoningOut
              })
            }
          })
          if (operation !== operationRef.current) return

          const catalog = enabledSkills.map((skill) => ({
            key: skill.skill_key,
            name: skill.name
          }))
          selectedKeys = extractSkillKeys(route.text, catalog)
          routePlan = planFromReply(route.text, route.reasoning)
          const plannedTasks = resolveAgentTasks(route.text, {
            plan: routePlan.plan,
            steps: routePlan.steps
          })
          // Checklist for UI only — design runs a single tool agent below.
          stepsWithTasks = [
            routePlan.steps.trim(),
            formatAgentTasksSteps(plannedTasks)
          ]
            .filter(Boolean)
            .join('\n\n')
          planWithSkills = withSkillsInPlan(routePlan.plan, selectedKeys)
          agentTasks = toPendingAgentTasks(plannedTasks)

          publish({
            planArtifacts: { ...routePlan, plan: planWithSkills, steps: stepsWithTasks },
            phase: 'loading-skills',
            selectedSkillKeys: selectedKeys,
            reasoning: route.reasoning,
            agentTasks
          })

          if (extractLookups(route.text).length > 0) {
            lookupNotes = await resolvePlanningLookups(store, route.text)
            if (operation !== operationRef.current) return
            if (lookupNotes) {
              planWithSkills = `${planWithSkills.trim()}\n\nLooked-up layers:\n${lookupNotes}`.trim()
              publish({
                planArtifacts: { ...routePlan, plan: planWithSkills, steps: stepsWithTasks },
                phase: 'loading-skills',
                selectedSkillKeys: selectedKeys,
                agentTasks
              })
            }
          }

          const selectedSkills = enabledSkills.filter((skill) =>
            selectedKeys.includes(skill.skill_key)
          )
          const packageResults = await runAgentSubtasks(
            selectedSkills.map((skill) => ({
              id: skill.skill_key,
              title: skill.name,
              run: async () => {
                const loaded = await loadSkillPackageForDesign(skill)
                return {
                  name: skill.name,
                  key: skill.skill_key,
                  body: loaded.body,
                  templates: loaded.templates
                }
              }
            }))
          )
          packages = packageResults
            .filter((result) => result.ok && result.value)
            .map((result) => ({
              name: result.value!.name,
              key: result.value!.key,
              body: result.value!.body
            }))
          skillTemplates = packageResults
            .filter((result) => result.ok && result.value)
            .flatMap((result) => result.value!.templates)
          if (operation !== operationRef.current) return
        } else {
          // Follow-ups skip re-routing but must still load clipboard templates for insert_skill_template.
          const priorKeys =
            [...messages]
              .reverse()
              .find((message) => message.selectedSkillKeys && message.selectedSkillKeys.length > 0)
              ?.selectedSkillKeys ?? []
          selectedKeys = priorKeys
          const skillsToLoad =
            priorKeys.length > 0
              ? enabledSkills.filter((skill) => priorKeys.includes(skill.skill_key))
              : enabledSkills
          if (skillsToLoad.length > 0) {
            const packageResults = await runAgentSubtasks(
              skillsToLoad.map((skill) => ({
                id: skill.skill_key,
                title: skill.name,
                run: async () => {
                  const loaded = await loadSkillPackageForDesign(skill)
                  return {
                    name: skill.name,
                    key: skill.skill_key,
                    body: loaded.body,
                    templates: loaded.templates
                  }
                }
              }))
            )
            packages = packageResults
              .filter((result) => result.ok && result.value)
              .map((result) => ({
                name: result.value!.name,
                key: result.value!.key,
                body: result.value!.body
              }))
            skillTemplates = packageResults
              .filter((result) => result.ok && result.value)
              .flatMap((result) => result.value!.templates)
            if (operation !== operationRef.current) return
          }
        }

        agentTasks = agentTasks.map((task) => ({ ...task, status: 'running' as const }))
        publish({
          planArtifacts: { ...routePlan, plan: planWithSkills, steps: stepsWithTasks },
          phase: 'execute',
          selectedSkillKeys: selectedKeys,
          agentTasks
        })

        // One agent loop: many tools per turn (parallel reads) beats N parallel LLM tasks.
        const executeTier = agentTasks.map((task) => task.tier)
        const executeTierHigh = executeTier.includes('high')
        await streamChatCompletion({
          store,
          settings,
          messages: apiMessages,
          systemExtra: buildDesignExecuteExtra({
            plan: planWithSkills,
            steps: stepsWithTasks,
            skillKeys: selectedKeys,
            skillPackages: packages,
            skillTemplatesCatalog: formatSkillTemplatesCatalog(skillTemplates),
            lookupNotes,
            sceneContext
          }),
          skillTemplates,
          // Host-paste once per new plan; follow-ups keep nodes and only modify.
          preinsertTemplates: !isFollowUp && skillTemplates.length > 0,
          tier: executeTierHigh ? 'high' : (executeTier[0] ?? 'high'),
          signal: controller.signal,
          onAssistantParts(parts) {
            if (operation !== operationRef.current) return
            publish({
              parts,
              planArtifacts: { ...routePlan, plan: planWithSkills, steps: stepsWithTasks },
              phase: 'execute',
              selectedSkillKeys: selectedKeys,
              agentTasks
            })
          }
        })

        if (operation !== operationRef.current) return

        agentTasks = agentTasks.map((task) => ({ ...task, status: 'done' as const }))
        publish({ phase: 'done', agentTasks })
        if (operation === operationRef.current) setStatus('ready')
      } catch (error) {
        if (controller.signal.aborted || operation !== operationRef.current) return
        setChatFailure({ reason: failureReasonFromError(error) })
        setStatus('error')
        const message =
          error instanceof Error ? error.message : 'Prototype generation failed'
        publish({
          parts: [{ type: 'text', text: message }],
          planArtifacts: emptyPlan(),
          phase: 'done'
        })
      } finally {
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [enabledSkills, messages, settings, status, store]
  )

  const stop = useCallback(() => {
    operationRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setMessages((current) => finalizeStoppedMessages(current))
    setStatus('ready')
  }, [])

  /** Abort the run, pull the last (or given) user turn into the composer for re-edit. */
  const stopAndEdit = useCallback((messageId?: string) => {
    operationRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    const { messages: next, draft } = pullUserMessageForEdit(messagesRef.current, messageId)
    setMessages(next)
    setStatus('ready')
    setChatFailure(null)
    if (draft) {
      setComposerSeed((previous) => ({
        key: (previous?.key ?? 0) + 1,
        text: draft
      }))
    }
  }, [])

  return {
    isConfigured: configured,
    messages,
    status,
    chatFailure,
    clearChatFailure: () => setChatFailure(null),
    enabledSkills,
    skillsReady,
    sendMessage,
    stop,
    stopAndEdit,
    composerSeed,
    resetChat
  }
}
