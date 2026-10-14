const OPENPENCIL_START = '<!--(openpencil)'
const OPENPENCIL_END = '(/openpencil)-->'
const FIGMA_START = '<!--(figma)'
const FIGMA_END = '(/figma)-->'
const FIGMA_META = '(figmeta)'
const ESCAPED_FIGMA_START = '&lt;!--(figma)'

function hasCompleteMarker(text: string, start: string, end: string): boolean {
  const startIndex = text.indexOf(start)
  return startIndex !== -1 && text.includes(end, startIndex + start.length)
}

/** True when text carries native OpenPencil or Figma design clipboard XML/HTML. */
export function isDesignClipboardXML(text: string): boolean {
  if (!text) return false
  return (
    hasCompleteMarker(text, OPENPENCIL_START, OPENPENCIL_END) ||
    (text.includes(FIGMA_META) &&
      (hasCompleteMarker(text, FIGMA_START, FIGMA_END) ||
        hasCompleteMarker(text, ESCAPED_FIGMA_START, '(/figma)--&gt;')))
  )
}

/**
 * Figma's HTML clipboard appends a text preview (`<span style=…>…</span><br>…`) after the
 * design payload. Keep only the figmeta + figma markers OpenPencil can decode.
 */
export function normalizeDesignClipboardXML(text: string): string | null {
  const openPencil = text.match(/<!--\(openpencil\)[\s\S]*?\(\/openpencil\)-->/)
  if (openPencil) return openPencil[0]

  const metaMatch = text.match(/\(figmeta\)(.*?)\(\/figmeta\)/)
  const bufMatch = text.match(/\(figma\)([\s\S]*?)\(\/figma\)/)
  if (!metaMatch || !bufMatch) return null

  return (
    `<meta charset='utf-8'>` +
    `<span data-metadata="<!--(figmeta)${metaMatch[1]}(/figmeta)-->"></span>` +
    `<span data-buffer="<!--(figma)${bufMatch[1]}(/figma)-->"></span>`
  )
}

/**
 * Prefer the clipboard flavor that still has the full native XML payload.
 * Browsers often put the design markers only in `text/html`.
 */
export function extractDesignClipboardXML(data: DataTransfer | null | undefined): string | null {
  if (!data) return null
  const html = data.getData('text/html')
  if (html && isDesignClipboardXML(html)) return normalizeDesignClipboardXML(html)
  const plain = data.getData('text/plain')
  if (plain && isDesignClipboardXML(plain)) return normalizeDesignClipboardXML(plain)
  return null
}

/** Fence language for pasted OpenPencil / Figma clipboard XML in skill markdown. */
export function designClipboardFenceLanguage(xml: string): 'openpencil-xml' | 'figma-xml' {
  if (hasCompleteMarker(xml, OPENPENCIL_START, OPENPENCIL_END)) return 'openpencil-xml'
  return 'figma-xml'
}

/** Keep the native XML payload; wrap it in a markdown code fence for the skill editor. */
export function wrapDesignClipboardXMLForMarkdown(xml: string): string {
  const lang = designClipboardFenceLanguage(xml)
  const fence = xml.includes('```') ? '````' : '```'
  return `${fence}${lang}\n${xml}\n${fence}`
}

/**
 * Skill-editor paste: native OpenPencil / Figma clipboard → markdown-fenced original XML.
 * Decoding to nodes/JSON happens only when the skill is loaded for AI.
 */
export function pasteDesignClipboardAsMarkdown(
  data: DataTransfer | null | undefined
): string | null {
  const xml = extractDesignClipboardXML(data)
  if (!xml) return null
  return wrapDesignClipboardXMLForMarkdown(xml)
}

/** Collect native design clipboard XML payloads stored in a skill file (fenced or raw). */
export function extractDesignClipboardXMLPayloads(content: string): string[] {
  const payloads: string[] = []
  const seen = new Set<string>()
  const add = (xml: string) => {
    const normalized = normalizeDesignClipboardXML(xml)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    payloads.push(normalized)
  }

  const fenceRe = /(`{3,})([^\n`]*)\n([\s\S]*?)\1/g
  for (const match of content.matchAll(fenceRe)) {
    add(match[3] ?? '')
  }

  // Legacy / whole-file paste without a fence.
  if (payloads.length === 0) add(content)
  return payloads
}

/** Skill package paths that store pasted design clipboard XML. */
export function isDesignClipboardXMLPath(path: string): boolean {
  const lower = path.toLowerCase()
  return lower.endsWith('.xml') || lower.endsWith('.figma.html') || lower.endsWith('.op.html')
}

/** File content that should be decoded to JSON before prompting the model. */
export function skillFileNeedsClipboardJson(path: string, content: string): boolean {
  return (
    extractDesignClipboardXMLPayloads(content).length > 0 ||
    (isDesignClipboardXMLPath(path) && Boolean(content.trim()))
  )
}
