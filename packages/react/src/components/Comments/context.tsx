import { registerCommentActions } from '#react/app/document/comments/actions'
import type {
  CommentDraft,
  CommentFilter,
  DocumentCommentList,
  DocumentCommentThread
} from '#react/app/document/comments/types'
import { closeVersionHistory } from '#react/app/document/version-history/actions'
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

type CommentsState = {
  open: boolean
  loading: boolean
  saving: boolean
  filter: CommentFilter
  currentPageOnly: boolean
  selectedId: string | null
  draft: CommentDraft | null
  list: DocumentCommentList | null
  error: string | null
}

const EMPTY: CommentsState = {
  open: false,
  loading: false,
  saving: false,
  filter: 'open',
  currentPageOnly: true,
  selectedId: null,
  draft: null,
  list: null,
  error: null
}

export function useCommentsState() {
  const store = useEditorStore()
  const { dialogs } = useI18n()
  const [state, setState] = useState<CommentsState>(EMPTY)
  const documentKey = store.state.documentKey
  const pageId = store.state.currentPageId
  const openRef = useRef(state.open)
  openRef.current = state.open

  const refresh = useCallback(async () => {
    if (!documentKey) return
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
        const { data } = await documentAPI.listComments(documentKey)
        setState((current) => ({
          ...current,
          loading: false,
          list: data,
          selectedId:
            current.selectedId && data.threads.some((thread) => thread.id === current.selectedId)
              ? current.selectedId
              : null
        }))
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: getAPIErrorMessage(error, dialogs.commentsLoadFailed)
      }))
    }
  }, [dialogs.commentsLoadFailed, documentKey])

  const close = useCallback(() => {
    setState((current) => ({
      ...current,
      open: false,
      selectedId: null,
      draft: null,
      error: null
    }))
  }, [])

  const openPanel = useCallback(() => {
    if (!store.state.documentKey) {
      store.state.actionToast = dialogs.commentsNeedCloud
      store.notify()
      return
    }
    closeVersionHistory()
    setState((current) => ({
      ...current,
      open: true,
      error: null
    }))
    void refresh()
  }, [dialogs.commentsNeedCloud, refresh, store])

  const toggle = useCallback(() => {
    if (openRef.current) close()
    else openPanel()
  }, [close, openPanel])

  const cancel = useCallback(() => {
    if (!openRef.current) return false
    let handled = false
    setState((current) => {
      if (current.draft) {
        handled = true
        return { ...current, draft: null }
      }
      if (current.selectedId) {
        handled = true
        return { ...current, selectedId: null }
      }
      handled = true
      return {
        ...current,
        open: false,
        selectedId: null,
        draft: null,
        error: null
      }
    })
    return handled
  }, [])

  const selectThread = useCallback(
    (thread: DocumentCommentThread) => {
      setState((current) => ({ ...current, selectedId: thread.id, draft: null }))
      if (thread.page_id !== store.state.currentPageId) {
        void store.switchPage(thread.page_id)
      }
      const viewport = store.getViewportSize()
      store.state.panX = viewport.width / 2 - thread.x * store.state.zoom
      store.state.panY = viewport.height / 2 - thread.y * store.state.zoom
      store.requestRepaint()
    },
    [store]
  )

  const startDraft = useCallback(
    (x: number, y: number) => {
      setState((current) => ({
        ...current,
        selectedId: null,
        draft: { pageId: store.state.currentPageId, x, y }
      }))
    },
    [store]
  )

  const createThread = useCallback(
    async (body: string) => {
      const draft = state.draft
      if (!documentKey || !draft) return
      setState((current) => ({ ...current, saving: true, error: null }))
      try {
        const { data } = await documentAPI.createCommentThread(documentKey, {
          page_id: draft.pageId,
          x: draft.x,
          y: draft.y,
          body
        })
        setState((current) => ({
          ...current,
          saving: false,
          draft: null,
          selectedId: data.id,
          list: {
            threads: [data, ...(current.list?.threads.filter((thread) => thread.id !== data.id) ?? [])]
          }
        }))
      } catch (error) {
        setState((current) => ({
          ...current,
          saving: false,
          error: getAPIErrorMessage(error, dialogs.commentSaveFailed)
        }))
      }
    },
    [dialogs.commentSaveFailed, documentKey, state.draft]
  )

  const reply = useCallback(
    async (threadId: string, body: string) => {
      if (!documentKey) return
      setState((current) => ({ ...current, saving: true, error: null }))
      try {
        const { data } = await documentAPI.replyToComment(documentKey, threadId, { body })
        setState((current) => ({
          ...current,
          saving: false,
          list: current.list
            ? {
                threads: current.list.threads.map((thread) =>
                  thread.id === threadId
                    ? {
                        ...thread,
                        updated_at: data.created_at,
                        comments: [...thread.comments, data]
                      }
                    : thread
                )
              }
            : current.list
        }))
      } catch (error) {
        setState((current) => ({
          ...current,
          saving: false,
          error: getAPIErrorMessage(error, dialogs.commentSaveFailed)
        }))
      }
    },
    [dialogs.commentSaveFailed, documentKey]
  )

  const resolveThread = useCallback(
    async (threadId: string, resolved: boolean) => {
      if (!documentKey) return
      try {
        const { data } = await documentAPI.resolveCommentThread(documentKey, threadId, { resolved })
        setState((current) => ({
          ...current,
          selectedId: resolved && current.filter === 'open' ? null : current.selectedId,
          list: current.list
            ? {
                threads: current.list.threads.map((thread) => (thread.id === threadId ? data : thread))
              }
            : current.list
        }))
      } catch (error) {
        setState((current) => ({
          ...current,
          error: getAPIErrorMessage(error, dialogs.commentUpdateFailed)
        }))
      }
    },
    [dialogs.commentUpdateFailed, documentKey]
  )

  const deleteComment = useCallback(
    async (threadId: string, commentId: string) => {
      if (!documentKey) return
      try {
        await documentAPI.deleteComment(documentKey, threadId, commentId)
        setState((current) => {
          if (!current.list) return current
          const threads = current.list.threads
            .map((thread) => {
              if (thread.id !== threadId) return thread
              const comments = thread.comments.filter((comment) => comment.id !== commentId)
              if (comments.length === 0) return null
              return { ...thread, comments }
            })
            .filter((thread): thread is DocumentCommentThread => thread != null)
          return {
            ...current,
            selectedId: threads.some((thread) => thread.id === current.selectedId)
              ? current.selectedId
              : null,
            list: { threads }
          }
        })
      } catch (error) {
        setState((current) => ({
          ...current,
          error: getAPIErrorMessage(error, dialogs.commentDeleteFailed)
        }))
      }
    },
    [dialogs.commentDeleteFailed, documentKey]
  )

  useEffect(() => {
    return registerCommentActions({
      open: openPanel,
      close,
      toggle,
      cancel
    })
  }, [cancel, close, openPanel, toggle])

  useEffect(() => {
    if (!state.open || !documentKey) return
    const timer = window.setInterval(() => void refresh(), 15_000)
    return () => window.clearInterval(timer)
  }, [documentKey, refresh, state.open])

  const threads = useMemo(() => {
    const all = state.list?.threads ?? []
    const resolved = state.filter === 'resolved'
    return all.filter((thread) => {
      if (thread.resolved !== resolved) return false
      if (state.currentPageOnly && thread.page_id !== pageId) return false
      return true
    })
  }, [pageId, state.currentPageOnly, state.filter, state.list])

  const selectedThread = threads.find((thread) => thread.id === state.selectedId) ??
    state.list?.threads.find((thread) => thread.id === state.selectedId) ??
    null

  const pagePins = useMemo(() => {
    const all = state.list?.threads ?? []
    return all.filter((thread) => thread.page_id === pageId && thread.resolved === (state.filter === 'resolved'))
  }, [pageId, state.filter, state.list])

  return {
    ...state,
    threads,
    selectedThread,
    pagePins,
    refresh,
    openPanel,
    close,
    toggle,
    cancel,
    setFilter: (filter: CommentFilter) => setState((current) => ({ ...current, filter, selectedId: null })),
    setCurrentPageOnly: (currentPageOnly: boolean) =>
      setState((current) => ({ ...current, currentPageOnly })),
    selectThread,
    startDraft,
    clearDraft: () => setState((current) => ({ ...current, draft: null })),
    createThread,
    reply,
    resolveThread,
    deleteComment
  }
}

export type CommentsContextValue = ReturnType<typeof useCommentsState>

const CommentsContext = createContext<CommentsContextValue | null>(null)

export function CommentsProvider({ children }: { children?: ReactNode }) {
  const value = useCommentsState()
  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>
}

export function useComments(): CommentsContextValue {
  const value = useContext(CommentsContext)
  if (!value) throw new Error('Comments must be used within CommentsProvider')
  return value
}

export function useOptionalComments(): CommentsContextValue | null {
  return useContext(CommentsContext)
}
