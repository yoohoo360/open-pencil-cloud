import {
  assignListMarkers,
  headingListIndent,
  MAX_LIST_INDENT,
  type HeadingLevel,
  type ListKind
} from '#react/controls/builtin-text/lists'

const BLOCK_SELECTOR =
  ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > p, :scope > div'

function headingFromElement(element: HTMLElement): HeadingLevel {
  const match = /^H([1-6])$/.exec(element.tagName)
  return match ? (Number(match[1]) as HeadingLevel) : 0
}

function listFromElement(element: HTMLElement): ListKind {
  const list = element.dataset.list
  return list === 'ol' || list === 'ul' ? list : null
}

export function selectedBlocks(root: HTMLElement, range: Range | null): HTMLElement[] {
  const blocks = [...root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)]
  if (blocks.length === 0) return []
  if (!range) return blocks
  const hit = blocks.filter((block) => range.intersectsNode(block))
  if (hit.length > 0) return hit
  const ancestor = range.commonAncestorContainer
  const owner = ancestor instanceof HTMLElement ? ancestor : ancestor.parentElement
  const block = owner?.closest('h1,h2,h3,h4,h5,h6,p,div')
  return block instanceof HTMLElement && root.contains(block) ? [block] : []
}

function setMarker(element: HTMLElement, marker: string) {
  const existing = [...element.childNodes].find(
    (node) => node instanceof HTMLElement && node.dataset.richMarker != null
  )
  if (!marker) {
    existing?.remove()
    return
  }
  if (existing instanceof HTMLElement) {
    existing.textContent = marker
    return
  }
  const span = document.createElement('span')
  span.dataset.richMarker = '1'
  span.contentEditable = 'false'
  span.textContent = marker
  element.insertBefore(span, element.firstChild)
}

export function refreshListMarkers(root: HTMLElement) {
  const blocks = [...root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)]
  const specs = blocks.map((element) => ({
    heading: headingFromElement(element),
    list: listFromElement(element),
    indent: Number(element.dataset.indent ?? 0)
  }))
  const markers = assignListMarkers(specs)
  for (const [index, element] of blocks.entries()) {
    const assigned = markers[index] ?? { indent: 0, marker: '' }
    if (assigned.indent > 0 || listFromElement(element)) {
      element.dataset.indent = String(assigned.indent)
    } else {
      delete element.dataset.indent
    }
    setMarker(element, assigned.marker)
    element.style.paddingLeft = assigned.indent > 0 ? `${assigned.indent * 12}px` : ''
  }
}

function replaceTag(element: HTMLElement, tagName: string): HTMLElement {
  if (element.tagName.toLowerCase() === tagName) return element
  const next = document.createElement(tagName)
  for (const attr of element.attributes) next.setAttribute(attr.name, attr.value)
  while (element.firstChild) next.appendChild(element.firstChild)
  element.replaceWith(next)
  return next
}

export function setBlocksHeading(root: HTMLElement, range: Range | null, level: HeadingLevel) {
  const tag = level === 0 ? 'p' : `h${level}`
  for (const block of selectedBlocks(root, range)) {
    const next = replaceTag(block, tag)
    if (listFromElement(next)) {
      next.dataset.indent = String(headingListIndent(level, Number(next.dataset.indent ?? 0)))
    }
  }
  refreshListMarkers(root)
}

export function toggleBlocksList(
  root: HTMLElement,
  range: Range | null,
  kind: Exclude<ListKind, null>
) {
  const blocks = selectedBlocks(root, range)
  if (blocks.length === 0) return
  const disable = blocks.every((block) => listFromElement(block) === kind)
  for (const block of blocks) {
    if (disable) {
      delete block.dataset.list
      delete block.dataset.indent
    } else {
      block.dataset.list = kind
      const heading = headingFromElement(block)
      block.dataset.indent = String(headingListIndent(heading, Number(block.dataset.indent ?? 0)))
    }
  }
  refreshListMarkers(root)
}

export function adjustBlocksIndent(root: HTMLElement, range: Range | null, delta: number) {
  const blocks = selectedBlocks(root, range)
  for (const block of blocks) {
    if (!listFromElement(block) || headingFromElement(block) > 0) continue
    const indent = Math.min(MAX_LIST_INDENT, Math.max(0, Number(block.dataset.indent ?? 0) + delta))
    block.dataset.indent = String(indent)
  }
  refreshListMarkers(root)
}
