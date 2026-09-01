import { uploadOSSImage } from '#react/app/document/oss'
import type { RichBlock, RichImage } from '#react/controls/builtin-text/lists'
import { flattenBlocks } from '#react/controls/builtin-text/lists'
import { BUILTIN_COMPONENT_NAME } from '#react/graph/builtin'

import { TRANSPARENT } from '@open-pencil/core/constants'
import type { Editor } from '@open-pencil/core/editor'
import { computeAllLayouts, computeLayout } from '@open-pencil/core/layout'
import type { Fill, SceneNode } from '@open-pencil/scene-graph'

const RASTER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif'
])

const BLACK = { r: 0.12, g: 0.12, b: 0.12, a: 1 }

export function uniqueClipboardImages(files: File[], items: File[]): File[] {
  const listed = uniqueImageFiles(files)
  if (listed.length > 0) return listed
  return uniqueImageFiles(items)
}

function uniqueImageFiles(files: File[]): File[] {
  const seen = new Set<string>()
  const unique: File[] = []
  for (const file of files) {
    if (!RASTER_IMAGE_TYPES.has(file.type)) continue
    const identity = `${file.size}:${file.lastModified}`
    if (seen.has(identity)) continue
    seen.add(identity)
    unique.push(file)
  }
  return unique
}

export function clipboardImageFiles(event: ClipboardEvent): File[] {
  const files = [...(event.clipboardData?.files ?? [])]
  const items: File[] = []
  for (const item of event.clipboardData?.items ?? []) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) items.push(file)
  }
  return uniqueClipboardImages(files, items)
}

async function imageSize(file: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

export async function prepareRichImage(editor: Editor, file: File): Promise<RichImage> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const hash = editor.storeImage(bytes)
  const { width, height } = await imageSize(file)
  let ossPath = ''
  try {
    ossPath = await uploadOSSImage(file)
  } catch (error) {
    console.error('Failed to upload image to OSS', error)
  }
  return {
    hash,
    ossPath,
    src: URL.createObjectURL(file),
    width,
    height
  }
}

const imageSourceCache = new Map<string, { bytes: Uint8Array; src: string }>()

export function hydrateImageSources(
  html: string,
  graph: { images: Map<string, Uint8Array> }
): string {
  return html.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
    const hash = /data-image-hash="([^"]+)"/i.exec(attrs)?.[1]
    if (!hash) return full
    const bytes = graph.images.get(hash)
    if (!bytes) return full
    const cached = imageSourceCache.get(hash)
    let src = cached?.src
    if (!cached || cached.bytes !== bytes) {
      if (cached) URL.revokeObjectURL(cached.src)
      src = URL.createObjectURL(new Blob([bytes]))
      imageSourceCache.set(hash, { bytes, src })
    }
    if (!src) return full
    if (/\ssrc="/i.test(attrs)) {
      return `<img${attrs.replace(/\ssrc="[^"]*"/i, ` src="${src}"`)}>`
    }
    return `<img src="${src}"${attrs}>`
  })
}

function imageHash(node: SceneNode): string | undefined {
  return node.fills.find((fill) => fill.type === 'IMAGE')?.imageHash
}

function isImageRect(node: SceneNode): boolean {
  return node.type === 'RECTANGLE' && Boolean(imageHash(node))
}

function imageFill(hash: string): Fill {
  return {
    type: 'IMAGE',
    imageHash: hash,
    imageScaleMode: 'FILL',
    color: TRANSPARENT,
    opacity: 1,
    visible: true
  }
}

type ContentSlot =
  | { kind: 'text'; text: string; styleRuns: ReturnType<typeof flattenBlocks>['runs'] }
  | { kind: 'image'; image: RichImage }

function contentSlots(blocks: RichBlock[]): ContentSlot[] {
  const slots: ContentSlot[] = []
  let textBlocks: RichBlock[] = []
  function flush() {
    if (textBlocks.length === 0) return
    const flattened = flattenBlocks(textBlocks)
    slots.push({ kind: 'text', text: flattened.text, styleRuns: flattened.runs })
    textBlocks = []
  }
  for (const block of blocks) {
    if (block.image) {
      flush()
      slots.push({ kind: 'image', image: block.image })
      continue
    }
    textBlocks.push(block)
  }
  flush()
  return slots
}

function contentWidth(host: SceneNode): number {
  return Math.max(1, host.width - host.paddingLeft - host.paddingRight)
}

