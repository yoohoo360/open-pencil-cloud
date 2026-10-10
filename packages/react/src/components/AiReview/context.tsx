import { closeComments } from '#react/app/document/comments/actions'
import { registerAiReviewActions } from '#react/app/document/ai-review/actions'
import { runAiReview } from '#react/app/document/ai-review/ai'
import {
  createAiReviewDraft,
  markerAnchor,
  mergeSelectedMarkers,
  removeMarker
} from '#react/app/document/ai-review/markers'
import { persistAiReview } from '#react/app/document/ai-review/persist'
import { withSkillSelection } from '#react/app/document/ai-review/skills'
import type { AiReviewStreamArtifacts } from '#react/app/document/ai-review/stream-parse'
import type {
  AiReviewDraft,
  AiReviewList,
  AiReviewPayload,
  AiReviewRecord,
  AiReviewSkillSelection,
  AiReviewSummary
} from '#react/app/document/ai-review/types'
import {
  closeVersionHistory,
  openVersionHistory
} from '#react/app/document/version-history/actions'
import { useEditorStore } from '#react/app/editor/store'
import { useI18n } from '#react/i18n'
import { documentAPI, getAPIErrorMessage } from '#react/lib/client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'

export type AiReviewPhase = 'list' | 'setup' | 'running' | 'ready' | 'submitting' | 'detail'

type AiReviewState = {
  open: boolean
  loading: boolean
  phase: AiReviewPhase
  selectedId: string | null
  /** Canvas / list highlight for the active marker pin. */
  focusedMarkerId: string | null
  detail: AiReviewRecord | null
  draft: AiReviewDraft | null
  /** Payload after AI finished, waiting for Submit (not persisted yet). */
  pendingPayload: AiReviewPayload | null
  artifacts: AiReviewStreamArtifacts
  list: AiReviewList | null
  error: string | null
}

const EMPTY_ARTIFACTS: AiReviewStreamArtifacts = {
  thinking: '',
  analysis: '',
  findingsText: ''
}

const EMPTY: AiReviewState = {
  open: false,
  loading: false,
  phase: 'list',
  selectedId: null,
  focusedMarkerId: null,
  detail: null,
  draft: null,
  pendingPayload: null,
  artifacts: EMPTY_ARTIFACTS,
  list: null,
  error: null
}

