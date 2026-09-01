import {
  assignListMarkers,
  emptyBlock,
  flattenBlocks,
  headingListIndent,
  splitStyledTextToBlocks,
  styleForHeading,
  type HeadingLevel,
  type ListKind,
  type RichBlock,
  type RichImage
} from '#react/controls/builtin-text/lists'

import { colorToHex, parseColor } from '@open-pencil/core/color'
import type {
  CharacterStyleOverride,
  Fill,
  PluginDataEntry,
  StyleRun
} from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

export const RICH_PLUGIN_ID = 'open-pencil'
export const RICH_PLUGIN_KEY = 'rich-text'
export {
  headingLevelForStyle,
  RICH_BODY_SIZE,
  RICH_HEADING_SIZES,
  styleForHeading,
  type HeadingLevel,
  type ListKind,
  type RichBlock,
  type RichImage
} from '#react/controls/builtin-text/lists'

const LINK_COLOR: Color = { r: 0.12, g: 0.4, b: 0.95, a: 1 }

export type RichMeta = {
  highlights: Array<{ start: number; length: number; color: Color }>
  links: Array<{ start: number; length: number; href: string }>
  images: RichImage[]
}

type RichStyle = CharacterStyleOverride & {
  background?: Color
  href?: string
}

function solidFill(color: Color): Fill {
  return { type: 'SOLID', color, opacity: color.a, visible: true, blendMode: 'NORMAL' }
}

