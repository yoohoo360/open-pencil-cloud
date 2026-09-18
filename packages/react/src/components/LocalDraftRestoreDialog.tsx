import { localDraftPromptStore } from '#react/app/document/local-draft/prompt'
import { AppButton } from '#react/components/ui/AppButton'
import { useDialogUI } from '#react/components/ui/dialog'
import { useI18n } from '#react/i18n'
import { useStore } from '@nanostores/react'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { IS_BROWSER } from '@open-pencil/core/constants'

/** In-app confirm for restoring a newer IndexedDB .fig draft. */
export function LocalDraftRestoreDialog() {
  const request = useStore(localDraftPromptStore)
  const { dialogs } = useI18n()
  const cls = useDialogUI(undefined, { size: 'sm' })

  useEffect(() => {
    if (!request) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') request?.resolve(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [request])

  if (!IS_BROWSER || !request) return null

  const titleId = 'local-draft-restore-title'

  return createPortal(
    <>
      <div
        data-slot="dialog-overlay"
        className={cls.overlay}
        onClick={() => request.resolve(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-slot="dialog-content"
        data-test-id="local-draft-restore-dialog"
        className={cls.content}
      >
        <header data-slot="dialog-header" className={cls.header}>
          <div className={cls.heading}>
            <h2 id={titleId} className={cls.title}>
              {dialogs.recoverUnsavedWork}
            </h2>
          </div>
          <button
            type="button"
            className={cls.close}
            aria-label={dialogs.close}
            onClick={() => request.resolve(false)}
          >
            <X className="size-3.5" />
          </button>
        </header>
        <div data-slot="dialog-body" className={cls.body}>
          <p className={cls.description}>
            {dialogs.unsavedLocalDraftPrompt({ name: request.documentName })}
          </p>
        </div>
        <footer data-slot="dialog-footer" className={cls.footer}>
          <AppButton variant="ghost" onClick={() => request.resolve(false)}>
            {dialogs.discard}
          </AppButton>
          <AppButton color="primary" variant="solid" onClick={() => request.resolve(true)}>
            {dialogs.restore}
          </AppButton>
        </footer>
      </div>
    </>,
    document.body
  )
}
