import {
  downloadRemoteImageBytes,
  imageFill,
  lookupCanvasImageKey,
  placeholderImageFill,
  rememberGraphImage,
  resolveCanvasImageKey
} from '#react/controls/builtin-text/images'
import { flattenBlocks, type RichBlock, type RichImage } from '#react/controls/builtin-text/lists'
import {
  markdownSectionsToHTML,
  markdownToBlocks,
  parseMarkdownSections,
  type MarkdownSection
} from '#react/controls/builtin-text/markdown'
import { parseRichHTML, RICH_PLUGIN_ID } from '#react/controls/builtin-text/model'
import {
  mergeRichImageMap,
  readRichImageMap,
  readRichMarkdown,
  resolveImageHash,
  type RichImageMap
} from '#react/controls/builtin-text/storage'
import { BUILTIN_COMPONENT_NAME } from '#react/graph/builtin'

import type { Editor } from '@open-pencil/core/editor'
import { computeAllLayouts, computeLayout, estimateTextSize, getTextMeasurer } from '@open-pencil/core/layout'
import {
  recordInstanceOverride,
  type Fill,
  type PluginDataEntry,
  type SceneNode,
  type Stroke
} from '@open-pencil/scene-graph'

const MD_NODE_KEY = 'md-node'
const BLACK = { r: 0.12, g: 0.12, b: 0.12, a: 1 }
const BORDER = { r: 0.82, g: 0.82, b: 0.82, a: 1 }
const HEADER_FILL = { r: 0.96, g: 0.96, b: 0.96, a: 1 }
const WHITE = { r: 1, g: 1, b: 1, a: 1 }

const remoteLoads = new Set<string>()

type TextSlot = { text: string; styleRuns: ReturnType<typeof flattenBlocks>['runs'] }
type ContentSlot =
  | { kind: 'text'; slot: TextSlot }
  | { kind: 'image'; image: NonNullable<MarkdownSection & { kind: 'image' }>['image'] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'hr' }

function solid(color: Fill['color']): Fill {
  return { type: 'SOLID', color, opacity: 1, visible: true, blendMode: 'NORMAL' }
}

function borderStroke(): Stroke {
  return { color: BORDER, weight: 1, opacity: 1, visible: true, align: 'INSIDE' }
}

function mdPlugin(kind: string, extras: PluginDataEntry[] = []): PluginDataEntry[] {
  return [
    ...extras.filter((entry) => entry.pluginId !== RICH_PLUGIN_ID || entry.key !== MD_NODE_KEY),
    { pluginId: RICH_PLUGIN_ID, key: MD_NODE_KEY, value: kind }
  ]
}

function mdKind(node: SceneNode | undefined): string | null {
  const value = node?.pluginData.find(
    (entry) => entry.pluginId === RICH_PLUGIN_ID && entry.key === MD_NODE_KEY
  )?.value
  return value || null
}

function isTextSection(section: MarkdownSection): boolean {
  return (
    section.kind === 'paragraph' ||
    section.kind === 'heading' ||
    section.kind === 'list' ||
    section.kind === 'quote' ||
    section.kind === 'code'
  )
}

function withMappedHash(image: RichImage, map: RichImageMap): RichImage {
  const mapped = resolveImageHash(map, image.ossPath, image.src, image.hash)
  if (!mapped || mapped === image.hash) return image
  return { ...image, hash: mapped }
}

function pushTextSlot(slots: ContentSlot[], block: RichBlock): void {
  const flattened = flattenBlocks([block])
  if (!flattened.text.trim()) return
  slots.push({ kind: 'text', slot: { text: flattened.text, styleRuns: flattened.runs } })
}

