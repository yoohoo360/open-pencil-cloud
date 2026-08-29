import { openHttpDocument } from '#react/app/document/open-http'
import { requestLocalFontAccess } from '#react/app/editor/fonts'
import { createEditorStore, EditorStoreProvider } from '#react/app/editor/store'
import { OpenPencilProvider } from '#react/editor/context'
import { EditorWorkspace } from '#react/editor/EditorWorkspace'
import { documentAPI, getAPIErrorMessage } from '#react/lib/client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function DocumentView() {
  const { fileKey } = useParams<{ fileKey: string }>()
  const store = useMemo(() => createEditorStore(), [])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, _setLoading] = useState(true)

  const setLoading = (e: boolean) => {
    _setLoading(e)
  }
  useEffect(() => {
    if (!fileKey) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const { data: documentMeta } = await documentAPI.get(fileKey)
        if (cancelled) return
        try {
          await requestLocalFontAccess()
          await openHttpDocument(store, documentMeta)
        } catch (reason) {
          console.warn('[Document] Remote fig is unavailable, opening empty canvas', reason)
        }
      } catch (reason) {
        if (!cancelled) setLoadError(getAPIErrorMessage(reason, 'Failed to open document'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fileKey, store])

  return (
    <EditorStoreProvider store={store}>
      <OpenPencilProvider editor={store}>
        <main
          className="relative flex h-full min-h-0 w-full flex-col bg-canvas"
          data-test-id="editor-root"
        >
          {loadError ? (
            <div
              className="border-b border-danger/20 bg-danger/10 px-4 py-2 text-xs text-danger"
              role="alert"
            >
              {loadError}
            </div>
          ) : null}
          {loading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-canvas/60 text-sm text-muted">
              加载文档中...
            </div>
          ) : null}
          <EditorWorkspace />
        </main>
      </OpenPencilProvider>
    </EditorStoreProvider>
  )
}
