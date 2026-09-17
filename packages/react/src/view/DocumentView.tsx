import {
  closeDocumentShareDialog,
  openDocumentShareDialog,
  setDocumentAccess,
  useDocumentShareDialogOpen
} from '#react/app/document/access'
import { useCloudDocumentPersist } from '#react/app/document/cloud-persist'
import { loadDocumentLibraries } from '#react/app/document/libraries'
import { openHttpDocument } from '#react/app/document/open-http'
import { requestLocalFontAccess } from '#react/app/editor/fonts'
import { createEditorStore, EditorStoreProvider } from '#react/app/editor/store'
import { DocumentShareDialog } from '#react/components/DocumentShareDialog'
import { OpenPencilProvider } from '#react/editor/context'
import { EditorWorkspace } from '#react/editor/EditorWorkspace'
import { documentAPI, getAPIErrorMessage } from '#react/lib/client'
import { Check, Copy, Link2, Lock, Shield } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

export default function DocumentView() {
  const { fileKey } = useParams<{ fileKey: string }>()
  const store = useMemo(() => createEditorStore(), [])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [collabRoomId, setCollabRoomId] = useState<string | null>(null)
  const shareOpen = useDocumentShareDialogOpen()

  useEffect(() => {
    if (!fileKey) {
      setCollabRoomId(null)
      return
    }
    if (!loading && !forbidden && !notFound) setCollabRoomId(fileKey)
  }, [fileKey, loading, forbidden, notFound])

  useEffect(() => {
    if (!fileKey) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setForbidden(false)
    setNotFound(false)
    setDocumentAccess(null)
    void (async () => {
      try {
        const { data: documentMeta } = await documentAPI.get(fileKey)
        if (cancelled) return
        try {
          const access = await documentAPI.getAccess(fileKey)
          if (!cancelled && access.data) setDocumentAccess(access.data)
        } catch {
          // Access snapshot is optional if get already succeeded.
        }
        try {
          await requestLocalFontAccess()
          await openHttpDocument(store, documentMeta)
          await loadDocumentLibraries(store, fileKey)
          store.notify()
        } catch (reason) {
          console.warn('[Document] Remote fig is unavailable, opening empty canvas', reason)
        }
      } catch (reason) {
        if (cancelled) return
        const message = getAPIErrorMessage(reason, 'Failed to open document')
        const status = (reason as { response?: { status?: number } })?.response?.status
        if (status === 403) {
          setForbidden(true)
        } else if (status === 404) {
          setNotFound(true)
        }
        setLoadError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      setDocumentAccess(null)
      closeDocumentShareDialog()
    }
  }, [fileKey, store])

  useCloudDocumentPersist(
    store,
    Boolean(fileKey) && !loading && !loadError && !forbidden && !notFound
  )

  if (!loading && fileKey && (forbidden || notFound)) {
    return (
      <DocumentAccessGate
        fileKey={fileKey}
        mode={notFound ? 'not-found' : 'forbidden'}
        message={loadError}
      />
    )
  }

  return (
    <EditorStoreProvider store={store}>
      <OpenPencilProvider editor={store}>
        <main
          className="relative flex h-full min-h-0 w-full flex-col bg-canvas"
          data-test-id="editor-root"
        >
          {loadError && !forbidden && !notFound ? (
            <div
              className="flex items-center justify-between gap-3 border-b border-danger/20 bg-danger/10 px-4 py-2 text-xs text-danger"
              role="alert"
            >
              <span>{loadError}</span>
              {fileKey ? (
                <button
                  type="button"
                  className="shrink-0 rounded border border-danger/30 px-2 py-1 text-[11px] hover:bg-danger/10"
                  onClick={() => openDocumentShareDialog()}
                >
                  Share
                </button>
              ) : null}
            </div>
          ) : null}
          {loading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-canvas/60 text-sm text-muted">
              加载文档中...
            </div>
          ) : null}
          <EditorWorkspace collabRoomId={collabRoomId} />
          {fileKey ? (
            <DocumentShareDialog
              fileKey={fileKey}
              open={shareOpen}
              onClose={() => closeDocumentShareDialog()}
            />
          ) : null}
        </main>
      </OpenPencilProvider>
    </EditorStoreProvider>
  )
}

function DocumentAccessGate({
  fileKey,
  mode,
  message
}: {
  fileKey: string
  mode: 'forbidden' | 'not-found'
  message: string | null
}) {
  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/design/${fileKey}` : `/design/${fileKey}`
  const [copied, setCopied] = useState(false)
  const [role, setRole] = useState<'read' | 'write'>('write')
  const [requestMessage, setRequestMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy link')
    }
  }

  async function submitRequest(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await documentAPI.requestAccess(fileKey, {
        role,
        message: requestMessage.trim() || undefined
      })
      setSent(true)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, 'Could not send access request'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex h-full min-h-0 items-center justify-center bg-canvas px-4 text-surface">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-border/60 p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            {mode === 'not-found' ? <Lock className="size-5" /> : <Shield className="size-5" />}
          </span>
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold tracking-tight">
              {mode === 'not-found' ? 'File not found' : 'You need access'}
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {mode === 'not-found'
                ? 'This file does not exist or is no longer available.'
                : 'Ask the owner for permission to open this design.'}
            </p>
            {message && mode === 'forbidden' ? (
              <p className="mt-1 text-[11px] text-muted">{message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border/50 bg-hover/20 p-3">
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted">
            <Link2 className="size-3.5" />
            File link
          </div>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-border/50 bg-canvas px-2.5 py-2 font-mono text-[11px]">
              {shareUrl}
            </code>
            <button
              type="button"
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted hover:bg-hover hover:text-surface"
              onClick={() => void copyLink()}
            >
              {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="truncate text-[11px] text-muted">Key · {fileKey}</p>
        </div>

        {mode === 'forbidden' ? (
          sent ? (
            <div className="space-y-3 rounded-xl border border-accent/25 bg-accent/5 p-4 text-[13px]">
              <p className="font-medium text-accent">Request sent</p>
              <p className="text-muted">
                An owner or admin will review your request. You can keep this link and try again later.
              </p>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={(event) => void submitRequest(event)}>
              <label className="block text-[11px] font-medium text-muted">
                Access level
                <select
                  value={role}
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-canvas px-2.5 text-[13px] text-surface focus:border-accent focus:outline-none"
                  onChange={(event) => setRole(event.target.value as 'read' | 'write')}
                >
                  <option value="read">Can view</option>
                  <option value="write">Can edit</option>
                </select>
              </label>
              <label className="block text-[11px] font-medium text-muted">
                Message
                <textarea
                  value={requestMessage}
                  rows={3}
                  placeholder="Optional note to the owner"
                  className="mt-1 w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-[13px] text-surface focus:border-accent focus:outline-none"
                  onChange={(event) => setRequestMessage(event.target.value)}
                />
              </label>
              {error ? (
                <p className="text-xs text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="flex h-9 w-full items-center justify-center rounded-lg bg-accent text-[13px] font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Sending…' : 'Request access'}
              </button>
            </form>
          )
        ) : null}

        <div className="pt-1">
          <Link to="/dashboard" className="text-[12px] text-muted hover:text-surface">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
