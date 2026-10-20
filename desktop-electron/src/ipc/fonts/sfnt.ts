/** Minimal SFNT / TTC helpers for system font indexing (mirrors desktop-react `fonts/sfnt.rs`). */

const TTC_TAG = 'ttcf'
const OFFSET_TABLE_SIZE = 12
const TABLE_RECORD_SIZE = 16
const OUTLINE_TABLES = new Set(['glyf', 'CFF ', 'CFF2'])

export type SfntFaceNames = {
  family: string
  style: string
  fullName: string | null
  postScript: string | null
  drawable: boolean
}

function readU16(data: Uint8Array, offset: number): number | null {
  if (offset + 2 > data.byteLength) return null
  return (data[offset]! << 8) | data[offset + 1]!
}

function readU32(data: Uint8Array, offset: number): number | null {
  if (offset + 4 > data.byteLength) return null
  return (
    ((data[offset]! << 24) | (data[offset + 1]! << 16) | (data[offset + 2]! << 8) | data[offset + 3]!) >>>
    0
  )
}

function readTag(data: Uint8Array, offset: number): string | null {
  if (offset + 4 > data.byteLength) return null
  return String.fromCharCode(data[offset]!, data[offset + 1]!, data[offset + 2]!, data[offset + 3]!)
}

function faceOffsets(data: Uint8Array): number[] | null {
  const tag = readTag(data, 0)
  if (tag === TTC_TAG) {
    const count = readU32(data, 8)
    if (count === null) return null
    const offsets: number[] = []
    for (let i = 0; i < count; i++) {
      const offset = readU32(data, OFFSET_TABLE_SIZE + 4 * i)
      if (offset === null) return null
      offsets.push(offset)
    }
    return offsets
  }
  // Single sfnt (TrueType / CFF OpenType).
  if (tag === '\x00\x01\x00\x00' || tag === 'OTTO' || tag === 'true') return [0]
  return null
}

function decodeNameString(raw: Uint8Array, platform: number): string | null {
  try {
    if (platform === 0 || platform === 3) {
      return new TextDecoder('utf-16be').decode(raw)
    }
    if (platform === 1) {
      // MacRoman is enough for English style/family strings we care about.
      return new TextDecoder('latin1').decode(raw)
    }
  } catch {
    return null
  }
  return null
}

function pickName(
  records: Array<{ platform: number; language: number; nameId: number; text: string }>,
  nameId: number
): string | null {
  const matches = records.filter((record) => record.nameId === nameId)
  if (matches.length === 0) return null
  const preferred = [
    (r: (typeof matches)[number]) => r.platform === 3 && r.language === 0x0409,
    (r: (typeof matches)[number]) => r.platform === 0 && r.language === 0,
    (r: (typeof matches)[number]) => r.platform === 3,
    (r: (typeof matches)[number]) => r.platform === 1 && r.language === 0,
    () => true
  ]
  for (const test of preferred) {
    const hit = matches.find(test)
    if (hit?.text.trim()) return hit.text.trim()
  }
  return null
}

function readFaceNames(data: Uint8Array, faceOffset: number): SfntFaceNames | null {
  const numTables = readU16(data, faceOffset + 4)
  if (numTables === null) return null
  let nameOffset: number | null = null
  let nameLength = 0
  const tags: string[] = []
  for (let i = 0; i < numTables; i++) {
    const record = faceOffset + OFFSET_TABLE_SIZE + i * TABLE_RECORD_SIZE
    const tag = readTag(data, record)
    if (!tag) return null
    tags.push(tag)
    if (tag === 'name') {
      nameOffset = readU32(data, record + 8)
      nameLength = readU32(data, record + 12) ?? 0
    }
  }
  if (nameOffset === null || nameLength <= 0) return null
  if (nameOffset + nameLength > data.byteLength) return null
  const blob = data.subarray(nameOffset, nameOffset + nameLength)
  const count = readU16(blob, 2)
  const stringOffset = readU16(blob, 4)
  if (count === null || stringOffset === null) return null
  const records: Array<{ platform: number; language: number; nameId: number; text: string }> = []
  for (let i = 0; i < count; i++) {
    const base = 6 + i * 12
    const platform = readU16(blob, base)
    const language = readU16(blob, base + 4)
    const nameId = readU16(blob, base + 6)
    const length = readU16(blob, base + 8)
    const offset = readU16(blob, base + 10)
    if (
      platform === null ||
      language === null ||
      nameId === null ||
      length === null ||
      offset === null
    ) {
      continue
    }
    const start = stringOffset + offset
    const end = start + length
    if (end > blob.byteLength) continue
    const text = decodeNameString(blob.subarray(start, end), platform)
    if (!text) continue
    records.push({ platform, language, nameId, text })
  }
  const family = pickName(records, 16) ?? pickName(records, 1)
  if (!family) return null
  const style = pickName(records, 17) ?? pickName(records, 2) ?? 'Regular'
  return {
    family,
    style,
    fullName: pickName(records, 4),
    postScript: pickName(records, 6),
    drawable: tags.some((tag) => OUTLINE_TABLES.has(tag))
  }
}

/** Enumerate named faces in a font file (TTC or single sfnt). */
export function listSfntFaces(data: Uint8Array): Array<SfntFaceNames & { index: number }> {
  const offsets = faceOffsets(data)
  if (!offsets) return []
  const faces: Array<SfntFaceNames & { index: number }> = []
  for (let index = 0; index < offsets.length; index++) {
    const names = readFaceNames(data, offsets[index]!)
    if (!names) continue
    // Hidden / UI-only families (Apple prefixes with `.`).
    if (names.family.startsWith('.')) continue
    faces.push({ ...names, index })
  }
  return faces
}

/**
 * Rewrite a TTC so face `index`'s table directory is first — CanvasKit only reads face 0.
 */
export function standaloneFace(data: Uint8Array, index: number): Uint8Array | null {
  const tag = readTag(data, 0)
  if (tag !== TTC_TAG) {
    return index === 0 ? data : null
  }
  const count = readU32(data, 8)
  if (count === null || index < 0 || index >= count) return null
  const face = readU32(data, OFFSET_TABLE_SIZE + 4 * index)
  if (face === null) return null
  const numTables = readU16(data, face + 4)
  if (numTables === null) return null
  const directory = OFFSET_TABLE_SIZE + numTables * TABLE_RECORD_SIZE
  if (face + directory > data.byteLength) return null
  const standalone = new Uint8Array(data)
  standalone.set(data.subarray(face, face + directory), 0)
  return standalone
}