function slotsFromMarkdown(markdown: string, map: RichImageMap = {}): ContentSlot[] {
  const sections = parseMarkdownSections(markdown)
  const slots: ContentSlot[] = []
  let text: MarkdownSection[] = []
  function flush() {
    if (text.length === 0) return
    // One canvas TEXT per markdown block so paragraph / heading / list gaps match HTML.
    // Parse the HTML directly — do not run it through markdownToBlocks (re-parses as MD).
    const blocks = parseRichHTML(markdownSectionsToHTML(text)).blocks
    for (const block of blocks) {
      if (block.image) {
        slots.push({ kind: 'image', image: withMappedHash(block.image, map) })
        continue
      }
      pushTextSlot(slots, block)
    }
    text = []
  }
  for (const section of sections) {
    if (section.kind === 'image') {
      flush()
      slots.push({ kind: 'image', image: withMappedHash(section.image, map) })
      continue
    }
    if (section.kind === 'table') {
      flush()
      slots.push({ kind: 'table', header: section.header, rows: section.rows })
      continue
    }
    if (section.kind === 'hr') {
      flush()
      slots.push({ kind: 'hr' })
      continue
    }
    if (isTextSection(section)) text.push(section)
  }
  flush()
  return slots
}

function contentWidth(host: SceneNode): number {
  return Math.max(1, host.width - host.paddingLeft - host.paddingRight)
}

function measureTextHeight(node: SceneNode, width: number): number {
  const measured = getTextMeasurer()?.(node, width)
  if (measured) return Math.max(16, measured.height)
  let maxSize = node.fontSize || 14
  for (const run of node.styleRuns ?? []) {
    const size = run.style.fontSize
    if (size && size > maxSize) maxSize = size
  }
  const lines = Math.max(1, (node.text || '').split('\n').length)
  const estimated = estimateTextSize({ ...node, fontSize: maxSize }, width)
  return Math.max(16, estimated.height, Math.ceil(lines * maxSize * 1.35))
}

function textLayout(host: SceneNode): Partial<SceneNode> {
  return {
    x: host.paddingLeft,
    width: contentWidth(host),
    fontSize: 14,
    fontFamily: 'Inter',
    textAutoResize: 'HEIGHT',
    layoutAlignSelf: 'STRETCH',
    layoutGrow: 0
  }
}

function applyText(
  editor: Editor,
  host: SceneNode,
  nodeId: string,
  slot: TextSlot,
  kind: string
): void {
  const existing = editor.graph.getNode(nodeId)
  if (!existing) return
  const width = contentWidth(host)
  const layout = textLayout(host)
  const measured = measureTextHeight(
    { ...existing, text: slot.text, styleRuns: slot.styleRuns, ...layout, width },
    width
  )
  editor.graph.updateNode(nodeId, {
    name: BUILTIN_COMPONENT_NAME,
    text: slot.text,
    styleRuns: slot.styleRuns,
    visible: true,
    fills: existing.fills.length > 0 ? existing.fills : [solid(BLACK)],
    pluginData: mdPlugin(kind, existing.pluginData),
    ...layout,
    width,
    height: measured,
    derivedLayout: null,
    derivedTextGlyphs: null
  })
  recordInstanceOverride(editor.graph, nodeId, ['text', 'height', 'width', 'fontSize', 'visible'])
}

function createText(
  editor: Editor,
  host: SceneNode,
  slot: TextSlot
): SceneNode {
  const width = contentWidth(host)
  const layout = textLayout(host)
  const node = editor.graph.createNode('TEXT', host.id, {
    name: BUILTIN_COMPONENT_NAME,
    text: slot.text,
    styleRuns: slot.styleRuns,
    y: host.paddingTop,
    width,
    height: 16,
    fills: [solid(BLACK)],
    pluginData: mdPlugin('text'),
    ...layout
  })
  editor.graph.updateNode(node.id, {
    height: measureTextHeight(node, width),
    derivedLayout: null,
    derivedTextGlyphs: null
  })
  return node
}

function hideSeedText(editor: Editor, nodeId: string): void {
  editor.graph.updateNode(nodeId, {
    text: ' ',
    styleRuns: [],
    visible: false,
    height: 1,
    derivedLayout: null,
    derivedTextGlyphs: null
  })
  recordInstanceOverride(editor.graph, nodeId, ['text', 'height', 'visible'])
}

function imageFills(imageHash: string): Fill[] {
  return [placeholderImageFill(), imageFill(imageHash)]
}

