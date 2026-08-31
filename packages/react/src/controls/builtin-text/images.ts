import { uploadOSSImage } from '#react/app/document/oss'
import type { RichBlock, RichImage } from '#react/controls/builtin-text/lists'
import { flattenBlocks } from '#react/controls/builtin-text/lists'

import { TRANSPARENT } from '@open-pencil/core/constants'
import type { Editor } from '@open-pencil/core/editor'
import { computeAllLayouts } from '@open-pencil/core/layout'
import type { Fill, SceneNode } from '@open-pencil/scene-graph'

const RASTER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif'
])

const BLACK = { r: 0.12, g: 0.12, b: 0.12, a: 1 }

export function clipboardImageFiles(event: ClipboardEvent): File[] {
  const files: File[] = []
  const seen = new Set<string>()
  function push(file: File | null) {
    if (!file || !RASTER_IMAGE_TYPES.has(file.type)) return
    const key = `${file.name}:${file.size}:${file.lastModified}`
    if (seen.has(key)) return
    seen.add(key)
    files.push(file)
  }
  for (const file of event.clipboardData?.files ?? []) push(file)
  for (const item of event.clipboardData?.items ?? []) {
    if (item.kind === 'file' && item.type.startsWith('image/')) push(item.getAsFile())
  }
  return files
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

export function hydrateImageSources(
  html: string,
  graph: { images: Map<string, Uint8Array> }
): string {
  return html.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
    const hash = /data-image-hash="([^"]+)"/i.exec(attrs)?.[1]
    if (!hash) return full
    const bytes = graph.images.get(hash)
    if (!bytes) return full
    const src = URL.createObjectURL(new Blob([bytes]))
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

function createTextNode(
  editor: Editor,
  host: SceneNode,
  slot: Extract<ContentSlot, { kind: 'text' }>
) {
  return editor.graph.createNode('TEXT', host.id, {
    name: 'RichText',
    text: slot.text,
    styleRuns: slot.styleRuns,
    width: Math.max(1, host.width - host.paddingLeft - host.paddingRight),
    fontSize: 14,
    textAutoResize: 'HEIGHT',
    layoutSizingHorizontal: 'FILL',
    fills: [{ type: 'SOLID', color: BLACK, opacity: 1, visible: true }]
  })
}

function createImageNode(editor: Editor, host: SceneNode, image: RichImage) {
  const width = Math.max(1, image.width || 1)
  const height = Math.max(1, image.height || 1)
  return editor.graph.createNode('RECTANGLE', host.id, {
    name: 'Image',
    width,
    height,
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    fills: [imageFill(image.hash)]
  })
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
        editor.updateNode(existing.id, { text: slot.text, styleRuns: slot.styleRuns })
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
      editor.updateNode(existing.id, {
        width: Math.max(1, slot.image.width),
        height: Math.max(1, slot.image.height),
        layoutSizingHorizontal: 'FIXED',
        layoutSizingVertical: 'FIXED',
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
  computeAllLayouts(editor.graph, editor.state.currentPageId)
  editor.requestRender()
}
