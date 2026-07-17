import { useStore } from '@nanostores/react'
import { useState } from 'react'
import * as Toast from '@radix-ui/react-toast'
import { Check, Copy, TriangleAlert, X } from 'lucide-react'

import { Tip } from '@/components/ui/Tip'
import { toast } from '@/app/shell/ui'
import { useToastUI } from '@/components/ui/toast'
import type { ToastVariant } from '@/components/ui/toast'
import { useI18n } from '@open-pencil/react'

function toastClass(tone: ToastVariant) {
  if (tone === 'error') return useToastUI({ tone: 'error' }).base
  if (tone === 'warning') return useToastUI({ tone: 'warning' }).base
  return useToastUI({ tone: 'default' }).base
}

export function AppToast() {
  const toasts = useStore(toast.$toasts)
  const { dialogs } = useI18n()
  const [copied, setCopied] = useState(false)

  function copyText(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      return undefined
    })
  }

  return (
    <Toast.Provider swipeDirection="up">
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          data-test-id="toast-item"
          duration={t.variant === 'error' ? toast.ERROR_TOAST_DURATION : toast.TOAST_DURATION}
          className={toastClass(t.variant)}
          onOpenChange={(open) => {
            if (!open) toast.remove(t.id)
          }}
        >
          {t.variant === 'default' ? (
            <Check className="mt-0.5 size-3 shrink-0" />
          ) : (
            <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          )}
          <Toast.Description className="min-w-0 flex-1 select-text">
            {t.message}
            {t.count > 1 && <span className="ml-1.5 opacity-70">×{t.count}</span>}
          </Toast.Description>
          {t.variant !== 'default' && (
            <Tip label={copied ? dialogs.copiedExclamation : dialogs.copyMessage}>
              <button
                data-test-id="toast-copy-message"
                className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100"
                onClick={() => copyText(t.message)}
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              </button>
            </Tip>
          )}
          {t.variant !== 'default' && (
            <Toast.Close
              data-test-id="toast-close"
              className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100"
            >
              <X className="size-3" />
            </Toast.Close>
          )}
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed top-2 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-1.5" />
    </Toast.Provider>
  )
}