function imageBox(host: SceneNode, image: RichImage): { width: number; height: number } {
  const maxWidth = contentWidth(host)
  let width = image.width > 0 ? image.width : maxWidth
  let height = image.height > 0 ? image.height : Math.max(80, Math.round(maxWidth * 0.6))
  if (width > maxWidth) {
    height = Math.max(1, Math.round((height * maxWidth) / width))
    width = maxWidth
  }
  return { width: Math.max(1, width), height: Math.max(1, height) }
}

function createImage(editor: Editor, host: SceneNode, image: ContentSlot & { kind: 'image' }): SceneNode {
  const key =
    lookupCanvasImageKey(editor.graph, image.image) ?? resolveCanvasImageKey(image.image)
  const { width, height } = imageBox(host, image.image)
  return editor.graph.createNode('RECTANGLE', host.id, {
    name: 'Image',
    x: host.paddingLeft,
    y: host.paddingTop,
    width,
    height,
    layoutMode: 'NONE',
    layoutAlignSelf: 'MIN',
    layoutGrow: 0,
    minWidth: width,
    minHeight: height,
    fills: imageFills(key),
    pluginData: mdPlugin('image')
  })
}

/** Visual thematic break for Markdown `---` / `***` / `___` (not the literal characters). */
function createHr(editor: Editor, host: SceneNode): SceneNode {
  const width = contentWidth(host)
  return editor.graph.createNode('RECTANGLE', host.id, {
    name: 'Divider',
    x: host.paddingLeft,
    y: host.paddingTop,
    width,
    height: 1,
    layoutMode: 'NONE',
    layoutAlignSelf: 'STRETCH',
    layoutGrow: 0,
    fills: [solid(BORDER)],
    strokes: [],
    pluginData: mdPlugin('hr')
  })
}

function createCell(
  editor: Editor,
  rowId: string,
  text: string,
  header: boolean,
  width: number
): SceneNode {
  const cell = editor.graph.createNode('FRAME', rowId, {
    name: header ? 'Header' : 'Cell',
    width: Math.max(24, width),
    height: 28,
    layoutMode: 'VERTICAL',
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'FIXED',
    layoutGrow: 1,
    layoutAlignSelf: 'STRETCH',
    paddingTop: 6,
    paddingRight: 8,
    paddingBottom: 6,
    paddingLeft: 8,
    fills: [solid(header ? HEADER_FILL : WHITE)],
    strokes: [borderStroke()],
    pluginData: mdPlugin(header ? 'th' : 'td')
  })
  const label = editor.graph.createNode('TEXT', cell.id, {
    name: 'Label',
    text,
    width: Math.max(16, width - 16),
    height: 16,
    fontSize: 12,
    fontWeight: header ? 700 : 400,
    fontFamily: 'Inter',
    textAutoResize: 'HEIGHT',
    layoutAlignSelf: 'STRETCH',
    fills: [solid(BLACK)],
    pluginData: mdPlugin('label')
  })
  editor.graph.updateNode(label.id, {
    height: measureTextHeight(label, label.width),
    derivedLayout: null,
    derivedTextGlyphs: null
  })
  return cell
}

function createTable(
  editor: Editor,
  host: SceneNode,
  table: Extract<ContentSlot, { kind: 'table' }>
): SceneNode {
  const width = contentWidth(host)
  const columns = Math.max(1, table.header.length)
  const cellWidth = Math.max(24, Math.floor(width / columns))
  const frame = editor.graph.createNode('FRAME', host.id, {
    name: 'Table',
    x: host.paddingLeft,
    y: host.paddingTop,
    width,
    height: 24,
    layoutMode: 'VERTICAL',
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'FIXED',
    layoutAlignSelf: 'STRETCH',
    itemSpacing: 0,
    fills: [solid(WHITE)],
    strokes: [borderStroke()],
    pluginData: mdPlugin('table')
  })
  const rows = [table.header, ...table.rows]
  for (const [rowIndex, cells] of rows.entries()) {
    const row = editor.graph.createNode('FRAME', frame.id, {
      name: rowIndex === 0 ? 'Header row' : 'Row',
      width,
      height: 24,
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'HUG',
      layoutAlignSelf: 'STRETCH',
      itemSpacing: 0,
      fills: [solid(rowIndex === 0 ? HEADER_FILL : WHITE)],
      pluginData: mdPlugin('tr')
    })
    for (let column = 0; column < columns; column++) {
      createCell(editor, row.id, cells[column] ?? '', rowIndex === 0, cellWidth)
    }
  }
  return frame
}

