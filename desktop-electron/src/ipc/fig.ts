import { compressFigDataSync } from '@open-pencil/fig'

type ImageEntryArg = {
  name: string
  data: number[] | Uint8Array
}

type BuildFigFileArgs = {
  schemaDeflated?: number[] | Uint8Array
  kiwiData?: number[] | Uint8Array
  thumbnailPng?: number[] | Uint8Array
  metaJson?: string
  images?: ImageEntryArg[] | null
  figKiwiVersion?: number | null
}

function toBytes(value: number[] | Uint8Array | undefined, label: string): Uint8Array {
  if (value instanceof Uint8Array) {
    if (value.byteLength === 0) throw new Error(`${label} is empty`)
    return value
  }
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} is empty`)
  return Uint8Array.from(value)
}

/**
 * Same contract as Tauri `build_fig_file` (`desktop-react/src/fig_container.rs`).
 * Assembles the zip on the main process via `@open-pencil/fig`.
 */
export function buildFigFile(args: unknown): ArrayBuffer {
  const payload = (args && typeof args === 'object' ? args : {}) as BuildFigFileArgs
  const schemaDeflated = toBytes(payload.schemaDeflated, 'schemaDeflated')
  const kiwiData = toBytes(payload.kiwiData, 'kiwiData')
  const thumbnailPng = toBytes(payload.thumbnailPng, 'thumbnailPng')
  const metaJson = typeof payload.metaJson === 'string' ? payload.metaJson : ''
  if (!metaJson) throw new Error('metaJson is empty')

  const images = (payload.images ?? []).map((entry) => ({
    name: String(entry.name),
    data: toBytes(entry.data, `images[${entry.name}]`)
  }))

  const version =
    typeof payload.figKiwiVersion === 'number' && Number.isFinite(payload.figKiwiVersion)
      ? payload.figKiwiVersion
      : undefined

  const bytes = compressFigDataSync(
    schemaDeflated,
    kiwiData,
    thumbnailPng,
    metaJson,
    images,
    version
  )
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
