import type { NodeChange, Paint } from '@open-pencil/kiwi/fig/codec'

import { bytesToHex } from '../node-change/bytes'

/** Hex key for an image reference, matching SceneGraph `imageHash` after paste. */
function imageHashKey(
  hash: string | Uint8Array | Record<string, number> | undefined
): string | undefined {
  if (hash == null) return undefined
  if (typeof hash === 'string') {
    const trimmed = hash.trim()
    return trimmed || undefined
  }
  if (hash instanceof Uint8Array) return hash.byteLength > 0 ? bytesToHex(hash) : undefined
  if (typeof hash === 'object') {
    const bytes = Object.keys(hash)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => hash[Number(key)])
    return bytes.length > 0 ? bytesToHex(new Uint8Array(bytes)) : undefined
  }
  return undefined
}

/** Clipboard recipients cannot fetch image hashes from an OpenPencil source file. */
export async function embedClipboardImages(
  changes: NodeChange[],
  blobs: Uint8Array[],
  images: ReadonlyMap<string, Uint8Array>
): Promise<void> {
  const embedded = new Map<string, { index: number; hash: Uint8Array }>()
  async function embed(paints: Paint[] = []) {
    for (const paint of paints) {
      for (const image of [paint.image, paint.imageThumbnail, paint.animatedImage]) {
        if (!image?.hash) continue
        const hash = imageHashKey(image.hash)
        if (!hash) continue
        const bytes = images.get(hash)
        if (!bytes) continue
        let entry = embedded.get(hash)
        if (!entry) {
          // Figma rejects bytes whose SHA-1 differs from the image reference.
          // Internal SceneGraph image identifiers are not necessarily SHA-1.
          // Pass a Uint8Array (BufferSource), not `.buffer`, so byteOffset/length stay exact.
          const copy = bytes.slice()
          const digest = await crypto.subtle.digest('SHA-1', copy)
          entry = { index: blobs.length, hash: new Uint8Array(digest) }
          blobs.push(copy)
          embedded.set(hash, entry)
        }
        image.hash = entry.hash
        image.dataBlob = entry.index
      }
    }
  }
  async function visit(change: NodeChange): Promise<void> {
    await embed(change.fillPaints)
    await embed(change.strokePaints)
    await embed(change.backgroundPaints)
    await embed(change.textDecorationFillPaints)
    for (const override of change.textData?.styleOverrideTable ?? []) await visit(override)
  }
  for (const change of changes) await visit(change)
}

/**
 * Rebuild the image map OpenPencil embeds on copy (`dataBlob` + SHA-1 hash).
 * Paste must install these bytes; recipients cannot fetch OpenPencil file hashes.
 */
export function extractClipboardImages(
  changes: readonly NodeChange[],
  blobs: readonly Uint8Array[]
): Map<string, Uint8Array> {
  const images = new Map<string, Uint8Array>()
  function collect(paints: Paint[] | undefined): void {
    if (!paints) return
    for (const paint of paints) {
      for (const image of [paint.image, paint.imageThumbnail, paint.animatedImage]) {
        if (!image || image.dataBlob === undefined) continue
        const bytes = blobs[image.dataBlob]
        if (!bytes) continue
        const hash = imageHashKey(image.hash)
        if (!hash || images.has(hash)) continue
        images.set(hash, bytes.slice())
      }
    }
  }
  function visit(change: NodeChange): void {
    collect(change.fillPaints)
    collect(change.strokePaints)
    collect(change.backgroundPaints)
    collect(change.textDecorationFillPaints)
    for (const override of change.textData?.styleOverrideTable ?? []) visit(override)
  }
  for (const change of changes) visit(change)
  return images
}
