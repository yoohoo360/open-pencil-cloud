import { closeComments } from '#react/app/document/comments/actions'
import { applyFigBytes } from '#react/app/document/open-http'
import { uploadOSSFig } from '#react/app/document/oss'
import { registerVersionHistoryActions } from '#react/app/document/version-history/actions'
import {
  downloadVersionFig,
  recordDocumentVersion
} from '#react/app/document/version-history/record'
import type {
  DocumentVersion,
  DocumentVersionList,
  VersionHistorySelection
} from '#react/app/document/version-history/types'
import { useEditorStore } from '#react/app/editor/store'
import { exportCurrentFig } from '#react/app/shell/menu/files'
import { useI18n } from '#react/i18n'
import { documentAPI, getAPIErrorMessage } from '#react/lib/client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'

type VersionHistoryState = {
  open: boolean
  loading: boolean
  saving: boolean
  restoring: boolean
  saveDialogOpen: boolean
  autosavesExpanded: boolean
  selectedId: VersionHistorySelection
  list: DocumentVersionList | null
  error: string | null
}

const EMPTY: VersionHistoryState = {
  open: false,
  loading: false,
  saving: false,
  restoring: false,
  saveDialogOpen: false,
  autosavesExpanded: false,
  selectedId: 'current',
  list: null,
  error: null
}

function findVersion(list: DocumentVersionList | null, id: string): DocumentVersion | null {
  if (!list) return null
  return (
    list.autosaves.find((item) => item.id === id) ??
    list.named.find((item) => item.id === id) ??
    null
  )
}

