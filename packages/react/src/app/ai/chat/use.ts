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
import { failureReasonFromError } from '#react/app/ai/chat/provider-error'
import { streamChatCompletion } from '#react/app/ai/chat/stream'
import type {
  ChatFailure,
  ChatMessage,
  ChatStatus
} from '#react/app/ai/chat/types'
import { subscribeActiveTab } from '#react/app/tabs'
import { useEditorStore } from '#react/app/editor/store'

export function useAIChat() {
  const store = useEditorStore()
  const settings = useStore(chatProviderSettings)
  const configured = isChatConfigured(settings)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [chatFailure, setChatFailure] = useState<ChatFailure | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const operationRef = useRef(0)

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
        { id: assistantId, role: 'assistant', parts: [{ type: 'text', text: '' }] }
      ])
      setStatus('submitted')
      setChatFailure(null)
      const controller = new AbortController()
      abortRef.current = controller
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
        await streamChatCompletion({
          store,
          settings,
          messages: apiMessages,
          signal: controller.signal,
          onAssistantParts(parts) {
            if (operation !== operationRef.current) return
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId ? { ...message, parts } : message
              )
            )
          }
        })
        if (operation === operationRef.current) setStatus('ready')
      } catch (error) {
        if (controller.signal.aborted || operation !== operationRef.current) return
        setChatFailure({ reason: failureReasonFromError(error) })
        setStatus('error')
      } finally {
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [messages, settings, status, store]
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
    sendMessage,
    stop,
    resetChat
  }
}
