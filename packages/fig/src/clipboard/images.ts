import type { NodeChange, Paint } from '@open-pencil/kiwi/fig/codec'

import { bytesToHex } from '../node-change/bytes'

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
        const hash = typeof image.hash === 'string' ? image.hash : bytesToHex(image.hash)
        const bytes = images.get(hash)
        if (!bytes) continue
        let entry = embedded.get(hash)
        if (!entry) {
          // Figma rejects bytes whose SHA-1 differs from the image reference.
          // Internal SceneGraph image identifiers are not necessarily SHA-1.
          const digest = await crypto.subtle.digest('SHA-1', new Uint8Array(bytes).buffer)
          entry = { index: blobs.length, hash: new Uint8Array(digest) }
          blobs.push(bytes)
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
