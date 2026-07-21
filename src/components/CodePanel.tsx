import IconLucideBookOpen from '~icons/lucide/book-open'
import IconLucideCheck from '~icons/lucide/check'
import IconLucideCopy from '~icons/lucide/copy'
import IconLucideFileInput from '~icons/lucide/file-input'
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'
import { memo, useMemo, useState } from 'react'

import { JSX_REFERENCE, selectionToJSX, type JSXFormat } from '@open-pencil/core/design-jsx'
import { useI18n, useSceneComputed } from '@open-pencil/react'
import { useEditorStore } from '@/app/editor/active-store'
import AppTextButton from '@/components/ui/AppTextButton'
import Tip from '@/components/ui/Tip'

export const CodePanel = memo(function CodePanel() {
  const store = useEditorStore()
  const { dialogs } = useI18n()
  const [jsxFormat, setJsxFormat] = useState<JSXFormat>('openpencil')
  const [showImporter, setShowImporter] = useState(false)
  const [importHTML, setImportHTML] = useState('')
  const [importCSS, setImportCSS] = useState('')
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  const jsxCode = useSceneComputed(() => {
    void store.state.sceneVersion
    const ids = [...store.state.selectedIds]
    if (ids.length === 0) return ''
    return selectionToJSX(ids, store.graph, jsxFormat)
  })

  const highlightedLines = useMemo(() => {
    if (!jsxCode) return []
    const grammar = Prism.languages.jsx ?? Prism.languages.javascript
    return jsxCode.split('\n').map((line) => Prism.highlight(line, grammar, 'jsx'))
  }, [jsxCode])

  const canImport = importHTML.trim().length > 0

  const errorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message
    return 'Import failed. Check the HTML and CSS, then try again.'
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(jsxCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const copyReference = async () => {
    await navigator.clipboard.writeText(JSX_REFERENCE)
    setCopiedRef(true)
    window.setTimeout(() => setCopiedRef(false), 2000)
  }

  const pasteImportHTML = async () => {
    try {
      setImportError('')
      setImportHTML(await navigator.clipboard.readText())
    } catch (error) {
      setImportError(errorMessage(error))
    }
  }

  const importCode = async () => {
    if (!canImport || importing) return
    try {
      setImporting(true)
      setImportError('')
      await store.importDOMText(importHTML, {
        cssText: importCSS.trim() || undefined
      })
    } catch (error) {
      setImportError(errorMessage(error))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div data-test-id="code-panel-root" className="flex min-h-0 flex-1 flex-col">
      {jsxCode ? (
        <div
          data-test-id="code-panel-header"
          className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted">JSX</span>
            <AppTextButton
              data-test-id="code-panel-format-toggle"
              ui={{ base: 'rounded px-1.5 py-0.5 text-[11px] hover:bg-hover' }}
              onClick={() => setJsxFormat((value) => (value === 'openpencil' ? 'tailwind' : 'openpencil'))}
            >
              {jsxFormat === 'openpencil' ? 'OpenPencil' : 'Tailwind'}
            </AppTextButton>
          </div>
          <div className="flex items-center gap-1">
            <AppTextButton
              data-test-id="code-panel-import-toggle"
              ui={{ base: 'flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-hover' }}
              onClick={() => setShowImporter((value) => !value)}
            >
              <IconLucideFileInput className="size-3" />
              Import
            </AppTextButton>
            <Tip label={dialogs.copyJSXReference}>
              <AppTextButton
                data-test-id="code-panel-copy-ref"
                ui={{ base: 'flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-hover' }}
                onClick={() => void copyReference()}
              >
                {copiedRef ? (
                  <IconLucideCheck className="size-3 text-[var(--color-success)]" />
                ) : (
                  <IconLucideBookOpen className="size-3" />
                )}
              </AppTextButton>
            </Tip>
            <AppTextButton
              data-test-id="code-panel-copy"
              ui={{ base: 'flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-hover' }}
              onClick={() => void copyCode()}
            >
              {copied ? (
                <IconLucideCheck className="size-3 text-[var(--color-success)]" />
              ) : (
                <IconLucideCopy className="size-3" />
              )}
              {copied ? dialogs.copied : dialogs.copy}
            </AppTextButton>
          </div>
        </div>
      ) : null}

      {showImporter || !jsxCode ? (
        <div data-test-id="code-panel-importer" className="shrink-0 border-b border-border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-medium text-surface">Import HTML/CSS</div>
              <div className="text-[11px] text-muted">
                Paste HTML plus optional CSS or compiled Tailwind CSS.
              </div>
            </div>
            <AppTextButton
              data-test-id="code-panel-paste-import"
              ui={{ base: 'rounded px-1.5 py-0.5 text-[11px] hover:bg-hover' }}
              onClick={() => void pasteImportHTML()}
            >
              Paste
            </AppTextButton>
          </div>
          <textarea
            value={importHTML}
            onChange={(event) => {
              setImportHTML(event.target.value)
              setImportError('')
            }}
            data-test-id="code-panel-import-html"
            className="mb-2 h-28 w-full resize-none rounded border border-border bg-panel px-2 py-1.5 font-mono text-xs text-surface outline-none placeholder:text-muted/50 focus:border-accent"
            placeholder='<div class="card">Hello</div>'
            spellCheck={false}
          />
          <textarea
            value={importCSS}
            onChange={(event) => {
              setImportCSS(event.target.value)
              setImportError('')
            }}
            data-test-id="code-panel-import-css"
            className="mb-2 h-20 w-full resize-none rounded border border-border bg-panel px-2 py-1.5 font-mono text-xs text-surface outline-none placeholder:text-muted/50 focus:border-accent"
            placeholder=".card { width: 240px; padding: 16px; border-radius: 12px; background: white; }"
            spellCheck={false}
          />
          {importError ? (
            <div
              data-test-id="code-panel-import-error"
              className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200"
            >
              {importError}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted">Import replaces the current document.</span>
            <AppTextButton
              data-test-id="code-panel-import"
              ui={{
                base: [
                  'rounded px-2 py-1 text-[11px]',
                  canImport && !importing
                    ? 'bg-accent text-black hover:bg-accent/90'
                    : 'cursor-not-allowed opacity-50'
                ].join(' ')
              }}
              onClick={() => void importCode()}
            >
              {importing ? 'Importing…' : 'Import to canvas'}
            </AppTextButton>
          </div>
        </div>
      ) : null}

      {!jsxCode ? (
        <div
          data-test-id="code-panel-empty"
          className="flex flex-1 items-center justify-center px-4 text-center"
        >
          <span className="text-xs text-muted">{dialogs.selectLayerForJSX}</span>
        </div>
      ) : (
        <div data-test-id="code-panel" className="code-highlight scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <div className="p-3">
            {highlightedLines.map((html, index) => (
              <div key={index} className="flex text-xs leading-5">
                <span
                  className="mr-3 shrink-0 text-right text-muted/40 select-none"
                  style={{ minWidth: '1.5em' }}
                >
                  {index + 1}
                </span>
                <pre
                  className="m-0 min-w-0 flex-1 break-words whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

CodePanel.displayName = 'CodePanel'
export default CodePanel
