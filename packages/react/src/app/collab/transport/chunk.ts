const CHUNK_MAGIC = [0x43, 0x48, 0x4b, 0x31] as const
const CHUNK_HEADER_BYTES = 4 + 16 + 4 + 4
export const COLLAB_CHUNK_THRESHOLD = 12 * 1024

function uuidToBytes(id: string): Uint8Array {
  const hex = id.replaceAll('-', '')
  const bytes = new Uint8Array(16)
  for (let index = 0; index < 16; index++) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

function uuidFromBytes(bytes: Uint8Array): string {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 24) & 0xff
  target[offset + 1] = (value >>> 16) & 0xff
  target[offset + 2] = (value >>> 8) & 0xff
  target[offset + 3] = value & 0xff
}

function readUint32(source: Uint8Array, offset: number): number {
  return (
    ((source[offset] << 24) | (source[offset + 1] << 16) | (source[offset + 2] << 8) | source[offset + 3]) >>>
    0
  )
}

export function encodeChunkFrame(id: string, index: number, total: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(CHUNK_HEADER_BYTES + payload.byteLength)
  frame.set(CHUNK_MAGIC, 0)
  frame.set(uuidToBytes(id), 4)
  writeUint32(frame, 20, index)
  writeUint32(frame, 24, total)
  frame.set(payload, CHUNK_HEADER_BYTES)
  return frame
}

export type ChunkFrame = {
  id: string
  index: number
  total: number
  payload: Uint8Array
}

export function decodeChunkFrame(data: Uint8Array): ChunkFrame | null {
  if (data.byteLength < CHUNK_HEADER_BYTES) return null
  for (let index = 0; index < CHUNK_MAGIC.length; index++) {
    if (data[index] !== CHUNK_MAGIC[index]) return null
  }
  const total = readUint32(data, 24)
  const frameIndex = readUint32(data, 20)
  if (total < 1 || frameIndex >= total) return null
  return {
    id: uuidFromBytes(data.subarray(4, 20)),
    index: frameIndex,
    total,
    payload: data.subarray(CHUNK_HEADER_BYTES)
  }
}

export function splitBytes(data: Uint8Array, maxBytes = COLLAB_CHUNK_THRESHOLD): Uint8Array[] {
  if (data.byteLength <= maxBytes) return [data]
  const id = crypto.randomUUID()
  const total = Math.ceil(data.byteLength / maxBytes)
  const frames: Uint8Array[] = []
  for (let index = 0; index < total; index++) {
    const payload = data.subarray(index * maxBytes, (index + 1) * maxBytes)
    frames.push(encodeChunkFrame(id, index, total, payload))
  }
  return frames
}

export function createChunkAssembler(
  onComplete: (payload: Uint8Array, peerId: string, namespace: string) => void
) {
  const pending = new Map<
    string,
    { total: number; parts: Array<Uint8Array | undefined>; received: number; namespace: string }
  >()

  return function assemble(data: Uint8Array, peerId: string, namespace: string) {
    const frame = decodeChunkFrame(data)
    if (!frame) {
      onComplete(data, peerId, namespace)
      return
    }
    const key = `${peerId}:${namespace}:${frame.id}`
    let entry = pending.get(key)
    if (!entry || entry.total !== frame.total) {
      entry = {
        total: frame.total,
        parts: Array.from({ length: frame.total }),
        received: 0,
        namespace
      }
      pending.set(key, entry)
    }
    if (entry.parts[frame.index]) return
    entry.parts[frame.index] = frame.payload
    entry.received += 1
    if (entry.received < entry.total) return
    pending.delete(key)
    const size = entry.parts.reduce((sum, part) => sum + (part?.byteLength ?? 0), 0)
    const payload = new Uint8Array(size)
    let offset = 0
    for (const part of entry.parts) {
      if (!part) return
      payload.set(part, offset)
      offset += part.byteLength
    }
    onComplete(payload, peerId, entry.namespace)
  }
}
