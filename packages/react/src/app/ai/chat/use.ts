import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@nanostores/react'

import {
  chatProviderSettings,
  isChatConfigured
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
  loadSkillPackageText,
  skillCatalogBlock,
  withSkillsInPlan
} from '#react/app/skills/package-load'
import {
  isSkillEnabledForCodegen,
  skillCodegenPreferences
} from '#react/app/skills/preferences'
import {
  gatherPlanningSceneContext,
  resolvePlanningLookups
} from '#react/app/skills/scene-context'
import { subscribeActiveTab } from '#react/app/tabs'
import { skillAPI, type PencilSkill } from '#react/lib/client'

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
  const prefs = useStore(skillCodegenPreferences)
  const configured = isChatConfigured(settings)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [chatFailure, setChatFailure] = useState<ChatFailure | null>(null)
  const [enabledSkills, setEnabledSkills] = useState<PencilSkill[]>([])
  const [skillsReady, setSkillsReady] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const operationRef = useRef(0)

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
    setMessages([])
    setStatus('ready')
    setChatFailure(null)
  }, [])

  useEffect(() => {
    return subscribeActiveTab(() => {
      void resetChat()
    })
  }, [resetChat])

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
              reasoning: patch.reasoning ?? message.reasoning
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

        const route = await streamTextCompletion({
          apiKey: settings.apiKey,
          baseURL: settings.baseURL,
          model: settings.model,
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
        const selectedKeys = extractSkillKeys(route.text, catalog)
        const routePlan = planFromReply(route.text, route.reasoning)
        let planWithSkills = withSkillsInPlan(routePlan.plan, selectedKeys)

        publish({
          planArtifacts: { ...routePlan, plan: planWithSkills },
          phase: 'loading-skills',
          selectedSkillKeys: selectedKeys,
          reasoning: route.reasoning
        })

        let lookupNotes = ''
        if (extractLookups(route.text).length > 0) {
          lookupNotes = await resolvePlanningLookups(store, route.text)
          if (operation !== operationRef.current) return
          if (lookupNotes) {
            planWithSkills = `${planWithSkills.trim()}\n\nLooked-up layers:\n${lookupNotes}`.trim()
            publish({
              planArtifacts: { ...routePlan, plan: planWithSkills },
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
          planArtifacts: { ...routePlan, plan: planWithSkills },
          phase: 'execute',
          selectedSkillKeys: selectedKeys
        })

        const systemExtra = buildDesignExecuteExtra({
          plan: planWithSkills,
          steps: routePlan.steps,
          skillKeys: selectedKeys,
          skillPackages: packages,
          lookupNotes,
          sceneContext
        })

        await streamChatCompletion({
          store,
          settings,
          messages: apiMessages,
          systemExtra,
          signal: controller.signal,
          onAssistantParts(parts) {
            if (operation !== operationRef.current) return
            publish({
              parts,
              planArtifacts: { ...routePlan, plan: planWithSkills },
              phase: 'execute',
              selectedSkillKeys: selectedKeys
            })
          }
        })
        if (operation !== operationRef.current) return

        publish({ phase: 'done' })
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
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('ready')
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
    resetChat
  }
}
