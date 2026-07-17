import { useState, useCallback } from 'react'
import { useStore } from '@nanostores/react'

import type {
  FontFamilyOption,
  LocalFontAccessState,
  WebFontProviderId
} from '@open-pencil/core/text'
import { useI18n } from '@open-pencil/react'

import {
  clearDownloadedFontCache,
  downloadedFontCacheSummary,
  $fontProviderSettings,
  localFontAccessState,
  $onlineFontsEnabled,
  predownloadFallbackFonts,
  requestLocalFontAccess,
  type FontProviderSettings
} from '@/app/editor/fonts'
import type { DownloadedFontCacheSummary } from '@/app/editor/fonts/cache'

type FontCacheSummary = DownloadedFontCacheSummary

export interface FontSettingsActions {
  clearDownloadedFontCache: () => Promise<void>
  downloadedFontCacheSummary: () => Promise<FontCacheSummary>
  localFontAccessState: () => LocalFontAccessState
  predownloadFallbackFonts: () => Promise<unknown>
  requestLocalFontAccess: () => Promise<string[] | FontFamilyOption[]>
}

export type FontSettingsBusyAction = 'access' | 'download' | 'clear' | 'refresh'

const defaultActions: FontSettingsActions = {
  clearDownloadedFontCache,
  downloadedFontCacheSummary,
  localFontAccessState,
  predownloadFallbackFonts,
  requestLocalFontAccess
}

export function useFontSettings(actions: FontSettingsActions = defaultActions) {
  const { dialogs } = useI18n()
  const [cacheCount, setCacheCount] = useState(0)
  const [cacheByteLength, setCacheByteLength] = useState(0)
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<number | null>(null)
  const [accessState, setAccessState] = useState<LocalFontAccessState>(
    actions.localFontAccessState()
  )
  const [busyAction, setBusyAction] = useState<FontSettingsBusyAction | null>(null)
  const [status, setStatus] = useState('')

  const onlineFontsEnabled = useStore($onlineFontsEnabled)
  const fontProviderSettings = useStore($fontProviderSettings)

  const accessStateLabel = (() => {
    if (accessState === 'granted') return dialogs.enabled
    if (accessState === 'denied') return dialogs.denied
    if (accessState === 'unsupported') return dialogs.unavailable
    return dialogs.notRequested
  })()

  const cacheSize =
    cacheByteLength === 0 ? '0 MB' : `${(cacheByteLength / 1024 / 1024).toFixed(1)} MB`

  const cacheUpdatedLabel =
    cacheUpdatedAt === null ? dialogs.never : new Date(cacheUpdatedAt).toLocaleDateString()

  const canRequestLocalFonts = accessState === 'prompt' || accessState === 'denied'

  const refreshSummary = useCallback(
    async (currentBusy?: FontSettingsBusyAction | null) => {
      if (!currentBusy) setBusyAction('refresh')
      try {
        const summary = await actions.downloadedFontCacheSummary()
        setCacheCount(summary.count)
        setCacheByteLength(summary.byteLength)
        setCacheUpdatedAt(summary.updatedAt)
        setAccessState(actions.localFontAccessState())
      } finally {
        setBusyAction((b) => (b === 'refresh' ? null : b))
      }
    },
    [actions]
  )

  const requestAccess = useCallback(async () => {
    setBusyAction('access')
    setStatus('')
    try {
      await actions.requestLocalFontAccess()
      setAccessState(actions.localFontAccessState())
      setStatus(dialogs.localFontAccessEnabled)
    } catch {
      setAccessState(actions.localFontAccessState())
      setStatus(dialogs.localFontAccessNotGranted)
    } finally {
      setBusyAction(null)
    }
  }, [actions, dialogs])

  const setOnlineFontsEnabled = useCallback(
    (enabled: boolean) => {
      $onlineFontsEnabled.set(enabled)
      setStatus(
        enabled ? dialogs.onlineFontProvidersEnabled : dialogs.onlineFontProvidersDisabled
      )
    },
    [dialogs]
  )

  const setFontProviderEnabled = useCallback(
    (provider: WebFontProviderId, enabled: boolean) => {
      $fontProviderSettings.set({ ...$fontProviderSettings.get(), [provider]: enabled })
      setStatus(
        enabled
          ? dialogs.fontProviderEnabled({ provider })
          : dialogs.fontProviderDisabled({ provider })
      )
    },
    [dialogs]
  )

  const downloadFallbacks = useCallback(async () => {
    setBusyAction('download')
    setStatus('')
    try {
      await actions.predownloadFallbackFonts()
      await refreshSummary('download')
      setStatus(dialogs.fallbackFontsDownloaded)
    } catch {
      setStatus(dialogs.fallbackFontsDownloadFailed)
    } finally {
      setBusyAction(null)
    }
  }, [actions, dialogs, refreshSummary])

  const clearCache = useCallback(async () => {
    setBusyAction('clear')
    setStatus('')
    try {
      await actions.clearDownloadedFontCache()
      await refreshSummary('clear')
      setStatus(dialogs.downloadedFontCacheCleared)
    } catch {
      setStatus(dialogs.downloadedFontCacheClearFailed)
    } finally {
      setBusyAction(null)
    }
  }, [actions, dialogs, refreshSummary])

  return {
    accessState,
    accessStateLabel,
    busyAction,
    canRequestLocalFonts,
    cacheCount,
    cacheSize,
    cacheUpdatedLabel,
    status,
    onlineFontsEnabled,
    fontProviderSettings,
    clearCache,
    downloadFallbacks,
    refreshSummary: () => refreshSummary(null),
    requestAccess,
    setOnlineFontsEnabled,
    setFontProviderEnabled
  }
}
