<script setup lang="ts">
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, redo, undo } from '@codemirror/commands'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language'
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
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { resolvedAppTheme } from '@/app/shell/theme'
import { designJSXExtensions } from '@/components/code-editor/extensions'
import type { CodeEditorLanguage } from '@/components/code-editor/types'
import { codeEditorTheme } from '@/theme/code/editor'

const {
  modelValue,
  language = 'design-jsx',
  readOnly = false,
  label = 'Code'
} = defineProps<{
  modelValue: string
  language?: CodeEditorLanguage
  readOnly?: boolean
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const host = useTemplateRef('host')
const languageCompartment = new Compartment()
const editableCompartment = new Compartment()
const labelCompartment = new Compartment()
const themeCompartment = new Compartment()
let editor: EditorView | undefined
let externalUpdate = false

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

onMounted(() => {
  const parent = host.value
  if (!parent) return
  editor = new EditorView({
    doc: modelValue,
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
      themeCompartment.of(codeEditorTheme(resolvedAppTheme.value === 'dark')),
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
      languageCompartment.of(languageExtensions(language)),
      editableCompartment.of(editableExtensions(readOnly)),
      labelCompartment.of(EditorView.contentAttributes.of({ 'aria-label': label })),
      EditorView.lineWrapping,

      EditorView.updateListener.of((update) => {
        if (!update.docChanged || externalUpdate) return
        emit('update:modelValue', update.state.doc.toString())
      })
    ]
  })
})

watch(
  () => modelValue,
  (value) => {
    if (!editor || editor.state.doc.toString() === value) return
    externalUpdate = true
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      annotations: Transaction.addToHistory.of(false)
    })
    externalUpdate = false
  }
)

watch(
  () => language,
  (language) =>
    editor?.dispatch({ effects: languageCompartment.reconfigure(languageExtensions(language)) })
)

watch(
  () => readOnly,
  (readOnly) =>
    editor?.dispatch({ effects: editableCompartment.reconfigure(editableExtensions(readOnly)) })
)

watch(
  () => label,
  (label) =>
    editor?.dispatch({
      effects: labelCompartment.reconfigure(
        EditorView.contentAttributes.of({ 'aria-label': label })
      )
    })
)

watch(resolvedAppTheme, (theme) =>
  editor?.dispatch({ effects: themeCompartment.reconfigure(codeEditorTheme(theme === 'dark')) })
)

onBeforeUnmount(() => editor?.destroy())
</script>

<template>
  <div ref="host" data-slot="code-editor" class="min-h-0 flex-1 overflow-hidden text-xs" />
</template>