function seedTextNode(editor: Editor, hostId: string): SceneNode | null {
  const children = editor.graph.getChildren(hostId)
  return (
    children.find((node) => node.type === 'TEXT' && Boolean(node.componentId)) ??
    children.find((node) => node.type === 'TEXT' && !mdKind(node)) ??
    null
  )
}

function ensureHost(editor: Editor, hostId: string): SceneNode | null {
  const host = editor.graph.getNode(hostId)
  if (!host) return null
  const next: Partial<SceneNode> = {}
  if (host.layoutMode !== 'VERTICAL') next.layoutMode = 'VERTICAL'
  if (host.primaryAxisSizing !== 'HUG') next.primaryAxisSizing = 'HUG'
  if (host.counterAxisSizing !== 'FIXED') next.counterAxisSizing = 'FIXED'
  // Match typical Markdown paragraph gap between block-level TEXT children.
  if (host.itemSpacing < 12) next.itemSpacing = 12
  if (host.clipsContent) next.clipsContent = false
  if (Object.keys(next).length > 0) {
    editor.graph.updateNode(hostId, next)
    recordInstanceOverride(editor.graph, hostId, Object.keys(next))
  }
  return editor.graph.getNode(hostId) ?? host
}

function fitHostToContent(editor: Editor, hostId: string): void {
  const host = editor.graph.getNode(hostId)
  if (!host) return
  const children = editor.graph
    .getChildren(hostId)
    .filter((node) => node.visible && node.layoutPositioning !== 'ABSOLUTE')
  const gap = host.itemSpacing * Math.max(0, children.length - 1)
  const content = children.reduce((sum, node) => sum + Math.max(1, node.height), 0)
  const height = Math.max(1, host.paddingTop + host.paddingBottom + content + gap)
  editor.graph.updateNode(hostId, {
    height,
    primaryAxisSizing: 'HUG',
    clipsContent: false
  })
  recordInstanceOverride(editor.graph, hostId, ['height', 'primaryAxisSizing', 'clipsContent'])
}

function layoutHost(editor: Editor, hostId: string): void {
  const host = editor.graph.getNode(hostId)
  if (host && host.layoutMode !== 'NONE') computeLayout(editor.graph, hostId)
  computeAllLayouts(editor.graph, editor.state.currentPageId)
  fitHostToContent(editor, hostId)
  editor.requestRender()
}

function imageSourceKey(image: RichImage): string {
  return image.ossPath || image.src || image.hash || resolveCanvasImageKey(image)
}

function persistImageHashes(
  editor: Editor,
  hostId: string,
  updates: Array<{ source: string; hash: string; width?: number; height?: number }>,
  resync: boolean
): void {
  if (updates.length === 0) return
  const host = editor.graph.getNode(hostId)
  if (!host) return
  const mapUpdates: RichImageMap = {}
  for (const update of updates) {
    if (update.source && update.hash) mapUpdates[update.source] = update.hash
  }
  const next = mergeRichImageMap(host.pluginData ?? [], mapUpdates)
  editor.graph.updateNode(hostId, { pluginData: next })
  if (resync) syncMarkdownToNodes(editor, hostId, readRichMarkdown(next) || 'Write here')
}

