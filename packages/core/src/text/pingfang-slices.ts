export const PINGFANG_SC_FAMILY = 'PingFang SC'

/**
 * PingFang SC loading strategy (override FontManager only).
 * - `slices`: pre-cut unicode-range TTF shards under `/pingfang-sc` (lower memory).
 * - `full`: whole packaged faces (`/PingFangSC-*.ttf`).
 */
export type PingFangLoadMode = 'slices' | 'full'

/** Flip to `'full'` to load complete PingFang faces instead of shards. */
export const PINGFANG_LOAD_MODE: PingFangLoadMode = 'slices'

export function usesPingFangSlices(): boolean {
  return PINGFANG_LOAD_MODE === 'slices'
}

export interface PingFangSliceMeta {
  id: string
  file: string
  unicodes: string
  byteLength: number
  ranges: Array<[number, number]>
}

export interface PingFangStyleManifest {
  version: number
  family: string
  style: string
  sliceCount: number
  totalBytes: number
  slices: PingFangSliceMeta[]
}

/** Map UI style names onto pre-cut slice directories (missing styles fall back at load). */
const STYLE_ALIASES: Record<string, string> = {
  Thin: 'Thin',
  ExtraLight: 'UltraLight',
  UltraLight: 'UltraLight',
  Light: 'Light',
  Regular: 'Regular',
  Medium: 'Medium',
  SemiBold: 'SemiBold',
  'Semi Bold': 'SemiBold',
  Bold: 'SemiBold',
  ExtraBold: 'SemiBold',
  Black: 'SemiBold'
}

export function isPingFangScFamily(family: string): boolean {
  return family === PINGFANG_SC_FAMILY
}

export function resolvePingFangSliceStyle(style: string): string {
  return STYLE_ALIASES[style] ?? 'Regular'
}

export function pingFangSliceUrl(style: string, file: string): string {
  return `/pingfang-sc/${style}/${file}`
}

export function pingFangManifestUrl(style: string): string {
  return `/pingfang-sc/${style}/manifest.json`
}

/**
 * CanvasKit picks one typeface per family name and does not honor CSS unicode-range.
 * Each slice therefore registers under a distinct render family listed in `fontFamilies`.
 */
export function pingFangSliceRenderFamily(style: string, sliceId: string): string {
  return `${PINGFANG_SC_FAMILY} ${resolvePingFangSliceStyle(style)} ${sliceId}`
}

export function codePointInRanges(
  codePoint: number,
  ranges: ReadonlyArray<[number, number]>
): boolean {
  for (const [start, end] of ranges) {
    if (codePoint >= start && codePoint <= end) return true
  }
  return false
}

/** Slice ids needed for `characters`, always including `base` when present. */
export function selectPingFangSliceIds(
  manifest: PingFangStyleManifest,
  characters: string
): string[] {
  const selected = new Set<string>()
  const base = manifest.slices.find((slice) => slice.id === 'base')
  if (base) selected.add(base.id)

  if (!characters) return [...selected]

  for (const character of characters) {
    const codePoint = character.codePointAt(0)
    if (codePoint === undefined) continue
    for (const slice of manifest.slices) {
      if (slice.id === 'base') continue
      if (codePointInRanges(codePoint, slice.ranges)) {
        selected.add(slice.id)
        break
      }
    }
  }
  return [...selected]
}

/** Expand compact ranges into a character coverage set for DOM `unicode-range`. */
export function coverageFromPingFangRanges(ranges: ReadonlyArray<[number, number]>): Set<string> {
  const coverage = new Set<string>()
  for (const [start, end] of ranges) {
    for (let codePoint = start; codePoint <= end; codePoint++) {
      coverage.add(String.fromCodePoint(codePoint))
    }
  }
  return coverage
}

function isRangePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  )
}

export function parsePingFangStyleManifest(data: unknown): PingFangStyleManifest | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  if (typeof record.version !== 'number' || typeof record.style !== 'string') return null
  if (!Array.isArray(record.slices)) return null
  const slices: PingFangSliceMeta[] = []
  for (const entry of record.slices) {
    if (!entry || typeof entry !== 'object') return null
    const slice = entry as Record<string, unknown>
    if (
      typeof slice.id !== 'string' ||
      typeof slice.file !== 'string' ||
      typeof slice.unicodes !== 'string' ||
      typeof slice.byteLength !== 'number' ||
      !Array.isArray(slice.ranges)
    ) {
      return null
    }
    const ranges: Array<[number, number]> = []
    for (const range of slice.ranges) {
      if (!isRangePair(range)) return null
      ranges.push([range[0], range[1]])
    }
    slices.push({
      id: slice.id,
      file: slice.file,
      unicodes: slice.unicodes,
      byteLength: slice.byteLength,
      ranges
    })
  }
  return {
    version: record.version,
    family: typeof record.family === 'string' ? record.family : PINGFANG_SC_FAMILY,
    style: record.style,
    sliceCount: typeof record.sliceCount === 'number' ? record.sliceCount : slices.length,
    totalBytes: typeof record.totalBytes === 'number' ? record.totalBytes : 0,
    slices
  }
}
