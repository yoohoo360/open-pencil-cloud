import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  FontFamilyOption,
  LocalFontAccessState,
  WebFontProviderId
} from '@open-pencil/core/text'
import { useI18n } from '@open-pencil/react'

import {
  clearDownloadedFontCache,
  downloadedFontCacheSummary,
  fontProviderSettings,
  localFontAccessState,
  onlineFontsEnabled,
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
  onlineFontsEnabled: { value: boolean; subscribe: (listener: () => void) => () => void }
  fontProviderSettings: { value: FontProviderSettings; subscribe: (listener: () => void) => () => void }
}

export type FontSettingsBusyAction = 'access' | 'download' | 'clear' | 'refresh'

const defaultActions: FontSettingsActions = {
  clearDownloadedFontCache,
  downloadedFontCacheSummary,
  localFontAccessState,
  predownloadFallbackFonts,
  requestLocalFontAccess,
  onlineFontsEnabled,
  fontProviderSettings
}

export function useFontSettings(actions: FontSettingsActions = defaultActions) {
  const { dialogs } = useI18n()
  const [cacheCount, setCacheCount] = useState(0)
  const [cacheByteLength, setCacheByteLength] = useState(0)
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<number | null>(null)
  const [accessState, setAccessState] = useState(actions.localFontAccessState())
  const [busyAction, setBusyAction] = useState<FontSettingsBusyAction | null>(null)
  const [status, setStatus] = useState('')
  const [onlineEnabled, setOnlineEnabled] = useState(actions.onlineFontsEnabled.value)
  const [providerSettings, setProviderSettings] = useState(actions.fontProviderSettings.value)

  useEffect(() => {
    return actions.onlineFontsEnabled.subscribe(() => {
      setOnlineEnabled(actions.onlineFontsEnabled.value)
    })
  }, [actions.onlineFontsEnabled])

  useEffect(() => {
    return actions.fontProviderSettings.subscribe(() => {
      setProviderSettings(actions.fontProviderSettings.value)
    })
  }, [actions.fontProviderSettings])

  const accessStateLabel = useMemo(() => {
    if (accessState === 'granted') return dialogs.enabled
    if (accessState === 'denied') return dialogs.denied
    if (accessState === 'unsupported') return dialogs.unavailable
    return dialogs.notRequested
  }, [accessState, dialogs.denied, dialogs.enabled, dialogs.notRequested, dialogs.unavailable])

  const cacheSize = useMemo(() => {
    if (cacheByteLength === 0) return '0 MB'
    return `${(cacheByteLength / 1024 / 1024).toFixed(1)} MB`
  }, [cacheByteLength])

  const cacheUpdatedLabel = useMemo(() => {
    if (cacheUpdatedAt === null) return dialogs.never
    return new Date(cacheUpdatedAt).toLocaleDateString()
  }, [cacheUpdatedAt, dialogs.never])

  const canRequestLocalFonts = useMemo(
    () => accessState === 'prompt' || accessState === 'denied',
    [accessState]
  )

  const refreshSummary = useCallback(async () => {
    setBusyAction((current) => current ?? 'refresh')
    try {
      const summary = await actions.downloadedFontCacheSummary()
      setCacheCount(summary.count)
      setCacheByteLength(summary.byteLength)
      setCacheUpdatedAt(summary.updatedAt)
      setAccessState(actions.localFontAccessState())
    } finally {
      setBusyAction((current) => (current === 'refresh' ? null : current))
    }
  }, [actions])

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
  }, [actions, dialogs.localFontAccessEnabled, dialogs.localFontAccessNotGranted])

  const setOnlineFontsEnabled = useCallback(
    (enabled: boolean) => {
      actions.onlineFontsEnabled.value = enabled
      setStatus(
        enabled ? dialogs.onlineFontProvidersEnabled : dialogs.onlineFontProvidersDisabled
      )
    },
    [actions.onlineFontsEnabled, dialogs.onlineFontProvidersDisabled, dialogs.onlineFontProvidersEnabled]
  )

  const setFontProviderEnabled = useCallback(
    (provider: WebFontProviderId, enabled: boolean) => {
      actions.fontProviderSettings.value = { ...actions.fontProviderSettings.value, [provider]: enabled }
      setStatus(
        enabled
          ? dialogs.fontProviderEnabled({ provider })
          : dialogs.fontProviderDisabled({ provider })
      )
    },
    [actions.fontProviderSettings, dialogs.fontProviderDisabled, dialogs.fontProviderEnabled]
  )

  const downloadFallbacks = useCallback(async () => {
    setBusyAction('download')
    setStatus('')
    try {
      await actions.predownloadFallbackFonts()
      await refreshSummary()
      setStatus(dialogs.fallbackFontsDownloaded)
    } catch {
      setStatus(dialogs.fallbackFontsDownloadFailed)
    } finally {
      setBusyAction(null)
    }
  }, [actions, dialogs.fallbackFontsDownloaded, dialogs.fallbackFontsDownloadFailed, refreshSummary])

  const clearCache = useCallback(async () => {
    setBusyAction('clear')
    setStatus('')
    try {
      await actions.clearDownloadedFontCache()
      await refreshSummary()
      setStatus(dialogs.downloadedFontCacheCleared)
    } catch {
      setStatus(dialogs.downloadedFontCacheClearFailed)
    } finally {
      setBusyAction(null)
    }
  }, [actions, dialogs.downloadedFontCacheClearFailed, dialogs.downloadedFontCacheCleared, refreshSummary])

  useEffect(() => {
    void refreshSummary()
  }, [refreshSummary])

  return {
    accessState,
    accessStateLabel,
    busyAction,
    canRequestLocalFonts,
    cacheCount,
    cacheSize,
    cacheUpdatedLabel,
    status,
    onlineFontsEnabled: onlineEnabled,
    fontProviderSettings: providerSettings,
    clearCache,
    downloadFallbacks,
    refreshSummary,
    requestAccess,
    setOnlineFontsEnabled,
    setFontProviderEnabled
  }
}
