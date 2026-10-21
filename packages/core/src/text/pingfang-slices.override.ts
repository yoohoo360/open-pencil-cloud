export const PINGFANG_SC_FAMILY = 'PingFang SC'

/**
 * PingFang SC loading strategy (override FontManager only).
 * - `slices`: packaged `common.ttf` under `/pingfang-sc` (no whole-face `/PingFangSC-*.ttf` in public).
 * - `full`: reserved; complete faces stay under `tools/generate/pingfang-subsets/sources` for subsetting only.
 */
export type PingFangLoadMode = 'slices' | 'full'

/**
 * Always `'slices'`. Public coverage is the hot `common` shard only;
 * characters outside it use network CJK `text=` fallbacks (Noto), not a second full TTF.
 */
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

/** Shared coverage map for all weights — look up which shard owns a code point. */
export interface PingFangCoverageSlice {
  id: string
  file: string
  ranges: Array<[number, number]>
}

export interface PingFangCoverageConfig {
  version: number
  family: string
  defaultSlice: string
  basePath: string
  styles: string[]
  slices: PingFangCoverageSlice[]
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

/** Shared config: which shard covers which code points (all weights). */
export function pingFangConfigUrl(): string {
  return '/pingfang-sc/config.json'
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

/** Which shard owns `codePoint` (`common` / `rare` / …), or `null` if none. */
export function pingFangSliceIdForCodePoint(
  config: PingFangCoverageConfig,
  codePoint: number
): string | null {
  for (const slice of config.slices) {
    if (codePointInRanges(codePoint, slice.ranges)) return slice.id
  }
  return null
}

/** Which shard owns the first code point of `character`. */
export function pingFangSliceIdForCharacter(
  config: PingFangCoverageConfig,
  character: string
): string | null {
  const codePoint = character.codePointAt(0)
  if (codePoint === undefined) return null
  return pingFangSliceIdForCodePoint(config, codePoint)
}

/**
 * Default hot shard: `common` (latin + 一级) or legacy `base`.
 * Always loaded for UI chrome / typical CJK; unpackaged glyphs use network fallback.
 */
export function pingFangDefaultSliceId(
  source: PingFangCoverageConfig | PingFangStyleManifest
): string | null {
  if ('defaultSlice' in source && typeof source.defaultSlice === 'string') {
    if (source.slices.some((slice) => slice.id === source.defaultSlice)) return source.defaultSlice
  }
  return (
    source.slices.find((slice) => slice.id === 'common')?.id ??
    source.slices.find((slice) => slice.id === 'base')?.id ??
    null
  )
}

/** Slice ids needed for `characters`, always including the default hot shard. */
export function selectPingFangSliceIds(
  source: PingFangCoverageConfig | PingFangStyleManifest,
  characters: string
): string[] {
  const selected = new Set<string>()
  const hot = pingFangDefaultSliceId(source)
  if (hot) selected.add(hot)

  if (!characters) return [...selected]

  for (const character of characters) {
    const codePoint = character.codePointAt(0)
    if (codePoint === undefined) continue
    for (const slice of source.slices) {
      if (codePointInRanges(codePoint, slice.ranges)) {
        selected.add(slice.id)
        break
      }
    }
  }
  return [...selected]
}

/**
 * Attach shared coverage ranges onto a slim per-style manifest (byte lengths only).
 * Prefers style `file` / `byteLength`; ranges always come from `config`.
 */
export function hydratePingFangStyleManifest(
  styleManifest: PingFangStyleManifest,
  config: PingFangCoverageConfig
): PingFangStyleManifest {
  const byId = new Map(styleManifest.slices.map((slice) => [slice.id, slice]))
  const slices: PingFangSliceMeta[] = config.slices.map((coverage) => {
    const local = byId.get(coverage.id)
    return {
      id: coverage.id,
      file: local?.file ?? coverage.file,
      unicodes: local?.unicodes ?? '',
      byteLength: local?.byteLength ?? 0,
      ranges: coverage.ranges.map(([start, end]) => [start, end] as [number, number])
    }
  })
  return {
    ...styleManifest,
    sliceCount: slices.length,
    slices
  }
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

function parseCoverageSlices(data: unknown): PingFangCoverageSlice[] | null {
  if (!Array.isArray(data)) return null
  const slices: PingFangCoverageSlice[] = []
  for (const entry of data) {
    if (!entry || typeof entry !== 'object') return null
    const slice = entry as Record<string, unknown>
    if (typeof slice.id !== 'string' || typeof slice.file !== 'string' || !Array.isArray(slice.ranges)) {
      return null
    }
    const ranges: Array<[number, number]> = []
    for (const range of slice.ranges) {
      if (!isRangePair(range)) return null
      ranges.push([range[0], range[1]])
    }
    slices.push({ id: slice.id, file: slice.file, ranges })
  }
  return slices
}

export function parsePingFangCoverageConfig(data: unknown): PingFangCoverageConfig | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  if (typeof record.version !== 'number') return null
  const slices = parseCoverageSlices(record.slices)
  if (!slices || slices.length === 0) return null
  const styles = Array.isArray(record.styles)
    ? record.styles.filter((entry): entry is string => typeof entry === 'string')
    : []
  const defaultSlice =
    typeof record.defaultSlice === 'string'
      ? record.defaultSlice
      : (slices.find((slice) => slice.id === 'common')?.id ?? slices[0]?.id ?? 'common')
  return {
    version: record.version,
    family: typeof record.family === 'string' ? record.family : PINGFANG_SC_FAMILY,
    defaultSlice,
    basePath: typeof record.basePath === 'string' ? record.basePath : '/pingfang-sc',
    styles,
    slices
  }
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
      typeof slice.byteLength !== 'number'
    ) {
      return null
    }
    const ranges: Array<[number, number]> = []
    if (Array.isArray(slice.ranges)) {
      for (const range of slice.ranges) {
        if (!isRangePair(range)) return null
        ranges.push([range[0], range[1]])
      }
    }
    slices.push({
      id: slice.id,
      file: slice.file,
      unicodes: typeof slice.unicodes === 'string' ? slice.unicodes : '',
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
