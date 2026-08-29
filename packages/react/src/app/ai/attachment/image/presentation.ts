import type { ImageAttachmentPresentation } from '#react/app/ai/attachment/image/types'

const presentations = new Map<string, ImageAttachmentPresentation[]>()
const listeners = new Set<() => void>()
const EMPTY_ATTACHMENTS: ImageAttachmentPresentation[] = []

function notify() {
  for (const listener of listeners) listener()
}

export function subscribeImagePresentations(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}

export function imageAttachmentsForMessage(messageId: string): ImageAttachmentPresentation[] {
  return presentations.get(messageId) ?? EMPTY_ATTACHMENTS
}

export function setImageAttachmentPresentations(
  messageId: string,
  next: ImageAttachmentPresentation[]
) {
  presentations.set(messageId, next)
  notify()
}

export function clearImageAttachmentPresentations() {
  for (const items of presentations.values()) {
    for (const item of items) {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(item.previewURL)
      }
    }
  }
  presentations.clear()
  notify()
}

export function visibleUserMessageText(messageId: string, fallback: string): string {
  const attached = presentations.get(messageId)
  const display = attached?.[0]?.displayText
  return display && display.length > 0 ? display : fallback
}
