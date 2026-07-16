import * as Toast from '@radix-ui/react-toast'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import { TEST_IDS, testIdProps } from '@open-pencil/react'

import { toastStore, type Toast as ToastItem } from './toastStore'

function toastToneClass(variant: ToastItem['variant']): string {
  if (variant === 'error') {
    return 'border-red-500/40 bg-red-950/90 text-red-100'
  }
  if (variant === 'warning') {
    return 'border-amber-500/40 bg-amber-950/90 text-amber-100'
  }
  return 'border-border bg-panel text-surface'
}

export function AppToast() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, () => [])
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const copyError = useCallback(async (id: number, message: string) => {
    try {
      await navigator.clipboard.writeText(message)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500)
    } catch (err) {
      console.warn('Failed to copy toast error', err)
    }
  }, [])

  useEffect(() => {
    toastStore.setupGlobalErrorHandler()
  }, [])

  return (
    <Toast.Provider swipeDirection="up">
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          {...testIdProps(TEST_IDS.toastItem)}
          duration={t.variant === 'error' ? Number.POSITIVE_INFINITY : toastStore.TOAST_DURATION}
          className={`flex max-w-sm items-start gap-2 rounded-md border px-3 py-2 text-xs shadow-md ${toastToneClass(t.variant)}`}
          onOpenChange={(open) => {
            if (!open) toastStore.remove(t.id)
          }}
        >
          <Toast.Description className="min-w-0 flex-1 select-text">{t.message}</Toast.Description>
          {t.variant === 'error' ? (
            <>
              <button
                type="button"
                {...testIdProps(TEST_IDS.toastCopyError)}
                className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100"
                onClick={() => void copyError(t.id, t.message)}
              >
                {copiedId === t.id ? '✓' : '⎘'}
              </button>
              <Toast.Close
                {...testIdProps(TEST_IDS.toastClose)}
                className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100"
              >
                ×
              </Toast.Close>
            </>
          ) : null}
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed top-2 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-1.5" />
    </Toast.Provider>
  )
}
