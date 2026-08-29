import { useCallback, useMemo, useState } from 'react'

import type { LocalFontAccessState } from '@open-pencil/core/text'

import {
  localFontAccessLabel,
  localFontAccessState,
  requestLocalFontAccess
} from '#react/app/editor/fonts'
import { useI18n } from '#react/i18n'

export function useFontSettings() {
  const { dialogs } = useI18n()
  const [open, setOpen] = useState(false)
  const [accessState, setAccessState] = useState<LocalFontAccessState>(localFontAccessState)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const accessStateLabel = useMemo(
    () =>
      localFontAccessLabel(accessState, {
        enabled: dialogs.enabled,
        denied: dialogs.denied,
        unavailable: dialogs.unavailable,
        notRequested: dialogs.notRequested
      }),
    [accessState, dialogs.denied, dialogs.enabled, dialogs.notRequested, dialogs.unavailable]
  )
  const canRequestLocalFonts = accessState === 'prompt' || accessState === 'denied'

  const refresh = useCallback(() => {
    setAccessState(localFontAccessState())
  }, [])

  const setPopoverOpen = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next) {
        setStatus('')
        refresh()
      }
    },
    [refresh]
  )

  const requestAccess = useCallback(async () => {
    setBusy(true)
    setStatus('')
    try {
      await requestLocalFontAccess()
      setAccessState(localFontAccessState())
      setStatus(dialogs.localFontAccessEnabled)
    } catch {
      setAccessState(localFontAccessState())
      setStatus(dialogs.localFontAccessNotGranted)
    } finally {
      setBusy(false)
    }
  }, [dialogs.localFontAccessEnabled, dialogs.localFontAccessNotGranted])

  return {
    open,
    setPopoverOpen,
    accessState,
    accessStateLabel,
    canRequestLocalFonts,
    busy,
    status,
    refresh,
    requestAccess
  }
}