function escapeHTML(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function styleAt(runs: readonly StyleRun[], index: number): CharacterStyleOverride {
  for (const run of runs) {
    if (index >= run.start && index < run.start + run.length) return run.style
  }
  return {}
}

function metaAt<T extends { start: number; length: number }>(
  items: readonly T[],
  index: number
): T | undefined {
  return items.find((item) => index >= item.start && index < item.start + item.length)
}

function fillColor(fills: Fill[] | undefined): Color | undefined {
  const fill = fills?.find((item) => item.visible && item.type === 'SOLID')
  return fill?.color
}

function colorsEqual(left: Color | undefined, right: Color | undefined): boolean {
  if (!left && !right) return true
  if (!left || !right) return false
  return left.r === right.r && left.g === right.g && left.b === right.b && left.a === right.a
}

function sameStyle(left: RichStyle, right: RichStyle): boolean {
  return (
    (left.fontWeight ?? 0) === (right.fontWeight ?? 0) &&
    Boolean(left.italic) === Boolean(right.italic) &&
    (left.textDecoration ?? 'NONE') === (right.textDecoration ?? 'NONE') &&
    (left.fontSize ?? 0) === (right.fontSize ?? 0) &&
    colorsEqual(fillColor(left.fills), fillColor(right.fills)) &&
    colorsEqual(left.background, right.background) &&
    (left.href ?? '') === (right.href ?? '')
  )
}

function richAt(runs: readonly StyleRun[], meta: RichMeta, index: number): RichStyle {
  const style = { ...styleAt(runs, index) } as RichStyle
  const highlight = metaAt(meta.highlights, index)
  const link = metaAt(meta.links, index)
  const backgroundFill = style.backgroundFills?.find(
    (fill) => fill.visible && fill.type === 'SOLID'
  )
  if (backgroundFill) style.background = backgroundFill.color
  if (highlight) style.background = highlight.color
  if (link) style.href = link.href
  return style
}

function wrapChunk(chunk: string, style: RichStyle): string {
  let html = escapeHTML(chunk).replaceAll('\n', '<br>')
  if ((style.fontWeight ?? 0) >= 700) html = `<b>${html}</b>`
  if (style.italic) html = `<i>${html}</i>`
  if (style.textDecoration === 'UNDERLINE') html = `<u>${html}</u>`
  if (style.textDecoration === 'STRIKETHROUGH') html = `<s>${html}</s>`
  const parts: string[] = []
  const color = fillColor(style.fills)
  if (color) parts.push(`color:${colorToHex(color)}`)
  if (style.background) parts.push(`background-color:${colorToHex(style.background)}`)
  if (style.fontSize) parts.push(`font-size:${style.fontSize}px`)
  if (parts.length > 0) html = `<span style="${parts.join(';')}">${html}</span>`
  if (style.href) html = `<a href="${escapeHTML(style.href)}">${html}</a>`
  return html
}

function wrapInline(
  text: string,
  globalStart: number,
  runs: readonly StyleRun[],
  meta: RichMeta
): string {
  if (!text) return ''
  let html = ''
  let index = 0
  while (index < text.length) {
    const style = richAt(runs, meta, globalStart + index)
    let end = index + 1
    while (end < text.length && sameStyle(richAt(runs, meta, globalStart + end), style)) end++
    html += wrapChunk(text.slice(index, end), style)
    index = end
  }
  return html
}

export function emptyRichMeta(): RichMeta {
  return { highlights: [], links: [], images: [] }
}

export function readRichMeta(pluginData: PluginDataEntry[]): RichMeta {
  const entry = pluginData.find(
    (item) => item.pluginId === RICH_PLUGIN_ID && item.key === RICH_PLUGIN_KEY
  )
  if (!entry?.value) return emptyRichMeta()
  try {
    const parsed = JSON.parse(entry.value) as Partial<RichMeta>
    return {
      highlights: parsed.highlights ?? [],
      links: parsed.links ?? [],
      images: parsed.images ?? []
    }
  } catch {
    return emptyRichMeta()
  }
}

export function writeRichMeta(pluginData: PluginDataEntry[], meta: RichMeta): PluginDataEntry[] {
  const value = JSON.stringify(meta)
  return [
    ...pluginData.filter(
      (item) => item.pluginId !== RICH_PLUGIN_ID || item.key !== RICH_PLUGIN_KEY
    ),
    { pluginId: RICH_PLUGIN_ID, key: RICH_PLUGIN_KEY, value }
  ]
}

export function sceneStyleFromRich(style: RichStyle): CharacterStyleOverride {
  const next: CharacterStyleOverride = {}
  if (style.fontWeight) next.fontWeight = style.fontWeight
  if (style.italic) next.italic = true
  if (style.textDecoration && style.textDecoration !== 'NONE')
    next.textDecoration = style.textDecoration
  if (style.fontSize) next.fontSize = style.fontSize
  if (style.fills) next.fills = style.fills
  if (style.background) next.backgroundFills = [solidFill(style.background)]
  if (style.href && !style.fills) next.fills = [solidFill(LINK_COLOR)]
  if (style.href && !style.textDecoration) next.textDecoration = 'UNDERLINE'
  return next
}

function blockMeta(block: RichBlock): RichMeta {
  return { highlights: block.highlights, links: block.links, images: [] }
}

function blocksToHTML(blocks: RichBlock[]): string {
  const markers = assignListMarkers(blocks)
  let html = ''
  for (const [index, block] of blocks.entries()) {
    if (block.image) {
      const image = block.image
      const src = escapeHTML(image.src)
      const hash = escapeHTML(image.hash)
      const oss = escapeHTML(image.ossPath)
      const size =
        image.width > 0 && image.height > 0
          ? ` width="${image.width}" height="${image.height}"`
          : ''
      html += `<p><img src="${src}" data-image-hash="${hash}" data-oss-path="${oss}"${size} alt=""></p>`
      continue
    }
    const assigned = markers[index] ?? { indent: 0, marker: '' }
    const tag = block.heading === 0 ? 'p' : `h${block.heading}`
    const listAttr = block.list ? ` data-list="${block.list}"` : ''
    const indentAttr = block.list || assigned.indent > 0 ? ` data-indent="${assigned.indent}"` : ''
    const markerHTML = assigned.marker
      ? `<span data-rich-marker="1" contenteditable="false">${escapeHTML(assigned.marker)}</span>`
      : ''
    html += `<${tag}${listAttr}${indentAttr}>${markerHTML}${wrapInline(block.content, 0, block.runs, blockMeta(block))}</${tag}>`
  }
  return html || '<p></p>'
}

export function styledTextToHTML(
  text: string,
  runs: readonly StyleRun[],
  meta: RichMeta = emptyRichMeta()
): string {
  const blocks = splitStyledTextToBlocks(text, runs, meta.highlights, meta.links)
  for (const image of meta.images) blocks.push(emptyBlock({ image }))
  return blocksToHTML(blocks)
}

function styleFromTag(name: string, style: RichStyle): RichStyle {
  if (name === 'B' || name === 'STRONG') return { ...style, fontWeight: 700 }
  if (name === 'I' || name === 'EM') return { ...style, italic: true }
  if (name === 'U') return { ...style, textDecoration: 'UNDERLINE' }
  if (name === 'S' || name === 'STRIKE' || name === 'DEL') {
    return { ...style, textDecoration: 'STRIKETHROUGH' }
  }
  if (name === 'H1') return { ...style, ...styleForHeading(1) }
  if (name === 'H2') return { ...style, ...styleForHeading(2) }
  if (name === 'H3') return { ...style, ...styleForHeading(3) }
  if (name === 'H4') return { ...style, ...styleForHeading(4) }
  if (name === 'H5') return { ...style, ...styleForHeading(5) }
  if (name === 'H6') return { ...style, ...styleForHeading(6) }
  return style
}

function quotedAttr(attrs: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attrs)
  return match?.[1] ?? match?.[2] ?? match?.[3]
}

