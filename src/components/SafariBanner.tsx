import { memo, useMemo } from 'react'

import { useLocalStorage } from '#react/shared/dom/hooks'
import { IS_BROWSER, IS_TAURI } from '@/constants'

export const SafariBanner = memo(function SafariBanner() {
  const [dismissed, setDismissed] = useLocalStorage('safari-banner-dismissed', false)
  const show = useMemo(
    () => !IS_TAURI && IS_BROWSER && !window.showSaveFilePicker,
    []
  )

  if (!show || dismissed) return null

  return (
    <div
      data-test-id="safari-banner"
      className="flex items-center gap-2 border-b border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-1.5 text-xs text-[var(--color-warning-text)]"
    >
      <span className="flex-1">
        Your browser doesn&apos;t support the local file API. Files will be downloaded instead of
        saved in place.{' '}
        <a href="https://www.google.com/chrome/" target="_blank" className="font-medium underline">
          Use Chrome
        </a>{' '}
        or Edge for full support.
      </span>
      <button
        type="button"
        data-test-id="safari-banner-dismiss"
        className="shrink-0 rounded px-1.5 py-0.5 font-medium text-[var(--color-warning-action)] transition-colors hover:bg-amber-500/20"
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </button>
    </div>
  )
})

SafariBanner.displayName = 'SafariBanner'
export default SafariBanner