export function useAiReviewState() {
  const store = useEditorStore()
  const { dialogs, locale: uiLocale } = useI18n()
  const [state, setState] = useState<AiReviewState>(EMPTY)
  const documentKey = store.state.documentKey
  const openRef = useRef(state.open)
  openRef.current = state.open
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    if (!documentKey) return
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const { data } = await documentAPI.listAiReviews(documentKey)
      setState((current) => ({
        ...current,
        loading: false,
        list: data,
        selectedId:
          current.selectedId && data.reviews.some((review) => review.id === current.selectedId)
            ? current.selectedId
            : null
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: getAPIErrorMessage(error, dialogs.aiReviewsLoadFailed)
      }))
    }
  }, [dialogs.aiReviewsLoadFailed, documentKey])

  const close = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setState((current) => ({
      ...EMPTY,
      open: false,
      list: current.list
    }))
  }, [])

  const openPanel = useCallback(() => {
    if (!store.state.documentKey) {
      store.state.actionToast = dialogs.aiReviewsNeedCloud
      store.notify()
      return
    }
    closeComments()
    closeVersionHistory()
    setState((current) => ({
      ...current,
      open: true,
      error: null,
      phase: current.phase === 'ready' || current.phase === 'setup' || current.phase === 'running'
        ? current.phase
        : 'list'
    }))
    void refresh()
  }, [dialogs.aiReviewsNeedCloud, refresh, store])

  const toggle = useCallback(() => {
    if (openRef.current) close()
    else openPanel()
  }, [close, openPanel])

  const selectReview = useCallback(
    async (review: AiReviewSummary) => {
      if (!documentKey) return
      abortRef.current?.abort()
      setState((current) => ({
        ...current,
        selectedId: review.id,
        draft: null,
        pendingPayload: null,
        artifacts: EMPTY_ARTIFACTS,
        phase: 'detail',
        loading: true,
        error: null
      }))
      try {
        const { data } = await documentAPI.getAiReview(documentKey, review.id)
        setState((current) => ({
          ...current,
          loading: false,
          detail: data,
          selectedId: data.id,
          phase: 'detail'
        }))
        if (data.payload.page_id && data.payload.page_id !== store.state.currentPageId) {
          void store.switchPage(data.payload.page_id)
        }
      } catch (error) {
        setState((current) => ({
          ...current,
          loading: false,
          error: getAPIErrorMessage(error, dialogs.aiReviewsLoadFailed)
        }))
      }
    },
    [dialogs.aiReviewsLoadFailed, documentKey, store]
  )

  const backToList = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setState((current) => ({
      ...current,
      selectedId: null,
      detail: null,
      draft: null,
      pendingPayload: null,
      artifacts: EMPTY_ARTIFACTS,
      phase: 'list',
      error: null
    }))
  }, [])

  const startDraft = useCallback(() => {
    abortRef.current?.abort()
    setState((current) => ({
      ...current,
      selectedId: null,
      detail: null,
      pendingPayload: null,
      artifacts: EMPTY_ARTIFACTS,
      draft: createAiReviewDraft(store.state.currentPageId),
      phase: 'setup',
      error: null
    }))
  }, [store])

  const setDraftRequirement = useCallback((requirement: string) => {
    setState((current) =>
      current.draft
        ? { ...current, draft: { ...current.draft, requirement } }
        : current
    )
  }, [])

  const setDraftTitle = useCallback((title: string) => {
    setState((current) =>
      current.draft ? { ...current, draft: { ...current.draft, title } } : current
    )
  }, [])

  const addSelectedMarkers = useCallback(() => {
    setState((current) => {
      if (!current.draft) return current
      const payload = mergeSelectedMarkers(store, current.draft.payload, store.state.selectedIds)
      return {
        ...current,
        draft: {
          ...current.draft,
          pageId: store.state.currentPageId,
          payload
        }
      }
    })
  }, [store])

  const removeDraftMarker = useCallback((markerId: string) => {
    setState((current) => {
      if (!current.draft) return current
      return {
        ...current,
        draft: {
          ...current.draft,
          payload: removeMarker(current.draft.payload, markerId)
        }
      }
    })
  }, [])

  const setDraftSkills = useCallback((skills: AiReviewSkillSelection) => {
    setState((current) => {
      if (!current.draft) return current
      return {
        ...current,
        draft: {
          ...current.draft,
          payload: withSkillSelection(current.draft.payload, skills)
        }
      }
    })
  }, [])

  const runAi = useCallback(async () => {
    const draft = state.draft
    if (!draft) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState((current) => ({
      ...current,
      phase: 'running',
      error: null,
      artifacts: EMPTY_ARTIFACTS,
      pendingPayload: null
    }))
    try {
      const requirementText = draft.requirement
      const basePayload: AiReviewPayload = {
        ...draft.payload,
        page_id: store.state.currentPageId,
        requirement: requirementText.trim()
          ? { content: requirementText.trim(), title: draft.title.trim() || undefined }
          : undefined
      }
      const result = await runAiReview({
        store,
        payload: basePayload,
        requirement: requirementText,
        locale: uiLocale,
        signal: controller.signal,
        onArtifacts: (artifacts) => setState((current) => ({ ...current, artifacts }))
      })
      setState((current) => ({
        ...current,
        phase: 'ready',
        artifacts: result.artifacts,
        pendingPayload: result.payload,
        draft: current.draft
          ? { ...current.draft, payload: result.payload, requirement: requirementText }
          : current.draft
      }))
    } catch (error) {
      if (controller.signal.aborted) return
      setState((current) => ({
        ...current,
        phase: 'setup',
        error: getAPIErrorMessage(error, dialogs.aiReviewRunFailed)
      }))
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [dialogs.aiReviewRunFailed, state.draft, store, uiLocale])

  const submitReview = useCallback(async () => {
    const draft = state.draft
    const payload = state.pendingPayload
    if (!draft || !payload) return
    setState((current) => ({ ...current, phase: 'submitting', error: null }))
    try {
      const saved = await persistAiReview({
        store,
        payload,
        title: draft.title,
        status: 'completed'
      })
      setState((current) => ({
        ...current,
        phase: 'detail',
        draft: null,
        pendingPayload: null,
        artifacts: EMPTY_ARTIFACTS,
        selectedId: saved.id,
        detail: saved,
        list: {
          reviews: [
            saved,
            ...(current.list?.reviews.filter((review) => review.id !== saved.id) ?? [])
          ]
        }
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        phase: 'ready',
        error: getAPIErrorMessage(error, dialogs.aiReviewSaveFailed)
      }))
    }
  }, [dialogs.aiReviewSaveFailed, state.draft, state.pendingPayload, store])

  const deleteReview = useCallback(
    async (reviewId: string) => {
      if (!documentKey) return
      try {
        await documentAPI.deleteAiReview(documentKey, reviewId)
        setState((current) => ({
          ...current,
          selectedId: current.selectedId === reviewId ? null : current.selectedId,
          detail: current.detail?.id === reviewId ? null : current.detail,
          phase: current.detail?.id === reviewId ? 'list' : current.phase,
          list: current.list
            ? { reviews: current.list.reviews.filter((review) => review.id !== reviewId) }
            : current.list
        }))
      } catch (error) {
        setState((current) => ({
          ...current,
          error: getAPIErrorMessage(error, dialogs.aiReviewDeleteFailed)
        }))
      }
    },
    [dialogs.aiReviewDeleteFailed, documentKey]
  )

  const openLinkedVersion = useCallback(() => {
    openVersionHistory()
  }, [])

  const selectMarker = useCallback(
    (markerId: string) => {
      const markers =
        state.detail?.payload.markers ??
        state.pendingPayload?.markers ??
        state.draft?.payload.markers ??
        []
      const marker = markers.find((item) => item.id === markerId)
      if (!marker) return
      setState((current) => ({ ...current, focusedMarkerId: markerId }))
      const anchor = markerAnchor(store, marker)
      if (!anchor) return
      if (store.graph.getNode(marker.node_id)) {
        store.select([marker.node_id])
      }
      store.centerOn(anchor.x + anchor.w / 2, anchor.y + anchor.h / 2)
    },
    [state.detail, state.draft, state.pendingPayload, store]
  )

  useEffect(() => {
    return registerAiReviewActions({
      open: openPanel,
      close,
      toggle
    })
  }, [close, openPanel, toggle])

  useEffect(() => {
    if (!state.open || !documentKey) return
    const timer = window.setInterval(() => {
      void refresh()
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [documentKey, refresh, state.open])

  const activeMarkers =
    state.detail?.payload.markers ??
    state.pendingPayload?.markers ??
    state.draft?.payload.markers ??
    []

  return useMemo(
    () => ({
      ...state,
      reviews: state.list?.reviews ?? [],
      activeMarkers,
      runningAi: state.phase === 'running',
      saving: state.phase === 'submitting',
      refresh,
      openPanel,
      close,
      toggle,
      selectReview,
      backToList,
      startDraft,
      setDraftRequirement,
      setDraftTitle,
      addSelectedMarkers,
      removeDraftMarker,
      setDraftSkills,
      runAi,
      submitReview,
      deleteReview,
      openLinkedVersion,
      selectMarker
    }),
    [
      activeMarkers,
      addSelectedMarkers,
      close,
      deleteReview,
      openLinkedVersion,
      openPanel,
      refresh,
      removeDraftMarker,
      setDraftSkills,
      runAi,
      submitReview,
      selectMarker,
      selectReview,
      setDraftRequirement,
      setDraftTitle,
      startDraft,
      backToList,
      state,
      toggle
    ]
  )
}

type AiReviewApi = ReturnType<typeof useAiReviewState>

const AiReviewContext = createContext<AiReviewApi | null>(null)

export function AiReviewProvider({ children }: { children: ReactNode }) {
  const value = useAiReviewState()
  return (
    <AiReviewContext.Provider value={value}>{children}</AiReviewContext.Provider>
  )
}

export function useAiReview(): AiReviewApi {
  const value = useContext(AiReviewContext)
  if (!value) {
    throw new Error('useAiReview must be used within AiReviewProvider')
  }
  return value
}

export function useOptionalAiReview(): AiReviewApi | null {
  return useContext(AiReviewContext)
}
