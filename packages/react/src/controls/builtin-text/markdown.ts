import {
  emptyBlock,
  type HeadingLevel,
  type ListKind,
  type RichBlock,
  type RichImage
} from '#react/controls/builtin-text/lists'
import { parseRichHTML } from '#react/controls/builtin-text/model'

import { colorToHex } from '@open-pencil/core/color'
import type { CharacterStyleOverride } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

function escapeMD(text: string): string {
  return text.replaceAll(/([\\`*[\]()])/g, '\\$1')
}

function unescapeMD(text: string): string {
  return text.replaceAll(/\\([\\`*[\]()])/g, '$1')
}

function collapseMarkdownEscapes(text: string): string {
  let previous = ''
  let next = text
  while (next !== previous) {
    previous = next
    next = unescapeMD(next)
  }
  return next
}

function escapeHTML(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function fillColor(fills: CharacterStyleOverride['fills']): Color | undefined {
  const fill = fills?.find((item) => item.visible && item.type === 'SOLID')
  return fill?.color
}

function applyInlineHTML(
  text: string,
  style: CharacterStyleOverride,
  heading: HeadingLevel
): string {
  let chunk = escapeHTML(text)
  if ((style.fontWeight ?? 0) >= 700 && heading === 0) chunk = `<b>${chunk}</b>`
  if (style.italic) chunk = `<i>${chunk}</i>`
  if (style.textDecoration === 'STRIKETHROUGH') chunk = `<s>${chunk}</s>`
  return chunk
}

function applyInlineMarkdown(
  text: string,
  style: CharacterStyleOverride,
  heading: HeadingLevel
): string {
  let chunk = escapeMD(text)
  if ((style.fontWeight ?? 0) >= 700 && heading === 0) chunk = `**${chunk}**`
  if (style.italic) chunk = `*${chunk}*`
  if (style.textDecoration === 'STRIKETHROUGH') chunk = `~~${chunk}~~`
  return chunk
}

function inlineMarkdown(block: RichBlock): string {
  if (!block.content) return ''
  let markdown = ''
  let index = 0
  while (index < block.content.length) {
    const highlight = block.highlights.find(
      (item) => index >= item.start && index < item.start + item.length
    )
    const link = block.links.find((item) => index >= item.start && index < item.start + item.length)
    const run = block.runs.find((item) => index >= item.start && index < item.start + item.length)
    const style = run?.style ?? {}
    const background = highlight?.color
    const color = fillColor(style.fills)
    let end = index + 1
    while (end < block.content.length) {
      const nextHighlight = block.highlights.find(
        (item) => end >= item.start && end < item.start + item.length
      )
      const nextLink = block.links.find(
        (item) => end >= item.start && end < item.start + item.length
      )
      const nextRun = block.runs.find((item) => end >= item.start && end < item.start + item.length)
      if (nextHighlight !== highlight || nextLink !== link || nextRun !== run) break
      end += 1
    }
    const raw = unescapeMD(block.content.slice(index, end))
    let chunk: string
    if (color || background) {
      // Keep styles as HTML so markdown markers are not re-escaped on the next switch.
      const parts: string[] = []
      if (color) parts.push(`color:${colorToHex(color)}`)
      if (background) parts.push(`background-color:${colorToHex(background)}`)
      chunk = `<span style="${parts.join(';')}">${applyInlineHTML(raw, style, block.heading)}</span>`
    } else {
      chunk = applyInlineMarkdown(raw, style, block.heading)
    }
    if (link?.href) chunk = `[${chunk}](${link.href})`
    markdown += chunk
    index = end
  }
  return markdown
}

export function imageMarkdown(image: RichImage): string {
  const target = image.ossPath || image.src || ''
  if (!target) return ''
  const parts = [
    image.width > 0 ? `width=${image.width}` : '',
    image.height > 0 ? `height=${image.height}` : ''
  ].filter(Boolean)
  return parts.length > 0 ? `![image](${target}){${parts.join(' ')}}` : `![image](${target})`
}

/** Collect URL → hash pairs from markdown attrs / HTML image tags (for migration into pluginData). */
export function collectImageHashMap(input: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const section of parseMarkdownSections(input)) {
    if (section.kind !== 'image') continue
    const url = section.image.ossPath || section.image.src
    const hash = section.image.hash
    if (url && hash && hash !== url && !/^https?:\/\//i.test(hash)) map[url] = hash
  }
  for (const match of input.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = match[1] ?? ''
    const src = quotedAttr(attrs, 'src')
    const hash = quotedAttr(attrs, 'data-image-hash')
    const oss = quotedAttr(attrs, 'data-oss-path')
    const url = oss || (src && !src.startsWith('data:') && !src.startsWith('blob:') ? src : '')
    if (url && hash && hash !== url && !/^https?:\/\//i.test(hash)) map[url] = hash
  }
  return map
}

export function insertMarkdownImages(
  value: string,
  start: number,
  end: number,
  images: RichImage[]
): { value: string; cursor: number } {
  if (images.length === 0) return { value, cursor: end }
  const prefix = start > 0 && value[start - 1] !== '\n' ? '\n' : ''
  const inserted = `${prefix}${images.map(imageMarkdown).filter(Boolean).join('\n\n')}\n`
  return {
    value: `${value.slice(0, start)}${inserted}${value.slice(end)}`,
    cursor: start + inserted.length
  }
}

function isPipeRow(content: string): boolean {
  const trimmed = content.trim()
  return trimmed.startsWith('|') && trimmed.endsWith('|')
}

function isPipeSeparator(content: string): boolean {
  if (!isPipeRow(content)) return false
  return splitTableRow(content).every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
}

export function blocksToMarkdown(blocks: RichBlock[]): string {
  const lines: string[] = []
  let index = 0
  while (index < blocks.length) {
    const block = blocks[index]
    if (!block) break
    if (block.image) {
      const image = imageMarkdown(block.image)
      if (image) {
        lines.push(image)
        lines.push('')
      }
      index += 1
      continue
    }
    if (isPipeRow(block.content) && !isPipeSeparator(block.content)) {
      const rows: string[] = []
      while (index < blocks.length) {
        const row = blocks[index]
        if (!row || row.image || !isPipeRow(row.content)) break
        if (!isPipeSeparator(row.content)) rows.push(row.content.trim())
        index += 1
      }
      if (rows.length > 0) {
        const header = rows[0] ?? '| |'
        const cols = Math.max(1, splitTableRow(header).length)
        lines.push(header)
        lines.push(`| ${Array.from({ length: cols }, () => '---').join(' | ')} |`)
        for (const row of rows.slice(1)) lines.push(row)
        lines.push('')
      }
      continue
    }
    const inline = inlineMarkdown(block)
    const indent = '  '.repeat(block.indent)
    const listClass = block.list ? ` {.${block.list}}` : ''
    if (block.heading > 0) {
      const body = inline.replace(/^\s*#{1,6}\s+/, '')
      lines.push(`${'#'.repeat(block.heading)} ${body}${listClass}`)
    } else if (block.list === 'ul') lines.push(`${indent}- ${inline}`)
    else if (block.list === 'ol') lines.push(`${indent}1. ${inline}`)
    else lines.push(inline)
    lines.push('')
    index += 1
  }
  return lines.join('\n').trimEnd()
}

export function htmlToMarkdown(html: string): string {
  return blocksToMarkdown(parseRichHTML(html).blocks)
}

export function normalizeRichMarkdown(markdown: string): string {
  return htmlToMarkdown(markdownToHTML(collapseMarkdownEscapes(markdown)))
}

function parseImageAttrs(raw: string): Partial<RichImage> {
  const width = /(?:^|\s)width=([\d.]+)/.exec(raw)?.[1]
  const height = /(?:^|\s)height=([\d.]+)/.exec(raw)?.[1]
  const hash = /(?:^|\s)hash=([^\s}]+)/.exec(raw)?.[1]
  return {
    width: width ? Number(width) : 0,
    height: height ? Number(height) : 0,
    hash: hash ?? ''
  }
}

function parseHeadingLine(
  line: string
): { heading: HeadingLevel; list: ListKind; body: string } | null {
  const match = /^(#{1,6})\s+(.*?)(?:\s+\{\.(ol|ul)\})?$/.exec(line)
  if (!match) return null
  return {
    heading: match[1].length as HeadingLevel,
    list: match[3] === 'ol' || match[3] === 'ul' ? match[3] : null,
    body: match[2] ?? ''
  }
}

function parseListLine(line: string): { list: ListKind; indent: number; body: string } | null {
  const unordered = /^( *)[-*+] (.+)$/.exec(line)
  if (unordered) {
    return {
      list: 'ul',
      indent: Math.floor((unordered[1] ?? '').length / 2),
      body: unordered[2] ?? ''
    }
  }
  const ordered = /^( *)\d+\. (.+)$/.exec(line)
  if (ordered) {
    return {
      list: 'ol',
      indent: Math.floor((ordered[1] ?? '').length / 2),
      body: ordered[2] ?? ''
    }
  }
  return null
}

function quotedAttr(attrs: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attrs)
  return decodeHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? '')
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll(/&#x2f;/gi, '/')
    .replaceAll(/&#47;/g, '/')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
}

function isRemoteSrc(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')
}

function imageFromTarget(
  target: string,
  extras: { width?: number; height?: number; hash?: string } = {}
): RichImage {
  const decoded = decodeHtmlEntities(target)
  const hash = extras.hash || decoded
  return {
    hash,
    ossPath: decoded,
    src: isRemoteSrc(decoded) ? decoded : '',
    width: extras.width ?? 0,
    height: extras.height ?? 0
  }
}

function parseHtmlImage(html: string): RichImage | null {
  const match = /<img\b([^>]*)\/?>/i.exec(html.trim())
  if (!match) return null
  const attrs = match[1] ?? ''
  const src = quotedAttr(attrs, 'src')
  if (!src) return null
  return imageFromTarget(src, {
    width: Number(quotedAttr(attrs, 'width') || 0) || 0,
    height: Number(quotedAttr(attrs, 'height') || 0) || 0,
    hash: quotedAttr(attrs, 'data-image-hash')
  })
}

function parseImageLine(line: string): RichImage | null {
  const trimmed = line.trim()
  const markdown = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)(?:\{([^}]*)\})?\s*$/.exec(trimmed)
  if (markdown) {
    const attrs = parseImageAttrs(markdown[3] ?? '')
    return imageFromTarget(markdown[2] ?? '', {
      width: attrs.width,
      height: attrs.height,
      hash: attrs.hash
    })
  }
  const leftover = trimmed.replace(/<img\b[^>]*>/i, '').replace(/<\/?p>/gi, '').trim()
  if (leftover) return null
  return parseHtmlImage(trimmed)
}

function formatInlineMarkdown(text: string): string {
  const imagePlaceholders: string[] = []
  function stash(match: string): string {
    const token = `\u0001${imagePlaceholders.length}\u0001`
    imagePlaceholders.push(match)
    return token
  }
  const withoutImages = unescapeMD(text)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)(?:\{([^}]*)\})?/g, stash)
    .replace(/<img\b[^>]*>/gi, stash)
  let html = escapeHTML(withoutImages)
    .replaceAll(/`([^`]+)`/g, '<code>$1</code>')
    .replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replaceAll(/~~(.+?)~~/g, '<s>$1</s>')
    .replaceAll(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replaceAll(/__(.+?)__/g, '<b>$1</b>')
    .replaceAll(/\*(.+?)\*/g, '<i>$1</i>')
    .replaceAll(/_(.+?)_/g, '<i>$1</i>')
  html = html.replaceAll(/\u0001(\d+)\u0001/g, (_full, index) => {
    const raw = imagePlaceholders[Number(index)]
    if (!raw) return ''
    const image = parseImageLine(raw)
    return image ? imageFigureHTML(image) : escapeHTML(raw)
  })
  return html
}

function formatSpanInner(inner: string): string {
  const cleaned = unescapeMD(inner)
  // Already HTML from a previous visual pass — keep tags, only unescape leftovers.
  if (/<\/?[a-z][a-z0-9]*\b/i.test(cleaned)) return cleaned
  return formatInlineMarkdown(cleaned)
}

function markdownInlineToHTML(text: string): string {
  const placeholders: string[] = []
  const protectedText = text.replace(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi, (_full, attrs, inner) => {
    const token = `\u0000${placeholders.length}\u0000`
    placeholders.push(`<span${attrs}>${formatSpanInner(inner)}</span>`)
    return token
  })
  return formatInlineMarkdown(protectedText).replaceAll(
    /\u0000(\d+)\u0000/g,
    (_full, index) => placeholders[Number(index)] ?? ''
  )
}

function imageFigureHTML(image: RichImage): string {
  const width = image.width > 0 ? image.width : 160
  const height = image.height > 0 ? image.height : 100
  const src =
    image.src && image.src.length > 0
      ? image.src
      : isRemoteSrc(image.ossPath)
        ? image.ossPath
        : isRemoteSrc(image.hash)
          ? image.hash
          : 'data:image/svg+xml,' +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect fill="#ececec" width="160" height="100"/><text x="80" y="54" text-anchor="middle" fill="#8a8a8a" font-size="12" font-family="sans-serif">image</text></svg>'
            )
  const hash = escapeHTML(image.hash || '')
  const oss = escapeHTML(image.ossPath || '')
  // Visible image box for the visual editor (do not rely on post-DOM decoration).
  return `<span data-rich-image="1" data-image-hash="${hash}" data-oss-path="${oss}" contenteditable="false" style="display:inline-block;width:${width}px;height:${height}px;max-width:100%;overflow:hidden;resize:both;background:#ececec;border:1px solid #d0d0d0"><img src="${src}" data-image-hash="${hash}" data-oss-path="${oss}" width="${width}" height="${height}" alt="image" style="width:100%;height:100%;display:block;object-fit:cover"></span>`
}

function imageHTML(image: RichImage): string {
  return `<p>${imageFigureHTML(image)}</p>`
}

function splitTableRow(line: string): string[] {
  let raw = line.trim()
  if (raw.startsWith('|')) raw = raw.slice(1)
  if (raw.endsWith('|')) raw = raw.slice(0, -1)
  return raw.split('|').map((cell) => cell.trim())
}

function isTableSeparator(line: string): boolean {
  if (!line.includes('|') && !line.includes('-')) return false
  const cells = splitTableRow(line)
  if (cells.length === 0) return false
  return cells.every((cell) => /^:?-{2,}:?$/.test(cell.trim()))
}

function isTableHeader(lines: readonly string[], index: number): boolean {
  const header = lines[index]
  const separator = lines[index + 1]
  if (!header || !separator) return false
  if (!header.includes('|')) return false
  return isTableSeparator(separator)
}

function isRecoveredPipeTable(lines: readonly string[], index: number): boolean {
  const first = (lines[index] ?? '').trim()
  const second = (lines[index + 1] ?? '').trim()
  if (!isPipeRow(first) || isPipeSeparator(first)) return false
  if (!second) return false
  if (isTableSeparator(second)) return true
  if (!isPipeRow(second) || isPipeSeparator(second)) return false
  return splitTableRow(first).length === splitTableRow(second).length
}

function consumePipeTable(lines: readonly string[], start: number): {
  header: string[]
  rows: string[][]
  nextIndex: number
} {
  const headerLine = (lines[start] ?? '').trimEnd()
  const header = splitTableRow(headerLine)
  let index = start + 1
  if (isTableSeparator((lines[index] ?? '').trimEnd())) index += 1
  const rows: string[][] = []
  while (index < lines.length) {
    const rowLine = (lines[index] ?? '').trimEnd()
    if (!rowLine.trim() || !rowLine.includes('|') || isTableSeparator(rowLine)) break
    if (!isPipeRow(rowLine.trim())) break
    rows.push(splitTableRow(rowLine))
    index += 1
  }
  return { header, rows, nextIndex: index }
}

function tableHTML(header: string[], rows: string[][]): string {
  const head = header
    .map((cell) => `<th style="border:1px solid #d0d0d0;padding:4px 8px;text-align:left">${markdownInlineToHTML(cell)}</th>`)
    .join('')
  const body = rows
    .map((row) => {
      const cells = header.map((_, index) => row[index] ?? '')
      return `<tr>${cells
        .map(
          (cell) =>
            `<td style="border:1px solid #d0d0d0;padding:4px 8px">${markdownInlineToHTML(cell)}</td>`
        )
        .join('')}</tr>`
    })
    .join('')
  return `<table style="border-collapse:collapse;width:100%;margin:8px 0"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function fenceHTML(code: string, language: string): string {
  const lang = language ? ` data-language="${escapeHTML(language)}"` : ''
  const body = escapeHTML(code).replaceAll('\n', '<br>')
  return `<pre${lang} style="font-family:Inter;font-size:12px;padding:8px;margin:8px 0;background:#f4f4f5;border-radius:4px;white-space:pre-wrap"><code>${body}</code></pre>`
}

