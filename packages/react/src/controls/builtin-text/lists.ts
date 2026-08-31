import type { CharacterStyleOverride, Fill, StyleRun } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

export const RICH_BODY_SIZE = 14
export const RICH_HEADING_SIZES = [0, 32, 24, 20, 18, 16, 14] as const
export const LIST_INDENT = '  '
export const UL_MARKER = '• '
export const MAX_LIST_INDENT = 6

export type HeadingLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type ListKind = 'ol' | 'ul' | null

export type RichImage = {
  hash: string
  ossPath: string
  src: string
  width: number
  height: number
}

export type RichBlock = {
  heading: HeadingLevel
  list: ListKind
  indent: number
  content: string
  runs: StyleRun[]
  highlights: Array<{ start: number; length: number; color: Color }>
  links: Array<{ start: number; length: number; href: string }>
  image?: RichImage
}

export function headingLevelForStyle(style: CharacterStyleOverride): HeadingLevel {
  if ((style.fontWeight ?? 0) < 700) return 0
  const size = style.fontSize ?? 0
  const index = RICH_HEADING_SIZES.indexOf(size as (typeof RICH_HEADING_SIZES)[number])
  if (index >= 1 && index <= 6) return index as HeadingLevel
  return 0
}

export function styleForHeading(level: HeadingLevel): CharacterStyleOverride {
  if (level === 0) return { fontSize: RICH_BODY_SIZE, fontWeight: 400 }
  return { fontSize: RICH_HEADING_SIZES[level], fontWeight: 700 }
}

export function emptyBlock(overrides: Partial<RichBlock> = {}): RichBlock {
  return {
    heading: 0,
    list: null,
    indent: 0,
    content: '',
    runs: [],
    highlights: [],
    links: [],
    ...overrides
  }
}

export function headingListIndent(heading: HeadingLevel, fallback = 0): number {
  return heading > 0 ? heading - 1 : fallback
}

export function formatOlMarker(parts: number[]): string {
  if (parts.length <= 1) return `${parts[0] ?? 1}. `
  return `${parts.join('.')} `
}

export function parseLinePrefix(line: string): {
  indent: number
  list: ListKind
  marker: string
  content: string
} {
  const spaces = /^( *)/.exec(line)?.[1]?.length ?? 0
  const rest = line.slice(spaces)
  const indent = Math.min(MAX_LIST_INDENT, Math.floor(spaces / LIST_INDENT.length))
  if (rest.startsWith(UL_MARKER)) {
    return { indent, list: 'ul', marker: UL_MARKER, content: rest.slice(UL_MARKER.length) }
  }
  const ordered = /^(\d+(?:\.\d+)*)(\.?) /.exec(rest)
  if (ordered) {
    return { indent, list: 'ol', marker: ordered[0], content: rest.slice(ordered[0].length) }
  }
  return { indent: 0, list: null, marker: '', content: line }
}

export function assignListMarkers(
  blocks: ReadonlyArray<Pick<RichBlock, 'heading' | 'list' | 'indent'>>
): Array<{ indent: number; marker: string }> {
  const headingCount = [0, 0, 0, 0, 0, 0, 0]
  const bodyCount: number[] = []
  return blocks.map((block) => {
    const indent = headingListIndent(block.heading, block.indent)
    if (block.list === 'ul') {
      bodyCount.length = 0
      return { indent, marker: UL_MARKER }
    }
    if (block.list === 'ol' && block.heading > 0) {
      bodyCount.length = 0
      const level = block.heading
      headingCount[level] += 1
      for (let index = level + 1; index <= 6; index++) headingCount[index] = 0
      const parts: number[] = []
      for (let index = 1; index <= level; index++) {
        parts.push(headingCount[index] > 0 ? headingCount[index] : 1)
      }
      return { indent, marker: formatOlMarker(parts) }
    }
    if (block.list === 'ol') {
      const depth = Math.min(MAX_LIST_INDENT, indent)
      bodyCount.length = depth + 1
      bodyCount[depth] = (bodyCount[depth] ?? 0) + 1
      return { indent: depth, marker: `${bodyCount[depth]}. ` }
    }
    bodyCount.length = 0
    return { indent: 0, marker: '' }
  })
}

