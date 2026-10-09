import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import xml from 'highlight.js/lib/languages/xml'

import type { CodeEditorLanguage } from '#react/components/code-editor/types'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('xml', xml)

export function highlightLanguage(language: CodeEditorLanguage): string {
  return language === 'html-css' ? 'xml' : 'javascript'
}

/** Highlight source for the underlay; always ends with a newline so scroll heights match. */
export function highlightCode(source: string, language: CodeEditorLanguage): string {
  const lang = highlightLanguage(language)
  const text = source.endsWith('\n') ? source : `${source}\n`
  try {
    return hljs.highlight(text, { language: lang, ignoreIllegals: true }).value
  } catch {
    return escapeHtml(text)
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