function quoteHTML(lines: string[]): string {
  const body = lines.map((line) => `<p>${markdownInlineToHTML(line)}</p>`).join('')
  return `<blockquote style="margin:8px 0;padding-left:12px;border-left:3px solid #d0d0d0;color:#595959">${body}</blockquote>`
}

function stripQuotePrefix(line: string): string {
  return line.replace(/^>\s?/, '')
}

export type MarkdownSection =
  | { kind: 'code'; language: string; code: string }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'hr' }
  | { kind: 'image'; image: RichImage }
  | { kind: 'heading'; heading: HeadingLevel; list: ListKind; body: string }
  | { kind: 'list'; list: Exclude<ListKind, null>; indent: number; body: string }
  | { kind: 'paragraph'; body: string }

/** True when this line starts a block other than a plain paragraph. */
function startsMarkdownBlock(lines: readonly string[], index: number): boolean {
  const raw = lines[index] ?? ''
  const line = raw.trimEnd()
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^(`{3,}|~{3,})/.test(trimmed)) return true
  if (isTableHeader(lines, index) || isRecoveredPipeTable(lines, index)) return true
  if (/^>\s?/.test(line)) return true
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return true
  if (parseImageLine(trimmed)) return true
  if (parseHeadingLine(line)) return true
  if (parseListLine(line)?.list) return true
  return false
}

function isHardLineBreak(raw: string, line: string): boolean {
  return / {2}$/.test(raw) || /\\$/.test(line)
}

function paragraphLineContent(raw: string, line: string): string {
  if (/\\$/.test(line)) return line.replace(/\\$/, '').trimEnd()
  if (/ {2}$/.test(raw)) return line.trimEnd()
  return line.trim()
}

/**
 * CommonMark-ish paragraphs: blank line ends a paragraph; a single newline soft-joins
 * with a space; trailing two spaces or `\` make a hard break (`\n` → `<br>`).
 */
function consumeParagraph(
  lines: readonly string[],
  start: number
): { body: string; nextIndex: number } {
  let index = start
  let body = ''
  let breakKind: 'start' | 'soft' | 'hard' = 'start'
  while (index < lines.length) {
    const raw = lines[index] ?? ''
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      index += 1
      break
    }
    if (breakKind !== 'start' && startsMarkdownBlock(lines, index)) break
    const piece = paragraphLineContent(raw, line)
    if (breakKind === 'start') body = piece
    else if (breakKind === 'hard') body += `\n${piece}`
    else body += body && piece ? ` ${piece}` : piece
    breakKind = isHardLineBreak(raw, line) ? 'hard' : 'soft'
    index += 1
  }
  return { body, nextIndex: index }
}

export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  if (!markdown.trim()) return []
  const lines = collapseMarkdownEscapes(markdown)
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
  const sections: MarkdownSection[] = []
  let index = 0

  while (index < lines.length) {
    const raw = lines[index] ?? ''
    const line = raw.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (/^(`{3,}|~{3,})/.test(trimmed)) {
      const fence = trimmed.match(/^(`{3,}|~{3,})/)?.[1] ?? '```'
      const language = trimmed.slice(fence.length).trim()
      const body: string[] = []
      index += 1
      while (index < lines.length) {
        const next = lines[index] ?? ''
        if (next.trim() === fence || next.trim().startsWith(fence[0] === '`' ? '```' : '~~~')) {
          index += 1
          break
        }
        body.push(next)
        index += 1
      }
      sections.push({ kind: 'code', language, code: body.join('\n') })
      continue
    }

    if (isTableHeader(lines, index) || isRecoveredPipeTable(lines, index)) {
      const table = consumePipeTable(lines, index)
      sections.push({ kind: 'table', header: table.header, rows: table.rows })
      index = table.nextIndex
      continue
    }

    if (/^>\s?/.test(line)) {
      const quoted: string[] = []
      while (index < lines.length) {
        const next = (lines[index] ?? '').trimEnd()
        if (!/^>\s?/.test(next) && next.trim() !== '') break
        if (!next.trim()) {
          index += 1
          break
        }
        quoted.push(stripQuotePrefix(next))
        index += 1
      }
      sections.push({ kind: 'quote', lines: quoted })
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      sections.push({ kind: 'hr' })
      index += 1
      continue
    }

    const image = parseImageLine(trimmed)
    if (image) {
      sections.push({ kind: 'image', image })
      index += 1
      continue
    }

    const heading = parseHeadingLine(line)
    if (heading) {
      sections.push({
        kind: 'heading',
        heading: heading.heading,
        list: heading.list,
        body: heading.body
      })
      index += 1
      continue
    }

    const list = parseListLine(line)
    if (list && list.list) {
      sections.push({ kind: 'list', list: list.list, indent: list.indent, body: list.body })
      index += 1
      continue
    }

    const paragraph = consumeParagraph(lines, index)
    if (paragraph.body) sections.push({ kind: 'paragraph', body: paragraph.body })
    index = paragraph.nextIndex
  }

  return sections
}