function textLeafLayout(host: SceneNode): Partial<SceneNode> {
  return {
    x: host.paddingLeft,
    width: contentWidth(host),
    fontSize: 14,
    textAutoResize: 'HEIGHT',
    layoutAlignSelf: 'STRETCH',
    layoutGrow: 0
  }
}

function createTextNode(
  editor: Editor,
  host: SceneNode,
  slot: Extract<ContentSlot, { kind: 'text' }>
) {
  return editor.graph.createNode('TEXT', host.id, {
    name: BUILTIN_COMPONENT_NAME,
    text: slot.text,
    styleRuns: slot.styleRuns,
    y: host.paddingTop,
    height: Math.max(16, slot.text ? 20 : 16),
    fills: [{ type: 'SOLID', color: BLACK, opacity: 1, visible: true }],
    ...textLeafLayout(host)
  })
}

function createImageNode(editor: Editor, host: SceneNode, image: RichImage) {
  const width = Math.max(1, image.width || 1)
  const height = Math.max(1, image.height || 1)
  return editor.graph.createNode('RECTANGLE', host.id, {
    name: 'Image',
    x: host.paddingLeft,
    y: host.paddingTop,
    width,
    height,
    layoutAlignSelf: 'AUTO',
    layoutGrow: 0,
    fills: [imageFill(image.hash)]
  })
}

function snapBuiltinPadding(editor: Editor, hostId: string): void {
  const host = editor.graph.getNode(hostId)
  if (!host) return
  const children = editor.graph
    .getChildren(hostId)
    .filter((node) => node.visible && node.layoutPositioning !== 'ABSOLUTE')
  for (const [index, child] of children.entries()) {
    const next: Partial<SceneNode> = {}
    if (host.paddingLeft > 0 && Math.abs(child.x) < 0.51) next.x = host.paddingLeft
    if (index === 0 && host.paddingTop > 0 && Math.abs(child.y) < 0.51) next.y = host.paddingTop
    if (child.type === 'TEXT' && child.layoutAlignSelf === 'STRETCH') {
      const width = contentWidth(host)
      if (Math.abs(child.width - width) > 0.51) next.width = width
    }
    if (Object.keys(next).length > 0) editor.graph.updateNode(child.id, next)
  }
}

function layoutBuiltinHost(editor: Editor, hostId: string): void {
  const host = editor.graph.getNode(hostId)
  if (host && host.layoutMode !== 'NONE') computeLayout(editor.graph, hostId)
  snapBuiltinPadding(editor, hostId)
  computeAllLayouts(editor.graph, editor.state.currentPageId)
  editor.requestRender()
}

export function syncBuiltinContent(editor: Editor, hostId: string, blocks: RichBlock[]): void {
  const host = editor.graph.getNode(hostId)
  if (!host) return
  const slots = contentSlots(blocks)
  const children = editor.graph
    .getChildren(hostId)
    .filter((node) => node.type === 'TEXT' || isImageRect(node))
  const used = new Set<string>()
  const order: string[] = []
  for (const slot of slots) {
    if (slot.kind === 'text') {
      const existing = children.find((node) => node.type === 'TEXT' && !used.has(node.id))
      if (existing) {
        editor.graph.updateNode(existing.id, {
          text: slot.text,
          styleRuns: slot.styleRuns,
          ...textLeafLayout(host)
        })
        used.add(existing.id)
        order.push(existing.id)
      } else {
        order.push(createTextNode(editor, host, slot).id)
      }
      continue
    }
    const existing =
      children.find((node) => imageHash(node) === slot.image.hash && !used.has(node.id)) ??
      children.find((node) => isImageRect(node) && !used.has(node.id))
    if (existing) {
      editor.graph.updateNode(existing.id, {
        x: host.paddingLeft,
        width: Math.max(1, slot.image.width),
        height: Math.max(1, slot.image.height),
        layoutAlignSelf: 'AUTO',
        layoutGrow: 0,
        fills: [imageFill(slot.image.hash)]
      })
      used.add(existing.id)
      order.push(existing.id)
    } else {
      order.push(createImageNode(editor, host, slot.image).id)
    }
  }
  for (const child of children) {
    if (!used.has(child.id)) editor.graph.deleteNode(child.id)
  }
  for (const [index, id] of order.entries()) editor.graph.reorderChild(id, hostId, index)
  layoutBuiltinHost(editor, hostId)
}
