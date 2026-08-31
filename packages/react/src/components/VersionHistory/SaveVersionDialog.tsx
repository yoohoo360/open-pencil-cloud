import { AppButton } from '#react/components/ui/AppButton'
import { AppInput } from '#react/components/ui/AppInput'
import { useDialogUI } from '#react/components/ui/dialog'
import { useI18n } from '#react/i18n'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { IS_BROWSER } from '@open-pencil/core/constants'

export function SaveVersionDialog({
  saving,
  onClose,
  onSave
}: {
  saving: boolean
  onClose: () => void
  onSave: (title: string, description: string) => void
}) {
  const { dialogs } = useI18n()
  const cls = useDialogUI(undefined, { size: 'sm' })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!IS_BROWSER) return null

  return createPortal(
    <>
      <div data-slot="dialog-overlay" className={cls.overlay} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-version-title"
        data-slot="dialog-content"
        data-test-id="save-version-dialog"
        className={cls.content}
      >
        <header data-slot="dialog-header" className={cls.header}>
          <h2 id="save-version-title" className={cls.title}>
            {dialogs.saveVersion}
          </h2>
          <button type="button" className={cls.close} aria-label={dialogs.close} onClick={onClose}>
            <X className="size-3.5" />
          </button>
        </header>
        <div data-slot="dialog-body" className={`${cls.body} flex flex-col gap-3`}>
          <p className="text-xs text-muted">{dialogs.saveVersionDescription}</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">{dialogs.versionTitle}</span>
            <AppInput
              autoFocus
              value={title}
              aria-label={dialogs.versionTitle}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">{dialogs.versionDescription}</span>
            <AppInput
              value={description}
              aria-label={dialogs.versionDescription}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>
        <footer data-slot="dialog-footer" className={cls.footer}>
          <AppButton variant="ghost" onClick={onClose}>
            {dialogs.cancel}
          </AppButton>
          <AppButton
            color="primary"
            variant="solid"
            disabled={saving}
            onClick={() => onSave(title.trim(), description.trim())}
          >
            {dialogs.saveVersion}
          </AppButton>
        </footer>
      </div>
    </>,
    document.body
  )
}
