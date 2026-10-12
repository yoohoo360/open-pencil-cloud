import { useEffect, useMemo, useRef, useState } from 'react'

import {
  MAKE_SANDBOX_NAME,
  MakeSandboxMessageType,
  makeSandboxPreviewURL,
  newMakeSandboxSessionId,
  postMakeSandboxFileChange,
  postMakeSandboxProjectInit,
  readMakeSandboxMessage,
  sandboxSourceFiles,
  type MakeSandboxProject
} from '#react/app/make/sandbox'
import { useI18n } from '#react/i18n'

export function MakeSandboxPreview({
  serverURL,
  project,
  title,
  reloadToken = 0,
  /** When false, keep the iframe mounted but do not push file changes (e.g. while AI streams). */
  live = true,
  onLockFileChange
}: {
  serverURL: string
  project: MakeSandboxProject
  title: string
  /** Bump to force a full iframe remount + rebundle. */
  reloadToken?: number
  live?: boolean
  onLockFileChange?: (lockJson: string) => void
}) {
  const { panels } = useI18n()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const projectReadyRef = useRef(false)
  const projectRef = useRef(project)
  const onLockFileChangeRef = useRef(onLockFileChange)
  const [sessionId, setSessionId] = useState(() => newMakeSandboxSessionId())
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  projectRef.current = project
  onLockFileChangeRef.current = onLockFileChange
  const sourceKey = useMemo(
    () => sandboxSourceFiles(project).map((file) => `${file.filename}\0${file.code}`).join('\n'),
    [project]
  )

  const src = useMemo(
    () => makeSandboxPreviewURL(serverURL, MAKE_SANDBOX_NAME, sessionId),
    [serverURL, sessionId]
  )

  useEffect(() => {
    setSessionId(newMakeSandboxSessionId())
    projectReadyRef.current = false
    setStatus('loading')
    setError('')
  }, [serverURL, reloadToken])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return
      const message = readMakeSandboxMessage(event.data)
      if (!message) return
      if (message.name && message.name !== MAKE_SANDBOX_NAME) return

      if (message.type === MakeSandboxMessageType.Init) {
        const target = iframeRef.current?.contentWindow
        if (!target) return
        postMakeSandboxProjectInit(target, MAKE_SANDBOX_NAME, projectRef.current)
        projectReadyRef.current = true
        setStatus('loading')
        return
      }

      if (message.type === MakeSandboxMessageType.ProjectLockFileChange) {
        const data = message.payload?.data
        if (typeof data === 'string' && data.trim()) {
          onLockFileChangeRef.current?.(data)
        }
        return
      }

      if (message.type === MakeSandboxMessageType.BuildSuccess) {
        setStatus('ready')
        setError('')
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [sessionId])

  useEffect(() => {
    if (!live || !projectReadyRef.current) return
    const target = iframeRef.current?.contentWindow
    if (!target) return
    setStatus('loading')
    postMakeSandboxFileChange(target, MAKE_SANDBOX_NAME, project.files)
  }, [project, sourceKey, live])

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-200">
      {status === 'loading' ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-2 py-1 text-[10px] text-muted">
          {panels.makeSandboxBundling}
        </div>
      ) : null}
      {error ? (
        <p
          className="m-3 rounded border border-danger/40 bg-danger/10 p-2 text-[11px] text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <iframe
        ref={iframeRef}
        key={sessionId}
        title={title}
        data-test-id="make-preview-frame"
        className="min-h-[220px] flex-1 border-0 bg-neutral-200"
        src={src}
        onError={() => {
          setStatus('error')
          setError('Failed to load sandbox preview iframe')
        }}
      />
    </div>
  )
}
