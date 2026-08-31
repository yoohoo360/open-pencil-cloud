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

function fillColor(fills: CharacterStyleOverride['fills']): Color | undefined {
  const fill = fills?.find((item) => item.visible && item.type === 'SOLID')
  return fill?.color
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
    let chunk = escapeMD(block.content.slice(index, end))
    if ((style.fontWeight ?? 0) >= 700 && block.heading === 0) chunk = `**${chunk}**`
    if (style.italic) chunk = `*${chunk}*`
    if (style.textDecoration === 'STRIKETHROUGH') chunk = `~~${chunk}~~`
    if (color || background) {
      const parts: string[] = []
      if (color) parts.push(`color:${colorToHex(color)}`)
      if (background) parts.push(`background-color:${colorToHex(background)}`)
      chunk = `<span style="${parts.join(';')}">${chunk}</span>`
    }
    if (link?.href) chunk = `[${chunk}](${link.href})`
    markdown += chunk
    index = end
  }
  return markdown
}

function imageMarkdown(image: RichImage): string {
  const target = image.ossPath || image.hash
  return `![image](${target}){width=${image.width} height=${image.height} hash=${image.hash}}`
}

export function blocksToMarkdown(blocks: RichBlock[]): string {
  const lines: string[] = []
  for (const block of blocks) {
    if (block.image) {
      lines.push(imageMarkdown(block.image))
      lines.push('')
      continue
    }
    const inline = inlineMarkdown(block)
    const indent = '  '.repeat(block.indent)
    const listClass = block.list ? ` {.${block.list}}` : ''
    if (block.heading > 0) lines.push(`${'#'.repeat(block.heading)} ${inline}${listClass}`)
    else if (block.list === 'ul') lines.push(`${indent}- ${inline}`)
    else if (block.list === 'ol') lines.push(`${indent}1. ${inline}`)
    else lines.push(inline)
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

export function htmlToMarkdown(html: string): string {
  return blocksToMarkdown(parseRichHTML(html).blocks)
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
  const unordered = /^( *)- (.+)$/.exec(line)
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

function parseImageLine(line: string): RichImage | null {
  const match = /^!\[([^\]]*)\]\(([^)]+)\)(?:\{([^}]*)\})?$/.exec(line)
  if (!match) return null
  const attrs = parseImageAttrs(match[3] ?? '')
  return {
    hash: attrs.hash || match[2] || '',
    ossPath: match[2] ?? '',
    src: '',
    width: attrs.width ?? 0,
    height: attrs.height ?? 0
  }
}

function markdownInlineToHTML(text: string): string {
  return text
    .replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replaceAll(/~~(.+?)~~/g, '<s>$1</s>')
    .replaceAll(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replaceAll(/\*(.+?)\*/g, '<i>$1</i>')
}

function imageHTML(image: RichImage): string {
  const size =
    image.width > 0 && image.height > 0 ? ` width="${image.width}" height="${image.height}"` : ''
  return `<p><img src="${image.src}" data-image-hash="${image.hash}" data-oss-path="${image.ossPath}"${size} alt=""></p>`
}

export function markdownToHTML(markdown: string): string {
  if (!markdown.trim()) return '<p></p>'
  let html = ''
  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) continue
    const image = parseImageLine(line.trim())
    if (image) {
      html += imageHTML(image)
      continue
    }
    const heading = parseHeadingLine(line)
    if (heading) {
      const tag = `h${heading.heading}`
      const list = heading.list ? ` data-list="${heading.list}"` : ''
      html += `<${tag}${list}>${markdownInlineToHTML(heading.body)}</${tag}>`
      continue
    }
    const list = parseListLine(line)
    if (list) {
      const indent = list.indent > 0 ? ` data-indent="${list.indent}"` : ''
      html += `<p data-list="${list.list}"${indent}>${markdownInlineToHTML(list.body)}</p>`
      continue
    }
    html += `<p>${markdownInlineToHTML(line)}</p>`
  }
  return html || '<p></p>'
}

export function markdownToBlocks(markdown: string): RichBlock[] {
  return parseRichHTML(markdownToHTML(markdown)).blocks
}

export function emptyBlockMarkdown(): RichBlock[] {
  return [emptyBlock({ content: 'Write here' })]
}
