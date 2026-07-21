import IconLucideCheck from '~icons/lucide/check'
import IconLucideCopy from '~icons/lucide/copy'
import IconLucideTriangleAlert from '~icons/lucide/triangle-alert'
import IconLucideX from '~icons/lucide/x'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { useI18n } from '@open-pencil/react'
import { useClipboard } from '#react/shared/dom/hooks'
import { toast, useToasts } from '@/app/shell/ui'
import Tip from '@/components/ui/Tip'
import { useToastUI, type ToastVariant } from '@/components/ui/toast'

export const AppToast = memo(function AppToast() {
  const toasts = useToasts()
  const { copy } = useClipboard()
  const { dialogs } = useI18n()
  const [copied, setCopied] = useState(false)
  const defaultToastClass = useToastUI({ tone: 'default' }).base
  const warningToastClass = useToastUI({ tone: 'warning' }).base
  const errorToastClass = useToastUI({ tone: 'error' }).base

  const classFor = useCallback(
    (tone: ToastVariant) => {
      if (tone === 'error') return errorToastClass
      if (tone === 'warning') return warningToastClass
      return defaultToastClass
    },
    [defaultToastClass, errorToastClass, warningToastClass]
  )

  useEffect(() => {
    const timers = toasts.map((t) =>
      window.setTimeout(
        () => toast.remove(t.id),
        t.variant === 'error' ? toast.ERROR_TOAST_DURATION : toast.TOAST_DURATION
      )
    )
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [toasts])

  const copyMessage = useCallback(
    async (message: string) => {
      await copy(message)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    },
    [copy]
  )

  return (
    <div
      aria-live="polite"
      className="fixed top-2 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-1.5"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          data-test-id="toast-item"
          className={classFor(t.variant)}
        >
          {t.variant === 'default' ? (
            <IconLucideCheck className="mt-0.5 size-3 shrink-0" />
          ) : (
            <IconLucideTriangleAlert className="mt-0.5 size-3 shrink-0" />
          )}
          <span className="min-w-0 flex-1 select-text">
            {t.message}
            {t.count > 1 ? <span className="ml-1.5 opacity-70">×{t.count}</span> : null}
          </span>
          {t.variant !== 'default' ? (
            <Tip label={copied ? dialogs.copiedExclamation : dialogs.copyMessage}>
              <button
                type="button"
                data-test-id="toast-copy-message"
                className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100"
                onClick={() => void copyMessage(t.message)}
              >
                {copied ? <IconLucideCheck className="size-3" /> : <IconLucideCopy className="size-3" />}
              </button>
            </Tip>
          ) : null}
          {t.variant !== 'default' ? (
            <button
              type="button"
              data-test-id="toast-close"
              className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100"
              onClick={() => toast.remove(t.id)}
            >
              <IconLucideX className="size-3" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
})

AppToast.displayName = 'AppToast'
export default AppToast