export function useVersionHistoryState() {
  const store = useEditorStore()
  const { dialogs } = useI18n()
  const [state, setState] = useState<VersionHistoryState>(EMPTY)
  const liveFigRef = useRef<Uint8Array | null>(null)
  const selectedIdRef = useRef<VersionHistorySelection>('current')
  selectedIdRef.current = state.selectedId

  const documentKey = store.state.documentKey

  const refresh = useCallback(
    async (namedBefore?: number) => {
      if (!documentKey) return
      setState((current) => ({ ...current, loading: true, error: null }))
      try {
        const { data } = await documentAPI.listVersions(documentKey, {
          named_before: namedBefore,
          named_limit: 20
        })
        setState((current) => ({
          ...current,
          loading: false,
          list:
            namedBefore && current.list
              ? {
                  ...data,
                  named: [...current.list.named, ...data.named],
                  autosaves: data.autosaves,
                  autosave_count: data.autosave_count,
                  current_updated_at: data.current_updated_at
                }
              : data
        }))
      } catch (error) {
        setState((current) => ({
          ...current,
          loading: false,
          error: getAPIErrorMessage(error, dialogs.versionHistoryLoadFailed)
        }))
      }
    },
    [documentKey, dialogs.versionHistoryLoadFailed]
  )

  const restoreLiveGraph = useCallback(async () => {
    const backup = liveFigRef.current
    liveFigRef.current = null
    store.state.historyPreviewId = null
    store.notify()
    if (!backup) return
    store.state.loading = true
    store.notify()
    try {
      await applyFigBytes(store, backup, `${store.state.documentName || 'Untitled'}.fig`)
    } finally {
      store.state.loading = false
      store.notify()
    }
  }, [store])

  const close = useCallback(() => {
    setState((current) => ({
      ...current,
      open: false,
      saveDialogOpen: false,
      selectedId: 'current',
      error: null
    }))
    if (store.state.historyPreviewId) void restoreLiveGraph()
  }, [restoreLiveGraph, store])

  const openPanel = useCallback(() => {
    if (!store.state.documentKey) {
      store.state.actionToast = dialogs.versionHistoryNeedsCloud
      store.notify()
      return
    }
    closeComments()
    setState((current) => ({
      ...current,
      open: true,
      selectedId: 'current',
      autosavesExpanded: false,
      error: null
    }))
    void refresh()
  }, [dialogs.versionHistoryNeedsCloud, refresh, store])

  const selectCurrent = useCallback(async () => {
    setState((current) => ({ ...current, selectedId: 'current' }))
    if (store.state.historyPreviewId) await restoreLiveGraph()
  }, [restoreLiveGraph, store])

  const selectVersion = useCallback(
    async (version: DocumentVersion) => {
      setState((current) => ({ ...current, selectedId: version.id, error: null }))
      if (!store.state.historyPreviewId && !liveFigRef.current) {
        liveFigRef.current = await exportCurrentFig(store)
      }
      store.state.loading = true
      store.notify()
      try {
        const bytes = await downloadVersionFig(version.url)
        await applyFigBytes(store, bytes, `${store.state.documentName || 'Untitled'}.fig`)
        store.state.historyPreviewId = version.id
      } catch (error) {
        setState((current) => ({
          ...current,
          error: getAPIErrorMessage(error, dialogs.versionHistoryLoadFailed)
        }))
      } finally {
        store.state.loading = false
        store.notify()
      }
    },
    [dialogs.versionHistoryLoadFailed, store]
  )

  const saveNamed = useCallback(
    async (title?: string, description?: string) => {
      if (!store.state.documentKey) {
        store.state.actionToast = dialogs.versionHistoryNeedsCloud
        store.notify()
        return
      }
      if (store.state.historyPreviewId) return
      setState((current) => ({ ...current, saving: true, error: null }))
      try {
        const bytes = await exportCurrentFig(store)
        if (store.state.documentFigURL) {
          await uploadOSSFig(store.state.documentFigURL, bytes)
        }
        await recordDocumentVersion(store, 'named', bytes, title, description)
        setState((current) => ({ ...current, saving: false, saveDialogOpen: false }))
        await refresh()
      } catch (error) {
        setState((current) => ({
          ...current,
          saving: false,
          error: getAPIErrorMessage(error, dialogs.versionSaveFailed)
        }))
      }
    },
    [dialogs.versionHistoryNeedsCloud, dialogs.versionSaveFailed, refresh, store]
  )

  const requestSaveNamed = useCallback(() => {
    if (!store.state.documentKey) {
      store.state.actionToast = dialogs.versionHistoryNeedsCloud
      store.notify()
      return
    }
    if (store.state.historyPreviewId) return
    closeComments()
    setState((current) => ({ ...current, open: true, saveDialogOpen: true }))
    if (!state.open) void refresh()
  }, [dialogs.versionHistoryNeedsCloud, refresh, state.open, store])

  const restoreSelected = useCallback(async () => {
    const selected = state.selectedId
    if (selected === 'current' || !documentKey) return
    setState((current) => ({ ...current, restoring: true, error: null }))
    try {
      await documentAPI.restoreVersion(documentKey, selected)
      liveFigRef.current = null
      store.state.historyPreviewId = null
      setState((current) => ({ ...current, restoring: false, selectedId: 'current' }))
      await refresh()
    } catch (error) {
      setState((current) => ({
        ...current,
        restoring: false,
        error: getAPIErrorMessage(error, dialogs.versionRestoreFailed)
      }))
    } finally {
      store.notify()
    }
  }, [dialogs.versionRestoreFailed, documentKey, refresh, state.selectedId, store])

  const loadOlder = useCallback(() => {
    const last = state.list?.named.at(-1)?.created_at
    if (last === undefined) return
    void refresh(last)
  }, [refresh, state.list])

  useEffect(() => {
    return registerVersionHistoryActions({
      open: openPanel,
      close,
      saveNamed: requestSaveNamed
    })
  }, [openPanel, close, requestSaveNamed])

  const previewVersion = findVersion(state.list, store.state.historyPreviewId ?? '')

  return {
    ...state,
    previewVersion,
    openPanel,
    close,
    refresh,
    selectCurrent,
    selectVersion,
    requestSaveNamed,
    setSaveDialogOpen: (openDialog: boolean) => {
      setState((current) => ({ ...current, saveDialogOpen: openDialog }))
    },
    toggleAutosaves: () => {
      setState((current) => ({ ...current, autosavesExpanded: !current.autosavesExpanded }))
    },
    saveNamed,
    restoreSelected,
    loadOlder
  }
}

export type VersionHistoryContextValue = ReturnType<typeof useVersionHistoryState>

const VersionHistoryContext = createContext<VersionHistoryContextValue | null>(null)

export function VersionHistoryProvider({ children }: { children?: ReactNode }) {
  const value = useVersionHistoryState()
  return <VersionHistoryContext.Provider value={value}>{children}</VersionHistoryContext.Provider>
}

export function useVersionHistory(): VersionHistoryContextValue {
  const value = useContext(VersionHistoryContext)
  if (!value) throw new Error('Version history must be used within VersionHistoryProvider')
  return value
}

export function useOptionalVersionHistory(): VersionHistoryContextValue | null {
  return useContext(VersionHistoryContext)
}