function scheduleImageLoads(
  editor: Editor,
  hostId: string,
  images: Array<Extract<ContentSlot, { kind: 'image' }>['image']>
): void {
  const hashFixes: Array<{ source: string; hash: string; width?: number; height?: number }> = []
  const pending = images.filter((image) => {
    // Already in the document by image.hash (or URL alias) — do not download again.
    const stored = lookupCanvasImageKey(editor.graph, image)
    if (stored) {
      if (image.hash !== stored) {
        const source = imageSourceKey(image)
        if (source) {
          hashFixes.push({
            source,
            hash: stored,
            width: image.width,
            height: image.height
          })
        }
      }
      return false
    }
    const key = resolveCanvasImageKey(image)
    if (!key || remoteLoads.has(key)) return false
    if (!image.ossPath && !image.hash && !image.src) return false
    remoteLoads.add(key)
    return true
  })
  if (hashFixes.length > 0) persistImageHashes(editor, hostId, hashFixes, false)
  if (pending.length === 0) return
  void (async () => {
    const updates: Array<{ source: string; hash: string; width?: number; height?: number }> = []
    let loaded = false
    for (const image of pending) {
      const key = resolveCanvasImageKey(image)
      const sources = [image.src, image.ossPath, image.hash].filter(
        (value, index, all): value is string =>
          Boolean(value) &&
          all.indexOf(value) === index &&
          (value.startsWith('http') ||
            value.startsWith('data:') ||
            value.startsWith('blob:') ||
            !value.includes('://'))
      )
      let bytes: Uint8Array | null = null
      let sourceUsed = ''
      for (const source of sources) {
        bytes = await downloadRemoteImageBytes(source)
        if (bytes && bytes.length > 0) {
          sourceUsed = source
          break
        }
      }
      if (!bytes || bytes.length === 0) {
        remoteLoads.delete(key)
        continue
      }
      const storedHash = rememberGraphImage(editor, bytes, [
        key,
        image.hash,
        image.ossPath,
        image.src
      ])
      remoteLoads.add(storedHash)
      const source = sourceUsed || imageSourceKey(image)
      if (source) {
        updates.push({
          source,
          hash: storedHash,
          width: image.width,
          height: image.height
        })
      }
      loaded = true
    }
    if (!loaded) return
    persistImageHashes(editor, hostId, updates, true)
  })()
}

export function syncMarkdownToNodes(editor: Editor, hostId: string, markdown: string): void {
  const host = ensureHost(editor, hostId)
  if (!host) return
  const imageMap = readRichImageMap(host.pluginData ?? [])
  const slots = slotsFromMarkdown(markdown, imageMap)
  const seed = seedTextNode(editor, hostId)
  const generated = editor.graph.getChildren(hostId).filter((node) => {
    if (seed && node.id === seed.id) return false
    return Boolean(mdKind(node)) || node.type === 'RECTANGLE' || node.type === 'FRAME'
  })
  for (const child of generated) editor.graph.deleteNode(child.id)

  const order: string[] = []
  let seedUsed = false
  const images: Array<Extract<ContentSlot, { kind: 'image' }>['image']> = []

  for (const slot of slots) {
    if (slot.kind === 'text') {
      if (!seedUsed && seed) {
        applyText(editor, host, seed.id, slot.slot, 'text')
        seedUsed = true
        order.push(seed.id)
      } else {
        order.push(createText(editor, host, slot.slot).id)
      }
      continue
    }
    if (slot.kind === 'image') {
      images.push(slot.image)
      order.push(createImage(editor, host, slot).id)
      continue
    }
    if (slot.kind === 'hr') {
      order.push(createHr(editor, host).id)
      continue
    }
    order.push(createTable(editor, host, slot).id)
  }

  if (seed && !seedUsed) {
    hideSeedText(editor, seed.id)
    order.unshift(seed.id)
  }

  for (const [index, id] of order.entries()) editor.graph.reorderChild(id, hostId, index)
  layoutHost(editor, hostId)
  scheduleImageLoads(editor, hostId, images)
}

export function syncBuiltinContent(
  editor: Editor,
  hostId: string,
  blocks: ReturnType<typeof markdownToBlocks>
): void {
  const host = editor.graph.getNode(hostId)
  const markdown = host ? readRichMarkdown(host.pluginData) : ''
  if (markdown.trim()) {
    syncMarkdownToNodes(editor, hostId, markdown)
    return
  }
  syncMarkdownToNodes(editor, hostId, flattenBlocks(blocks).text || 'Write here')
}