function cssFromAttrs(attrs: string): string {
  return quotedAttr(attrs, 'style') ?? attrs
}

function parseCssColorValue(raw: string | undefined): Color | undefined {
  if (!raw) return undefined
  const value = raw.trim().replace(/["';]+$/g, '')
  if (!value || value === 'transparent' || value === 'inherit' || value === 'initial') {
    return undefined
  }
  return parseColor(value)
}

function parseCssColor(css: string, kind: 'color' | 'background'): Color | undefined {
  for (const part of css.split(';')) {
    const separator = part.indexOf(':')
    if (separator < 0) continue
    const name = part.slice(0, separator).trim().toLowerCase()
    const value = part.slice(separator + 1)
    if (kind === 'background' && (name === 'background' || name === 'background-color')) {
      return parseCssColorValue(value)
    }
    if (kind === 'color' && (name === 'color' || name === '-webkit-text-fill-color')) {
      return parseCssColorValue(value)
    }
  }
  return undefined
}

function styleFromInline(attrs: string, style: RichStyle): RichStyle {
  const css = cssFromAttrs(attrs)
  const next = { ...style }
  if (/\bfont-weight\s*:\s*(bold|[7-9]00)\b/i.test(css)) next.fontWeight = 700
  if (/\bfont-style\s*:\s*italic\b/i.test(css)) next.italic = true
  if (/\btext-decoration(?:-line)?\s*:[^;]*underline\b/i.test(css)) {
    next.textDecoration = 'UNDERLINE'
  }
  if (/\btext-decoration(?:-line)?\s*:[^;]*line-through\b/i.test(css)) {
    next.textDecoration = 'STRIKETHROUGH'
  }
  const size = /\bfont-size\s*:\s*([\d.]+)px/i.exec(css)
  if (size) next.fontSize = Number(size[1])
  const color = parseCssColor(css, 'color') ?? parseCssColorValue(quotedAttr(attrs, 'color'))
  if (color) next.fills = [solidFill(color)]
  const background =
    parseCssColor(css, 'background') ?? parseCssColorValue(quotedAttr(attrs, 'bgcolor'))
  if (background) next.background = background
  return next
}

function hrefFromAttrs(attrs: string): string | undefined {
  return quotedAttr(attrs, 'href')
}

function cssPx(css: string, property: 'width' | 'height'): number {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([\\d.]+)px`, 'i').exec(css)
  return match ? Number(match[1]) : 0
}

function boxFromCss(attrs: string): { width: number; height: number } {
  const css = cssFromAttrs(attrs)
  return { width: cssPx(css, 'width'), height: cssPx(css, 'height') }
}

function applyImageBox(image: RichImage, box: { width: number; height: number }): RichImage {
  return {
    ...image,
    width: box.width > 0 ? box.width : image.width,
    height: box.height > 0 ? box.height : image.height
  }
}

function imageFromAttrs(attrs: string): RichImage | null {
  const hash = quotedAttr(attrs, 'data-image-hash')
  if (!hash) return null
  const box = boxFromCss(attrs)
  return {
    hash,
    ossPath: quotedAttr(attrs, 'data-oss-path') ?? '',
    src: quotedAttr(attrs, 'src') ?? '',
    width: box.width || Number(quotedAttr(attrs, 'width') ?? 0) || 0,
    height: box.height || Number(quotedAttr(attrs, 'height') ?? 0) || 0
  }
}

function isStyled(style: RichStyle): boolean {
  return Boolean(
    style.fontWeight ||
    style.italic ||
    (style.textDecoration && style.textDecoration !== 'NONE') ||
    style.fontSize ||
    style.fills ||
    style.background ||
    style.href
  )
}

function decodeEntities(value: string): string {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'])

function headingFromTag(name: string): HeadingLevel | null {
  const match = /^H([1-6])$/.exec(name)
  return match ? (Number(match[1]) as HeadingLevel) : null
}

function listFromAttrs(attrs: string): { list: ListKind; indent: number | null } {
  const list = quotedAttr(attrs, 'data-list')
  const indentRaw = quotedAttr(attrs, 'data-indent')
  return {
    list: list === 'ol' || list === 'ul' ? list : null,
    indent: indentRaw == null || indentRaw === '' ? null : Number(indentRaw)
  }
}

function isMarkerSpan(attrs: string): boolean {
  return /\bdata-rich-marker\b/i.test(attrs)
}

function isImageWrap(attrs: string): boolean {
  return /\bdata-rich-image\b/i.test(attrs)
}

function pushBlockChunk(block: RichBlock, value: string, style: RichStyle): void {
  if (!value) return
  const start = block.content.length
  if (isStyled(style)) {
    const scene = sceneStyleFromRich(style)
    if (Object.keys(scene).length > 0) {
      block.runs.push({ start, length: value.length, style: scene })
    }
  }
  if (style.background) {
    block.highlights.push({ start, length: value.length, color: style.background })
  }
  if (style.href) {
    block.links.push({ start, length: value.length, href: style.href })
  }
  block.content += value
}

function openStyledTag(name: string, attrs: string, current: RichStyle): RichStyle {
  let next = styleFromInline(attrs, styleFromTag(name, current))
  if (name === 'A') {
    const href = hrefFromAttrs(attrs)
    if (href) {
      next = {
        ...next,
        href,
        fills: next.fills ?? [solidFill(LINK_COLOR)],
        textDecoration: next.textDecoration ?? 'UNDERLINE'
      }
    }
  }
  if (name === 'MARK' && !next.background) next = { ...next, background: parseColor('#ffe58f') }
  return next
}

function htmlToBlocks(html: string): { blocks: RichBlock[] } {
  const blocks: RichBlock[] = []
  const stack: RichStyle[] = [{}]
  const listStack: ListKind[] = []
  let current: RichBlock | null = null
  let skipMarker = 0
  let pendingImageBox = { width: 0, height: 0 }

  function flush() {
    if (!current) return
    current.content = current.content.replace(/\n+$/g, '')
    if (current.content || current.image) blocks.push(current)
    current = null
  }

  function startBlock(heading: HeadingLevel, list: ListKind, indent: number, attrs: string) {
    flush()
    const fromAttrs = listFromAttrs(attrs)
    current = emptyBlock({
      heading,
      list: fromAttrs.list ?? list,
      indent: fromAttrs.indent ?? indent
    })
  }

  function ensureBlock(): RichBlock {
    if (current) return current
    const list = listStack.at(-1) ?? null
    startBlock(0, list, Math.max(0, listStack.length - 1), '')
    return current ?? emptyBlock()
  }

  const token = /<(\/)?([a-z][a-z0-9]*)([^>]*)>|([^<]+)/gi
  let match: RegExpExecArray | null
  while ((match = token.exec(html))) {
    const [, slash, tag, attrs, raw] = match
    if (raw) {
      if (skipMarker === 0) {
        pushBlockChunk(ensureBlock(), decodeEntities(raw), stack.at(-1) ?? {})
      }
      continue
    }
    const name = (tag ?? '').toUpperCase()
    const attr = attrs ?? ''
    if (!slash && name === 'IMG') {
      const image = imageFromAttrs(attr)
      if (image) {
        flush()
        blocks.push(emptyBlock({ image: applyImageBox(image, pendingImageBox) }))
      }
      pendingImageBox = { width: 0, height: 0 }
      continue
    }
    if (slash) {
      if (name === 'SPAN' && skipMarker > 0) skipMarker -= 1
      if (name === 'UL' || name === 'OL') listStack.pop()
      if (BLOCK_TAGS.has(name)) flush()
      if (stack.length > 1) stack.pop()
      continue
    }
    if (name === 'BR') {
      pushBlockChunk(ensureBlock(), '\n', stack.at(-1) ?? {})
      continue
    }
    if (name === 'UL' || name === 'OL') {
      listStack.push(name === 'UL' ? 'ul' : 'ol')
      stack.push(stack.at(-1) ?? {})
      continue
    }
    if (name === 'SPAN' && isMarkerSpan(attr)) {
      skipMarker += 1
      stack.push(stack.at(-1) ?? {})
      continue
    }
    if (name === 'SPAN' && isImageWrap(attr)) {
      pendingImageBox = boxFromCss(attr)
      stack.push(stack.at(-1) ?? {})
      continue
    }
    const heading = headingFromTag(name)
    if (heading != null || name === 'P' || name === 'DIV' || name === 'LI') {
      const list = name === 'LI' ? (listStack.at(-1) ?? null) : listFromAttrs(attr).list
      const indent =
        heading != null
          ? headingListIndent(heading, listStack.length)
          : Math.max(0, listStack.length - (name === 'LI' ? 1 : 0))
      startBlock(heading ?? 0, list, indent, attr)
    }
    stack.push(openStyledTag(name, attr, stack.at(-1) ?? {}))
  }
  flush()
  return { blocks }
}

export function parseRichHTML(html: string): {
  blocks: RichBlock[]
  text: string
  runs: StyleRun[]
  meta: RichMeta
} {
  const { blocks } = htmlToBlocks(html)
  const flattened = flattenBlocks(blocks.length > 0 ? blocks : [emptyBlock()])
  return {
    blocks,
    text: flattened.text,
    runs: flattened.runs,
    meta: {
      highlights: flattened.highlights,
      links: flattened.links,
      images: blocks
        .map((block) => block.image)
        .filter((image): image is RichImage => Boolean(image))
    }
  }
}

export function htmlStringToStyledText(html: string): {
  text: string
  runs: StyleRun[]
  meta: RichMeta
} {
  const parsed = parseRichHTML(html)
  return { text: parsed.text, runs: parsed.runs, meta: parsed.meta }
}

export function coveringFills(text: string, runs: readonly StyleRun[]): Fill[] | undefined {
  if (!text) return undefined
  const run = runs.find(
    (item) => item.start === 0 && item.length >= text.length && (item.style.fills?.length ?? 0) > 0
  )
  return run?.style.fills
}

export function richBlocksToHTML(blocks: RichBlock[]): string {
  return blocksToHTML(blocks)
}

export function htmlToStyledText(root: ParentNode): {
  text: string
  runs: StyleRun[]
  meta: RichMeta
} {
  return htmlStringToStyledText((root as Element).innerHTML ?? '')
}