export function shiftSpan<T extends { start: number; length: number }>(
  items: readonly T[],
  from: number,
  length: number,
  offset: number
): T[] {
  const next: T[] = []
  for (const item of items) {
    const start = Math.max(item.start, from)
    const end = Math.min(item.start + item.length, from + length)
    if (end <= start) continue
    next.push({ ...item, start: start - from + offset, length: end - start })
  }
  return next
}

export function flattenBlocks(blocks: RichBlock[]): {
  text: string
  runs: StyleRun[]
  highlights: Array<{ start: number; length: number; color: Color }>
  links: Array<{ start: number; length: number; href: string }>
} {
  const markers = assignListMarkers(blocks)
  let text = ''
  const runs: StyleRun[] = []
  const highlights: Array<{ start: number; length: number; color: Color }> = []
  const links: Array<{ start: number; length: number; href: string }> = []
  for (const [index, block] of blocks.entries()) {
    if (block.image) continue
    const assigned = markers[index] ?? { indent: 0, marker: '' }
    const prefix = `${LIST_INDENT.repeat(assigned.indent)}${assigned.marker}`
    if (text.length > 0) text += '\n'
    const lineStart = text.length
    if (prefix && block.heading > 0) {
      runs.push({ start: lineStart, length: prefix.length, style: styleForHeading(block.heading) })
    }
    runs.push(...shiftSpan(block.runs, 0, block.content.length, lineStart + prefix.length))
    highlights.push(
      ...shiftSpan(block.highlights, 0, block.content.length, lineStart + prefix.length)
    )
    links.push(...shiftSpan(block.links, 0, block.content.length, lineStart + prefix.length))
    text += prefix + block.content
  }
  return { text, runs: mergeHighlightRuns(runs, highlights), highlights, links }
}

function highlightFills(color: Color): Fill[] {
  return [{ type: 'SOLID', color, opacity: color.a, visible: true, blendMode: 'NORMAL' }]
}

export function mergeHighlightRuns(
  runs: StyleRun[],
  highlights: Array<{ start: number; length: number; color: Color }>
): StyleRun[] {
  if (highlights.length === 0) return runs
  const next = runs.map((run) => ({
    start: run.start,
    length: run.length,
    style: { ...run.style }
  }))
  for (const highlight of highlights) {
    const start = highlight.start
    const end = highlight.start + highlight.length
    const overlapping = next.filter((run) => run.start < end && run.start + run.length > start)
    if (overlapping.length === 0) {
      next.push({
        start,
        length: highlight.length,
        style: { backgroundFills: highlightFills(highlight.color) }
      })
      continue
    }
    for (const run of overlapping) {
      run.style = { ...run.style, backgroundFills: highlightFills(highlight.color) }
    }
  }
  next.sort((left, right) => left.start - right.start)
  return next
}

export function splitStyledTextToBlocks(
  text: string,
  runs: readonly StyleRun[],
  highlights: Array<{ start: number; length: number; color: Color }>,
  links: Array<{ start: number; length: number; href: string }>
): RichBlock[] {
  if (!text) return [emptyBlock()]
  const lines = text.split('\n')
  let offset = 0
  const blocks: RichBlock[] = []
  for (const line of lines) {
    const parsed = parseLinePrefix(line)
    const prefixLength = line.length - parsed.content.length
    const contentStart = offset + prefixLength
    const heading = headingLevelForStyle(
      runs.find((run) => contentStart >= run.start && contentStart < run.start + run.length)
        ?.style ?? {}
    )
    blocks.push(
      emptyBlock({
        heading,
        list: parsed.list,
        indent: headingListIndent(heading, parsed.indent),
        content: parsed.content,
        runs: shiftSpan(runs, contentStart, parsed.content.length, 0),
        highlights: shiftSpan(highlights, contentStart, parsed.content.length, 0),
        links: shiftSpan(links, contentStart, parsed.content.length, 0)
      })
    )
    offset += line.length + 1
  }
  return blocks
}
