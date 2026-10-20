import { readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { extname, join } from 'node:path'

import { listSfntFaces, standaloneFace } from './fonts/sfnt'

export type FontFamily = { family: string; styles: string[] }

const FONT_EXTS = new Set(['.ttf', '.otf', '.ttc', '.otc'])

type FontFaceRecord = {
  path: string
  family: string
  style: string
  index: number
  drawable: boolean
  normalizedFamily: string
  postScript: string | null
}

const faces: FontFaceRecord[] = []
let cachedFamilies: FontFamily[] | null = null

function fontDirs(): string[] {
  if (process.platform === 'darwin') {
    return [
      '/System/Library/Fonts',
      '/Library/Fonts',
      '/System/Library/Fonts/Supplemental',
      // PingFang UI / SC lives here on recent macOS (not under /System/Library/Fonts).
      '/System/Library/PrivateFrameworks/FontServices.framework/Resources/Reserved',
      join(homedir(), 'Library/Fonts')
    ]
  }
  if (process.platform === 'linux') {
    return [
      '/usr/share/fonts',
      '/usr/local/share/fonts',
      join(homedir(), '.fonts'),
      join(homedir(), '.local/share/fonts')
    ]
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
  const lower = raw.toLowerCase().replace(/[\s_-]+/g, '')
  if (lower === 'normal' || lower === 'book' || lower === 'default') return 'Regular'
  if (lower === 'bolditalic') return 'BoldItalic'
  if (lower === 'ultralight' || lower === 'extralight') return 'ExtraLight'
  if (lower === 'semibold' || lower === 'demibold') return 'SemiBold'
  if (lower === 'extrabold' || lower === 'ultrabold') return 'ExtraBold'
  // Hiragino W3 / W6 → approximate named weights used by the app.
  if (lower === 'w3') return 'Regular'
  if (lower === 'w6') return 'Bold'
  if (!raw) return 'Regular'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function walkFonts(dir: string, depth = 0): string[] {
  if (depth > 4) return []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const files: string[] = []
  for (const name of entries) {
    const path = join(dir, name)
    let isDir = false
    try {
      isDir = statSync(path).isDirectory()
    } catch {
      continue
    }
    if (isDir) {
      files.push(...walkFonts(path, depth + 1))
      continue
    }
    const ext = extname(name).toLowerCase()
    if (!FONT_EXTS.has(ext)) continue
    files.push(path)
  }
  return files
}

function indexFontFile(path: string): void {
  let data: Uint8Array
  try {
    data = new Uint8Array(readFileSync(path))
  } catch {
    return
  }
  const listed = listSfntFaces(data)
  if (listed.length === 0) return
  for (const face of listed) {
    faces.push({
      path,
      family: face.family,
      style: canonicalStyle(face.style),
      index: face.index,
      drawable: face.drawable,
      normalizedFamily: normalizeKey(face.family),
      postScript: face.postScript
    })
  }
}

function ensureIndexed(): void {
  if (cachedFamilies) return
  faces.length = 0
  for (const dir of fontDirs()) {
    for (const path of walkFonts(dir)) indexFontFile(path)
  }
  const byFamily = new Map<string, Set<string>>()
  for (const face of faces) {
    const styles = byFamily.get(face.family) ?? new Set<string>()
    styles.add(face.style)
    // Offer common weight names so the picker / locale default can request Regular.
    if (face.style === 'Regular' || face.style === 'Medium') {
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
  if (want === 'regular' && (have === 'regular' || have === 'medium' || have === 'normal')) return 80
  if (want === 'bold' && (have === 'bold' || have === 'semibold' || have === 'extrabold')) return 80
  if (have.includes(want) || want.includes(have)) return 40
  return 0
}

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

function resolveFace(family: string, style = 'Regular'): FontFaceRecord | null {
  ensureIndexed()
  const { familyKey, styleKey } = peelRequest(family, style)
  let best: { face: FontFaceRecord; score: number } | null = null
  for (const face of faces) {
    const familyHit =
      face.normalizedFamily === familyKey ||
      (face.postScript !== null && normalizeKey(face.postScript).startsWith(familyKey)) ||
      (familyKey.length >= 4 && face.normalizedFamily.startsWith(familyKey))
    if (!familyHit) continue
    let score = 10
    if (face.normalizedFamily === familyKey) score += 50
    score += styleRank(styleKey, face.style)
    // Prefer faces CanvasKit can draw when both exist.
    if (face.drawable) score += 25
    if (!best || score > best.score) best = { face, score }
  }
  return best && best.score >= 5 ? best.face : null
}

/** Returns font bytes, or an empty buffer when missing / undrawable (no IPC exception). */
export function loadSystemFont(family: string, style = 'Regular'): Uint8Array {
  const face = resolveFace(family, style)
  if (!face) {
    console.warn(`[fonts] not found: ${family} ${style}`)
    return new Uint8Array()
  }
  if (!face.drawable) {
    // e.g. modern PingFang UI (hvgl) — FontManager falls through to packaged slices.
    console.warn(`[fonts] unsupported outlines: ${family} ${style} (${face.path})`)
    return new Uint8Array()
  }
  try {
    const data = new Uint8Array(readFileSync(face.path))
    const extracted = standaloneFace(data, face.index)
    if (!extracted || extracted.byteLength === 0) {
      console.warn(`[fonts] failed to extract face ${face.index} from ${face.path}`)
      return new Uint8Array()
    }
    return extracted
  } catch (error) {
    console.warn(`[fonts] failed to read ${face.path}`, error)
    return new Uint8Array()
  }
}
