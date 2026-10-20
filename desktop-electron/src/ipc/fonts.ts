import { readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, extname, join } from 'node:path'

export type FontFamily = { family: string; styles: string[] }

const FONT_EXTS = new Set(['.ttf', '.otf', '.ttc', '.woff', '.woff2'])

type FontFaceRecord = {
  path: string
  family: string
  style: string
  base: string
  normalizedFamily: string
  normalizedBase: string
}

const faces: FontFaceRecord[] = []
let cachedFamilies: FontFamily[] | null = null

function fontDirs(): string[] {
  if (process.platform === 'darwin') {
    return [
      '/System/Library/Fonts',
      '/Library/Fonts',
      '/System/Library/Fonts/Supplemental',
      join(homedir(), 'Library/Fonts')
    ]
  }
  if (process.platform === 'linux') {
    return ['/usr/share/fonts', '/usr/local/share/fonts', join(homedir(), '.fonts'), join(homedir(), '.local/share/fonts')]
  }
  if (process.platform === 'win32') {
    return [join(process.env.WINDIR ?? 'C:\\Windows', 'Fonts')]
  }
  return []
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function canonicalStyle(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower === 'normal' || lower === 'book') return 'Regular'
  if (lower === 'bolditalic') return 'BoldItalic'
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

function splitFamilyStyle(base: string): { family: string; style: string } {
  // Variable fonts: `RobotoFlex-VariableFont_GRAD,wght` → family Roboto Flex
  const variableCut = base.split(/[-_]?variablefont/i)[0] ?? base
  let family = variableCut.split(',')[0]?.replace(/[\s_-]+/g, ' ').trim() || base
  let style = 'Regular'
  const spaced =
    /[-_ ](Thin|Hairline|ExtraLight|UltraLight|Light|Regular|Normal|Book|Medium|SemiBold|DemiBold|Bold|ExtraBold|UltraBold|Black|Heavy|Italic|Oblique|BoldItalic)$/i.exec(
      family
    )
  if (spaced) {
    style = spaced[1] ?? 'Regular'
    family = family.slice(0, spaced.index).trim() || family
  } else if (/variable/i.test(base)) {
    style = 'Regular'
  }
  return { family: family || base, style: canonicalStyle(style) }
}

/** Peel a trailing style glued into the family name (`Roboto Flex Bold` / `robotoflexbold`). */
function peelRequest(family: string, style: string): { familyKey: string; styleKey: string } {
  let familyKey = normalizeKey(family)
  let styleKey = style.trim() || 'Regular'
  if (normalizeKey(styleKey) !== 'regular') {
    return { familyKey, styleKey }
  }
  const trailing =
    /^(.*?)(thin|hairline|extralight|ultralight|light|regular|medium|semibold|demibold|bold|extrabold|ultrabold|black|heavy|italic|oblique)$/i.exec(
      familyKey
    )
  if (trailing?.[1]) {
    familyKey = trailing[1]
    styleKey = canonicalStyle(trailing[2] ?? 'Regular')
  }
  return { familyKey, styleKey }
}

function walkFonts(dir: string, depth = 0): void {
  if (depth > 4) return
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    const path = join(dir, name)
    let isDir = false
    try {
      isDir = statSync(path).isDirectory()
    } catch {
      continue
    }
    if (isDir) {
      walkFonts(path, depth + 1)
      continue
    }
    const ext = extname(name).toLowerCase()
    if (!FONT_EXTS.has(ext)) continue
    const base = basename(name, ext)
    const { family, style } = splitFamilyStyle(base)
    faces.push({
      path,
      family,
      style,
      base,
      normalizedFamily: normalizeKey(family),
      normalizedBase: normalizeKey(base)
    })
  }
}

function ensureIndexed(): void {
  if (cachedFamilies) return
  faces.length = 0
  for (const dir of fontDirs()) walkFonts(dir)
  const byFamily = new Map<string, Set<string>>()
  for (const face of faces) {
    const styles = byFamily.get(face.family) ?? new Set<string>()
    styles.add(face.style)
    // Variable files expose common weights so the picker can request Bold etc.
    if (/variable/i.test(face.base) || face.style === 'Regular') {
      for (const extra of ['Regular', 'Medium', 'Bold', 'Light']) styles.add(extra)
    }
    byFamily.set(face.family, styles)
  }
  cachedFamilies = [...byFamily.entries()]
    .map(([family, styles]) => ({
      family,
      styles: [...styles].sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => a.family.localeCompare(b.family))
}

export function listSystemFonts(): FontFamily[] {
  ensureIndexed()
  return cachedFamilies ?? []
}

function styleRank(requested: string, actual: string): number {
  const want = normalizeKey(requested)
  const have = normalizeKey(actual)
  if (want === have) return 100
  if (want === 'bold' && (have === 'bold' || have === 'semibold' || have === 'extrabold')) return 80
  if (want === 'regular' && (have === 'regular' || have === 'normal')) return 80
  if (have.includes(want) || want.includes(have)) return 40
  return 0
}

/**
 * Resolve a face file. Soft-fails with `null` (no throw) so IPC stays quiet —
 * renderer treats empty/missing bytes as unavailable.
 */
export function resolveSystemFontPath(family: string, style = 'Regular'): string | null {
  ensureIndexed()
  const { familyKey, styleKey } = peelRequest(family, style)

  let best: { path: string; score: number } | null = null
  for (const face of faces) {
    const familyHit =
      face.normalizedFamily === familyKey ||
      face.normalizedBase === familyKey ||
      face.normalizedBase.startsWith(familyKey) ||
      (familyKey.length >= 4 && face.normalizedFamily.startsWith(familyKey)) ||
      (familyKey.length >= 4 && face.normalizedBase.includes(familyKey))
    if (!familyHit) continue
    let score = 10
    if (face.normalizedFamily === familyKey) score += 50
    score += styleRank(styleKey, face.style)
    if (normalizeKey(styleKey) === 'bold' && face.normalizedBase.includes('bold')) score += 30
    // Variable fonts satisfy weight styles from a single file.
    if (/variable/i.test(face.base)) score += 20
    if (!best || score > best.score) best = { path: face.path, score }
  }

  return best && best.score >= 5 ? best.path : null
}

/** Returns font bytes, or an empty buffer when missing (no IPC exception). */
export function loadSystemFont(family: string, style = 'Regular'): Uint8Array {
  const path = resolveSystemFontPath(family, style)
  if (!path) {
    console.warn(`[fonts] not found: ${family} ${style}`)
    return new Uint8Array()
  }
  try {
    return new Uint8Array(readFileSync(path))
  } catch (error) {
    console.warn(`[fonts] failed to read ${path}`, error)
    return new Uint8Array()
  }
}
