import { useEffect, useRef } from 'react'
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, redo, undo } from '@codemirror/commands'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting
} from '@codemirror/language'
import { lintKeymap } from '@codemirror/lint'
import { searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, Transaction, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers
} from '@codemirror/view'

import { designJSXExtensions } from '#react/components/code-editor/extensions'
import type { CodeEditorLanguage } from '#react/components/code-editor/types'

export function CodeEditor({
  value,
  language = 'design-jsx',
  readOnly = false,
  label = 'Code',
  onChange
}: {
  value: string
  language?: CodeEditorLanguage
  readOnly?: boolean
  label?: string
  onChange: (value: string) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const languageCompartment = useRef(new Compartment())
  const editableCompartment = useRef(new Compartment())
  const labelCompartment = useRef(new Compartment())
  const onChangeRef = useRef(onChange)
  const externalUpdate = useRef(false)
  onChangeRef.current = onChange

  useEffect(() => {
    const parent = hostRef.current
    if (!parent) return

    const view = new EditorView({
      doc: value,
      parent,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        keymap.of([
          { key: 'Ctrl-z', run: undo },
          { key: 'Ctrl-Shift-z', run: redo },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap
        ]),
        languageCompartment.current.of(languageExtensions(language)),
        editableCompartment.current.of(editableExtensions(readOnly)),
        labelCompartment.current.of(EditorView.contentAttributes.of({ 'aria-label': label })),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { height: '100%', backgroundColor: 'transparent', color: 'var(--color-surface)' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono)' },
          '.cm-content': { padding: '12px 0', caretColor: 'var(--color-accent)' },
          '.cm-line': { padding: '0 12px' },
          '.cm-gutters': {
            backgroundColor: 'transparent',
            color: 'color-mix(in srgb, var(--color-muted) 45%, transparent)',
            border: 'none'
          },
          '&.cm-focused': { outline: 'none' },
          '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 22%, transparent)'
          }
        }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || externalUpdate.current) return
          onChangeRef.current(update.state.doc.toString())
        })
      ]
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    externalUpdate.current = true
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      annotations: Transaction.addToHistory.of(false)
    })
    externalUpdate.current = false
  }, [value])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: languageCompartment.current.reconfigure(languageExtensions(language))
    })
  }, [language])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: editableCompartment.current.reconfigure(editableExtensions(readOnly))
    })
  }, [readOnly])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: labelCompartment.current.reconfigure(
        EditorView.contentAttributes.of({ 'aria-label': label })
      )
    })
  }, [label])

  return <div ref={hostRef} data-slot="code-editor" className="min-h-0 flex-1 overflow-hidden text-xs" />
}

function languageExtensions(language: CodeEditorLanguage): Extension {
  if (language === 'html-css') return html()
  return [
    javascript({ jsx: true, typescript: true }),
    ...(language === 'design-jsx' ? designJSXExtensions() : [])
  ]
}

function editableExtensions(readOnly: boolean): Extension {
  return [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]
}
