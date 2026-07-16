import { Check, Copy } from 'lucide-react'
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'
import { useMemo, useState } from 'react'

import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { selectionToJSX, type JSXFormat } from '@open-pencil/core'
import { useEditor, useI18n, useSceneComputed } from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

function CodePanelInner() {
  const store = useEditor()
  const { dialogs } = useI18n()
  const [jsxFormat, setJsxFormat] = useState<JSXFormat>('openpencil')
  const [copied, setCopied] = useState(false)

  const jsxCode = useSceneComputed(() => {
    void store.state.sceneVersion
    const ids = [...store.state.selectedIds]
    if (ids.length === 0) return ''
    return selectionToJSX(ids, store.graph, jsxFormat)
  })

  const highlightedLines = useMemo(() => {
    if (!jsxCode) return [] as string[]
    const grammar = Prism.languages.jsx ?? Prism.languages.javascript
    return jsxCode.split('\n').map((line) => Prism.highlight(line, grammar, 'jsx'))
  }, [jsxCode])

  async function copyCode() {
    await navigator.clipboard.writeText(jsxCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!jsxCode) {
    return (
      <div
        data-test-id="code-panel-empty"
        className="flex flex-1 items-center justify-center px-4 text-center"
      >
        <span className="text-xs text-muted">{dialogs.selectLayerForJSX}</span>
      </div>
    )
  }

  return (
    <div data-test-id="code-panel" className="flex min-h-0 flex-1 flex-col">
      <div
        data-test-id="code-panel-header"
        className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted">JSX</span>
          <button
            type="button"
            data-test-id="code-panel-format-toggle"
            className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
            onClick={() => setJsxFormat((f) => (f === 'openpencil' ? 'tailwind' : 'openpencil'))}
          >
            {jsxFormat === 'openpencil' ? 'OpenPencil' : 'Tailwind'}
          </button>
        </div>
        <button
          type="button"
          data-test-id="code-panel-copy"
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
          onClick={() => void copyCode()}
        >
          {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
          {copied ? dialogs.copied : dialogs.copy}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="p-3">
          {highlightedLines.map((html, i) => (
            <div key={i} className="flex text-xs leading-5">
              <span
                className="mr-3 shrink-0 text-right text-muted/40 select-none"
                style={{ minWidth: '1.5em' }}
              >
                {i + 1}
              </span>
              <pre className="m-0 min-w-0 flex-1 break-words whitespace-pre-wrap">
                <code dangerouslySetInnerHTML={{ __html: html }} />
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CodePanel({ editor }: { editor?: Editor }) {
  if (editor) {
    return (
      <EditorBridge editor={editor}>
        <CodePanelInner />
      </EditorBridge>
    )
  }
  return <CodePanelInner />
}