function paragraphBodyToHTML(body: string): string {
  return body
    .split('\n')
    .map((line) => markdownInlineToHTML(line))
    .join('<br>')
}

function sectionToHTML(section: MarkdownSection): string {
  if (section.kind === 'code') return fenceHTML(section.code, section.language)
  if (section.kind === 'table') return tableHTML(section.header, section.rows)
  if (section.kind === 'quote') return quoteHTML(section.lines)
  if (section.kind === 'hr') return '<hr>'
  if (section.kind === 'image') return imageHTML(section.image)
  if (section.kind === 'heading') {
    const tag = `h${section.heading}`
    const list = section.list ? ` data-list="${section.list}"` : ''
    return `<${tag}${list}>${markdownInlineToHTML(section.body)}</${tag}>`
  }
  if (section.kind === 'list') {
    const indent = section.indent > 0 ? ` data-indent="${section.indent}"` : ''
    return `<p data-list="${section.list}"${indent}>${markdownInlineToHTML(section.body)}</p>`
  }
  return `<p>${paragraphBodyToHTML(section.body)}</p>`
}

export function markdownSectionsToHTML(sections: readonly MarkdownSection[]): string {
  return sections.map(sectionToHTML).join('')
}

export function markdownToHTML(
  markdown: string,
  imageMap: Readonly<Record<string, string>> = {}
): string {
  const sections = parseMarkdownSections(markdown).map((section) => {
    if (section.kind !== 'image') return section
    const mapped =
      imageMap[section.image.ossPath] ||
      imageMap[section.image.src] ||
      imageMap[section.image.hash]
    if (!mapped || mapped === section.image.hash) return section
    return { ...section, image: { ...section.image, hash: mapped } }
  })
  return markdownSectionsToHTML(sections) || '<p></p>'
}

export function looksLikeMarkdown(text: string): boolean {
  return /^(#{1,6}\s|`{3}|~{3}|\|.+\||>\s|\s*[-*+]\s|\s*\d+\.\s|-{3,}|\*{3,}|_{3,}|!\[[^\]]*\]\(|<img\b)/im.test(
    text
  )
}

export function markdownToBlocks(markdown: string): RichBlock[] {
  return parseRichHTML(markdownToHTML(markdown)).blocks
}

export function emptyBlockMarkdown(): RichBlock[] {
  return [emptyBlock({ content: 'Write here' })]
}
