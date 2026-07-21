import type { ClipboardImageResolution, Editor } from '@open-pencil/core/editor'
import { dialogMessages } from '@open-pencil/react'

import { toast } from '@/app/shell/ui'

export function notifyClipboardImageResolution({
  total,
  missing,
  fetchAttempted
}: ClipboardImageResolution) {
  const messages = dialogMessages.get()
  if (!fetchAttempted) {
    toast.warning(
      total === 1
        ? messages.clipboardImageUnavailableWeb
        : messages.clipboardImagesUnavailableWeb({ count: total })
    )
    return
  }

  toast.error(
    missing === 1
      ? messages.clipboardImageFetchFailed
      : messages.clipboardImagesFetchFailed({ count: missing })
  )
}

export function bindClipboardNotifications(editor: Editor) {
  return editor.onEditorEvent('clipboard:images-missing', notifyClipboardImageResolution)
}
