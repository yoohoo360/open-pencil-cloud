import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Check, Copy, RotateCcw } from 'lucide-react'
import { tv } from 'tailwind-variants'

import { JSX_REFERENCE, selectionToJSX } from '@open-pencil/core/design-jsx'

import {
  commitDesignJSXSession,
  createDesignJSXEditSession,
  previewDesignJSX,
  resetDesignJSXPreview,
  type DesignJSXEditSession
} from '#react/app/code/live-preview'
import {
  commitDOMCodeSession,
  createDOMCodeSession,
  previewDOMCode,
  resetDOMCodePreview,
  type DOMCodeSession
} from '#react/app/code/dom-preview'
import { starterSourceFor, type CodeSource } from '#react/app/code/templates'
import { useEditorStore } from '#react/app/editor/store'
import { CodeEditor } from '#react/components/code-editor/CodeEditor'
import { AppButton } from '#react/components/ui/AppButton'
import { AppSelect } from '#react/components/ui/AppSelect'
import { Tip } from '#react/components/ui/Tip'
import { useI18n } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import statusTheme from '#react/theme/status'

async function copyText(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
  await navigator.clipboard.writeText(text)
}

export function CodePanel({ active = true }: { active?: boolean }) {
  const store = useEditorStore()
  const { dialogs } = useI18n()
  const [source, setSource] = useState<CodeSource>('design-jsx')
  const [draft, setDraft] = useState('')
  const [baseline, setBaseline] = useState('')
  const [status, setStatus] = useState<'idle' | 'updating' | 'updated' | 'error'>('idle')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedReference, setCopiedReference] = useState(false)
  const designSession = useRef<DesignJSXEditSession | null>(null)
  const domSession = useRef<DOMCodeSession | null>(null)
  const previewQueue = useRef(Promise.resolve())
  const pendingPreview = useRef<Promise<void> | undefined>(undefined)
  const commitPromise = useRef<Promise<void> | undefined>(undefined)
  const updateVersion = useRef(0)
  const disposing = useRef(false)
  const sourceRef = useRef(source)
  const draftRef = useRef(draft)
  const errorRef = useRef(error)
  sourceRef.current = source
  draftRef.current = draft
  errorRef.current = error

  const generatedJSX = useSceneComputed(() => {
    if (!active || source === 'html-css' || designSession.current) return ''
    void store.state.sceneVersion
    const ids = [...store.state.selectedIds]
    if (ids.length === 0) return starterSourceFor(source)
    return selectionToJSX(ids, store.graph, source === 'tailwind-jsx' ? 'tailwind' : 'openpencil')
  })

  const sourceOptions = useMemo(
    () => [
      { value: 'design-jsx' as const, label: dialogs.codeSourceDesignJSX },
      { value: 'tailwind-jsx' as const, label: dialogs.codeSourceTailwindJSX },
      { value: 'html-css' as const, label: dialogs.codeSourceHTMLCSS }
    ],
    [dialogs.codeSourceDesignJSX, dialogs.codeSourceHTMLCSS, dialogs.codeSourceTailwindJSX]
  )
  const readOnly = source === 'tailwind-jsx'
  const dirty = draft !== baseline
  const editorLabel =
    source === 'html-css' ? dialogs.codeEditorHTMLCSSLabel : dialogs.codeEditorDesignLabel
  const statusTone = status === 'error' ? 'error' : status === 'updated' ? 'success' : 'neutral'
  const statusStyles = tv(statusTheme)({ tone: statusTone })
  const statusText =
    status === 'updating'
      ? dialogs.codeUpdating
      : status === 'error'
        ? dialogs.codePreviewFailed
        : dirty
          ? dialogs.codeUpdatedLive
          : dialogs.jsxUpToDate

  const beginDesignSession = useCallback((): DesignJSXEditSession | null => {
    if (designSession.current) return designSession.current
    const result = createDesignJSXEditSession(store)
    if (!result.ok) {
      setStatus('error')
      setError(result.error)
      return null
    }
    designSession.current = result.session
    return result.session
  }, [store])

  const beginDOMSession = useCallback((): DOMCodeSession => {
    domSession.current ??= createDOMCodeSession(store)
    return domSession.current
  }, [store])

  const commitCurrentSession = useCallback(async () => {
    if (commitPromise.current) return commitPromise.current
    const operation = (async () => {
      await pendingPreview.current
      await previewQueue.current
      updateVersion.current += 1
      const design = designSession.current
      const dom = domSession.current
      designSession.current = null
      domSession.current = null
      if (design) commitDesignJSXSession(store, design)
      if (dom) commitDOMCodeSession(store, dom)
      pendingPreview.current = undefined
    })()
    commitPromise.current = operation
    try {
      await operation
    } finally {
      if (commitPromise.current === operation) commitPromise.current = undefined
    }
  }, [store])

  const runPreview = useCallback(
    async (version: number) => {
      if (version !== updateVersion.current || sourceRef.current === 'tailwind-jsx') return
      if (!draftRef.current.trim()) return
      setStatus('updating')
      setError('')
      let result: { ok: true } | { ok: false; error: string }
      if (sourceRef.current === 'html-css') {
        result = await previewDOMCode(store, beginDOMSession(), draftRef.current)
      } else {
        const session = beginDesignSession()
        result = session
          ? await previewDesignJSX(store, session, draftRef.current)
          : { ok: false, error: errorRef.current }
      }
      if (version !== updateVersion.current) return
      if (!result.ok) {
        setStatus('error')
        setError(result.error)
        return
      }
      setStatus('updated')
    },
    [beginDOMSession, beginDesignSession, store]
  )

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updateDraft(value: string) {
    setDraft(value)
    setError('')
    updateVersion.current += 1
    if (previewTimer.current) clearTimeout(previewTimer.current)
    const version = updateVersion.current
    previewTimer.current = setTimeout(() => {
      previewQueue.current = previewQueue.current.then(() => runPreview(version))
      pendingPreview.current = previewQueue.current
    }, 350)
  }

  async function resetDraft() {
    updateVersion.current += 1
    await pendingPreview.current
    await previewQueue.current
    const design = designSession.current
    const dom = domSession.current
    designSession.current = null
    domSession.current = null
    if (design) resetDesignJSXPreview(store, design)
    if (dom) resetDOMCodePreview(store, dom)
    pendingPreview.current = undefined
    setDraft(baseline)
    setError('')
    setStatus('idle')
  }

  async function changeSource(next: CodeSource) {
    if (next === source) return
    await commitCurrentSession()
    setSource(next)
    const initial = next === 'html-css' ? starterSourceFor(next) : generatedFor(next)
    setBaseline(initial)
    setDraft(initial)
    setError('')
    setStatus('idle')
  }

  function generatedFor(next: Exclude<CodeSource, 'html-css'>): string {
    const ids = [...store.state.selectedIds]
    if (ids.length === 0) return starterSourceFor(next)
    return selectionToJSX(ids, store.graph, next === 'tailwind-jsx' ? 'tailwind' : 'openpencil')
  }

  useEffect(() => {
    if (source === 'html-css' || designSession.current || dirty) return
    setBaseline(generatedJSX)
    setDraft(generatedJSX)
  }, [dirty, generatedJSX, source])

  useEffect(() => {
    return () => {
      disposing.current = true
      if (previewTimer.current) clearTimeout(previewTimer.current)
      void commitCurrentSession()
    }
  }, [commitCurrentSession])

  useEffect(() => {
    if (!active && !disposing.current) void commitCurrentSession()
  }, [active, commitCurrentSession])

  return (
    <div data-test-id="code-panel-root" className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <AppSelect
          value={source}
          options={sourceOptions}
          label={dialogs.codeSource}
          className="h-7 min-w-0 flex-1 text-[11px]"
          data-test-id="code-panel-source"
          onChange={changeSource}
        />
        {source !== 'html-css' ? (
          <Tip label={dialogs.copyJSXReference}>
            <AppButton
              color="neutral"
              variant="ghost"
              size="xs"
              shape="square"
              data-test-id="code-panel-copy-ref"
              onClick={() => {
                void copyText(JSX_REFERENCE).then(() => {
                  setCopiedReference(true)
                  setTimeout(() => setCopiedReference(false), 2000)
                })
              }}
            >
              {copiedReference ? (
                <Check className="size-3 text-[var(--color-success)]" />
              ) : (
                <BookOpen className="size-3" />
              )}
            </AppButton>
          </Tip>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CodeEditor
          value={draft}
          language={source}
          readOnly={readOnly}
          label={editorLabel}
          onChange={updateDraft}
        />
      </div>

      {error ? (
        <div
          role="alert"
          data-test-id="code-panel-error"
          className="shrink-0 border-t border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-3 py-2 text-[11px] leading-snug text-[var(--color-error)]"
        >
          {error}
        </div>
      ) : null}

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2">
        <span
          data-test-id="code-panel-status"
          data-tone={statusTone}
          className={`min-w-0 truncate ${statusStyles.text()}`}
        >
          {readOnly ? dialogs.codeGeneratedReadOnly : statusText}
        </span>
        <div className="flex items-center gap-1">
          {dirty && !readOnly ? (
            <AppButton
              color="neutral"
              variant="ghost"
              size="xs"
              data-test-id="code-panel-reset"
              onClick={() => void resetDraft()}
            >
              <RotateCcw className="size-3" />
              {dialogs.codeReset}
            </AppButton>
          ) : null}
          <AppButton
            color="neutral"
            variant="ghost"
            size="xs"
            data-test-id="code-panel-copy"
            onClick={() => {
              void copyText(draft).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              })
            }}
          >
            {copied ? (
              <Check className="size-3 text-[var(--color-success)]" />
            ) : (
              <Copy className="size-3" />
            )}
            {copied ? dialogs.copied : dialogs.copy}
          </AppButton>
        </div>
      </footer>
    </div>
  )
}
