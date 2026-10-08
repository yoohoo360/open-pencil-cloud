import {
  downloadOSSObject,
  fetchRemoteImageViaApi,
  ossPublicUrl,
  uploadOSSImage
} from '#react/app/document/oss'
import type { RichImage } from '#react/controls/builtin-text/lists'

import { TRANSPARENT } from '@open-pencil/core/constants'
import type { Editor } from '@open-pencil/core/editor'
import type { Fill } from '@open-pencil/scene-graph'

const RASTER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif'
])

const PLACEHOLDER_GRAY = { r: 0.93, g: 0.93, b: 0.93, a: 1 }
const DEFAULT_IMAGE_WIDTH = 160
const DEFAULT_IMAGE_HEIGHT = 100

export const IMAGE_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect fill="#ececec" width="160" height="100"/><text x="80" y="54" text-anchor="middle" fill="#8a8a8a" font-size="12" font-family="sans-serif">image</text></svg>'
  )

const imageSourceCache = new Map<string, { bytes: Uint8Array; src: string }>()

function decodeAttr(value: string): string {
  const next = value.replaceAll('&amp;', '&')
  try {
    return decodeURIComponent(next)
  } catch {
    return next
  }
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')
}

function bytesToSrc(key: string, bytes: Uint8Array): string {
  const cached = imageSourceCache.get(key)
  if (cached && cached.bytes === bytes) return cached.src
  if (cached) URL.revokeObjectURL(cached.src)
  const src = URL.createObjectURL(new Blob([bytes]))
  imageSourceCache.set(key, { bytes, src })
  return src
}

function resolveImageSrc(
  graph: { images?: Map<string, Uint8Array> } | null | undefined,
  hash: string,
  ossPath: string,
  existingSrc = ''
): string {
  const images = graph?.images
  if (images) {
    for (const key of [hash, ossPath]) {
      if (!key) continue
      const bytes = images.get(key)
      if (!bytes || bytes.length === 0) continue
      return bytesToSrc(key, bytes)
    }
  }
  if (ossPath && isHttpUrl(ossPath)) return ossPath
  if (hash && isHttpUrl(hash)) return hash
  const publicUrl = ossPath ? ossPublicUrl(ossPath) : undefined
  if (publicUrl) return publicUrl
  if (existingSrc && !existingSrc.startsWith('data:')) return existingSrc
  return IMAGE_PLACEHOLDER
}

export function rememberGraphImage(
  editor: Editor,
  bytes: Uint8Array,
  aliases: readonly string[] = []
): string {
  const hash = editor.storeImage(bytes)
  for (const alias of aliases) {
    if (alias && alias !== hash) editor.graph.images.set(alias, bytes)
  }
  return hash
}

/** Match an already-downloaded image by its document `hash` (preferred) or URL aliases. */
export function lookupCanvasImageKey(
  graph: { images: Map<string, Uint8Array> },
  image: RichImage
): string | null {
  if (image.hash && graph.images.has(image.hash)) return image.hash
  for (const key of [image.ossPath, image.src, resolveCanvasImageKey(image)]) {
    if (key && key !== image.hash && graph.images.has(key)) return key
  }
  return null
}

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

export function clipboardImageFiles(event: {
  clipboardData: DataTransfer | null
}): File[] {
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
  const { width, height } = await imageSize(file)
  let ossPath = ''
  try {
    ossPath = await uploadOSSImage(file)
  } catch (error) {
    console.error('Failed to upload image to OSS', error)
  }
  const hash = rememberGraphImage(editor, bytes, [ossPath])
  return {
    hash,
    ossPath,
    src: bytesToSrc(hash, bytes),
    width,
    height
  }
}

export function hydrateImageSources(
  html: string,
  graph: { images: Map<string, Uint8Array> }
): string {
  return html.replace(/<img\b([^>]*)>/gi, (_full, attrs: string) => {
    const hash = decodeAttr(/data-image-hash="([^"]*)"/i.exec(attrs)?.[1] ?? '')
    const ossPath = decodeAttr(/data-oss-path="([^"]*)"/i.exec(attrs)?.[1] ?? '')
    const existingSrc = /src="([^"]*)"/i.exec(attrs)?.[1] ?? ''
    const src = resolveImageSrc(graph, hash, ossPath, existingSrc)
    let next = attrs.replace(/\ssrc="[^"]*"/i, '').replace(/\salt="[^"]*"/i, '')
    if (hash && !/data-image-hash=/i.test(next)) next += ` data-image-hash="${hash}"`
    if (ossPath && !/data-oss-path=/i.test(next)) next += ` data-oss-path="${ossPath}"`
    if (!/\swidth=/i.test(next)) next += ` width="${DEFAULT_IMAGE_WIDTH}"`
    if (!/\sheight=/i.test(next)) next += ` height="${DEFAULT_IMAGE_HEIGHT}"`
    return `<img src="${src}" alt="image"${next}>`
  })
}

export function imageFill(hash: string): Fill {
  return {
    type: 'IMAGE',
    imageHash: hash,
    imageScaleMode: 'FILL',
    color: TRANSPARENT,
    opacity: 1,
    visible: true,
    blendMode: 'NORMAL'
  }
}

export function placeholderImageFill(): Fill {
  return {
    type: 'SOLID',
    color: PLACEHOLDER_GRAY,
    opacity: 1,
    visible: true,
    blendMode: 'NORMAL'
  }
}

export function resolveCanvasImageKey(image: RichImage): string {
  if (image.hash) return image.hash
  if (image.ossPath) return image.ossPath
  return `placeholder:${image.width}x${image.height}`
}

export async function downloadRemoteImageBytes(path: string): Promise<Uint8Array | null> {
  try {
    if (/^https?:\/\//i.test(path)) {
      try {
        const proxied = await fetchRemoteImageViaApi(path)
        if (proxied.length > 0) return proxied
      } catch (error) {
        console.warn('API image proxy failed, falling back', path, error)
      }
      try {
        const response = await fetch(path)
        if (response.ok) {
          const bytes = new Uint8Array(await response.arrayBuffer())
          if (bytes.length > 0) return bytes
        }
      } catch {
        // Browser canvas can still rasterize some URLs that fetch cannot read.
      }
      return await rasterizeUrl(path)
    }
    if (path.startsWith('data:') || path.startsWith('blob:')) {
      try {
        const response = await fetch(path)
        if (response.ok) {
          const bytes = new Uint8Array(await response.arrayBuffer())
          if (bytes.length > 0) return bytes
        }
      } catch {
        return await rasterizeUrl(path)
      }
      return await rasterizeUrl(path)
    }
    try {
      return await downloadOSSObject(path)
    } catch {
      const publicUrl = ossPublicUrl(path)
      if (!publicUrl) return null
      try {
        return await fetchRemoteImageViaApi(publicUrl)
      } catch {
        return await rasterizeUrl(publicUrl)
      }
    }
  } catch (error) {
    console.error('Failed to load builtin markdown image', path, error)
    return null
  }
}

async function rasterizeUrl(url: string): Promise<Uint8Array | null> {
  if (typeof Image === 'undefined' || typeof document === 'undefined') return null
  const image = new Image()
  image.referrerPolicy = 'no-referrer'
  if (!url.startsWith('blob:') && !url.startsWith('data:')) image.crossOrigin = 'anonymous'
  const loaded = new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
  })
  image.src = url
  if (!(await loaded) || image.naturalWidth < 1 || image.naturalHeight < 1) return null
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) return null
  try {
    context.drawImage(image, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return null
    return new Uint8Array(await blob.arrayBuffer())
  } catch {
    return null
  }
}
