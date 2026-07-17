import { useState } from 'react'

import { IS_BROWSER, IS_TAURI } from '@/constants'

const STORAGE_KEY = 'safari-banner-dismissed'

function isDismissed() {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

const show = !IS_TAURI && IS_BROWSER && !window.showSaveFilePicker

export function SafariBanner() {
  const [dismissed, setDismissed] = useState(isDismissed)

  if (!show || dismissed) return null

  function dismiss() {
    setDismissed(true)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }

  return (
    <div
      data-test-id="safari-banner"
      className="flex items-center gap-2 border-b border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-1.5 text-xs text-[var(--color-warning-text)]"
    >
      <span className="flex-1">
        Your browser doesn&apos;t support the local file API. Files will be downloaded instead of
        saved in place.{' '}
        <a href="https://www.google.com/chrome/" target="_blank" rel="noreferrer" className="font-medium underline">
          Use Chrome
        </a>{' '}
        or Edge for full support.
      </span>
      <button
        data-test-id="safari-banner-dismiss"
        className="shrink-0 rounded px-1.5 py-0.5 font-medium text-[var(--color-warning-action)] transition-colors hover:bg-amber-500/20"
        onClick={dismiss}
      >
        Dismiss
      </button>
    </div>
  )
}
