import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react'
import { Bot, ImagePlus, Send, Settings, Square, X } from 'lucide-react'

import { chatProviderSettings } from '#react/app/ai/chat/settings'
import type { ChatStatus } from '#react/app/ai/chat/types'
import {
  createImagePreviewURL,
  revokeImagePreviewURL,
  validateImageAttachmentFile
} from '#react/app/ai/attachment/image/prepare'
import { MAX_IMAGE_ATTACHMENTS, type ImageAttachmentDraft } from '#react/app/ai/attachment/image/types'
import { openSettingsDialog } from '#react/app/settings/dialog'
import { IconButton } from '#react/components/ui/IconButton'
import { InputGroup } from '#react/components/ui/InputGroup'
import { useI18n } from '#react/i18n'
import { useStore } from '@nanostores/react'

export function ChatInput({
  status,
  disabled = false,
  onSubmit,
  onStop,
  onError
}: {
  status: ChatStatus
  disabled?: boolean
  onSubmit: (text: string, images: ImageAttachmentDraft[]) => void
  onStop: () => void
  onError: (message: string) => void
}) {
  const { dialogs } = useI18n()
  const settings = useStore(chatProviderSettings)
  const [input, setInput] = useState('')
  const [images, setImages] = useState<ImageAttachmentDraft[]>([])
  const imagesRef = useRef(images)
  imagesRef.current = images
  const fileRef = useRef<HTMLInputElement>(null)
  const isStreaming = disabled || status === 'streaming' || status === 'submitted'

  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) revokeImagePreviewURL(image.previewURL)
    }
  }, [])

  function addImageFiles(files: File[]) {
    const available = MAX_IMAGE_ATTACHMENTS - images.length
    if (available <= 0) {
      onError(`You can attach up to ${MAX_IMAGE_ATTACHMENTS} images.`)
      return
    }
    const next = [...images]
    for (const file of files.slice(0, available)) {
      const validationError = validateImageAttachmentFile(file)
      if (validationError) {
        onError(validationError)
        continue
      }
      next.push({ file, previewURL: createImagePreviewURL(file) })
    }
    if (files.length > available) onError(`You can attach up to ${MAX_IMAGE_ATTACHMENTS} images.`)
    setImages(next)
  }

  function removeImage(index: number) {
    const image = images[index]
    if (image) revokeImagePreviewURL(image.previewURL)
    setImages(images.filter((_, current) => current !== index))
  }

  function handlePaste(event: ClipboardEvent<HTMLFormElement>) {
    const files = event.clipboardData?.files
    const pasted = files ? [...files].filter((file) => file.type.startsWith('image/')) : []
    if (pasted.length === 0) return
    event.preventDefault()
    addImageFiles(pasted)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text) return
    const submitted = images
    setImages([])
    onSubmit(text, submitted)
    setInput('')
  }

  return (
    <div className="shrink-0 border-t border-border p-2.5">
      <form onSubmit={handleSubmit} onPaste={handlePaste}>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            addImageFiles([...(event.target.files ?? [])])
            event.target.value = ''
          }}
        />
        <InputGroup
          disabled={isStreaming}
          attachment={
            images.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {images.map((image, index) => (
                  <div
                    key={image.previewURL}
                    className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-border bg-canvas p-1.5 shadow-xs"
                  >
                    <img
                      src={image.previewURL}
                      alt={image.file.name}
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-md border border-border object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-[10px] text-surface">
                      {image.file.name}
                    </span>
                    <IconButton
                      label={`Remove image ${image.file.name}`}
                      size="xs"
                      onClick={() => removeImage(index)}
                    >
                      <X className="size-3" />
                    </IconButton>
                  </div>
                ))}
              </div>
            ) : null
          }
          leading={
            <IconButton
              label="Attach images"
              size="sm"
              disabled={isStreaming || images.length >= MAX_IMAGE_ATTACHMENTS}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="size-4" />
            </IconButton>
          }
          model={
            <div className="flex min-w-0 items-center gap-1 px-1.5 text-[10px] text-muted">
              <Bot className="size-3 shrink-0" />
              <span className="truncate">{settings.model}</span>
            </div>
          }
          actions={
            <>
              <IconButton
                label={dialogs.providerSettings}
                size="sm"
                data-test-id="provider-settings-trigger"
                onClick={() => openSettingsDialog('ai')}
              >
                <Settings className="size-3.5" />
              </IconButton>
              {isStreaming ? (
                <IconButton
                  label={dialogs.stopGenerating}
                  size="sm"
                  data-test-id="chat-stop-button"
                  className="border border-border"
                  onClick={onStop}
                >
                  <Square className="size-3" />
                </IconButton>
              ) : (
                <IconButton
                  label={dialogs.sendMessage}
                  size="sm"
                  type="submit"
                  data-test-id="chat-send-button"
                  className="bg-accent text-white hover:bg-accent/90 hover:text-white"
                  disabled={!input.trim()}
                >
                  <Send className="size-3.5" />
                </IconButton>
              )}
            </>
          }
        >
          <textarea
            value={input}
            data-test-id="chat-input"
            placeholder={dialogs.describeChange}
            disabled={isStreaming}
            rows={2}
            aria-label="Describe a change"
            className="block min-h-12 w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-xs leading-relaxed text-surface outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.code !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }}
            onCopy={(event) => event.stopPropagation()}
            onCut={(event) => event.stopPropagation()}
          />
        </InputGroup>
      </form>
    </div>
  )
}
