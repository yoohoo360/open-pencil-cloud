import { useCallback, useState } from 'react'

import { IS_BROWSER, IS_TAURI } from '@/constants'

const STORAGE_KEY = 'safari-banner-dismissed'

function readDismissed(): boolean {
  if (!IS_BROWSER) return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch (err) {
    console.warn('Failed to read safari-banner-dismissed', err)
    return false
  }
}

function supportsSaveFilePicker(): boolean {
  return IS_BROWSER && typeof window.showSaveFilePicker === 'function'
}

/**
 * Warns browsers without the File System Access API (e.g. Safari) that saves
 * will download instead of writing in place.
 */
export function SafariBanner() {
  const [dismissed, setDismissed] = useState(readDismissed)
  const show = !IS_TAURI && IS_BROWSER && !supportsSaveFilePicker()

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    } catch (err) {
      console.warn('Failed to persist safari-banner-dismissed', err)
    }
  }, [])

  if (!show || dismissed) return null

  return (
    <div
      data-test-id="safari-banner"
      className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200"
    >
      <span className="flex-1">
        Your browser doesn&apos;t support the local file API. Files will be downloaded instead of
        saved in place.{' '}
        <a
          href="https://www.google.com/chrome/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Use Chrome
        </a>{' '}
        or Edge for full support.
      </span>
      <button
        type="button"
        data-test-id="safari-banner-dismiss"
        className="shrink-0 rounded px-1.5 py-0.5 text-amber-300 transition-colors hover:bg-amber-500/20"
        onClick={dismiss}
      >
        Dismiss
      </button>
    </div>
  )
}
