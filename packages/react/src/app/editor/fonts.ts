import { DEFAULT_FONT_FAMILY, IS_BROWSER } from '@open-pencil/core/constants'
import {
  fontManager,
  type FontFamilyOption,
  type LocalFontAccessState
} from '@open-pencil/core/text'

import { browserWebFontFetch } from '#react/app/editor/web-font-fetch'
import {
  preferredFontFamiliesForLocale,
  readStoredOrBrowserLocale,
  type Locale
} from '#react/i18n/locale'

/**
 * CanvasKit font path:
 * - Boot / latin: bundled Inter (Regular only until other weights are used)
 * - CJK / Arabic missing glyphs: Google `text=` unicode-range subsets (Noto), never full CJK TTC
 * - Optional PingFang SC: pre-cut unicode-range TTF slices under /pingfang-sc (not the full face)
 */
if (IS_BROWSER) {
  fontManager.setHostFontLoader(null)
  fontManager.setFallbackUserAgent(navigator.userAgent)
  fontManager.setWebFontFetch(browserWebFontFetch)
  fontManager.setOnlineFontProviders({
    google: true,
    fontsource: true,
    bunny: false,
    fontshare: false
  })
}

const previewFamilies = new Set<string>()

function ensurePreferredFamilies(byFamily: Map<string, FontFamilyOption>): void {
  const locale = readStoredOrBrowserLocale()
  for (const family of preferredFontFamiliesForLocale(locale)) {
    if (byFamily.has(family)) continue
    byFamily.set(family, { family, source: 'bundled' })
    registerLocalFontPreview(family)
  }
}

export function localFontAccessState(): LocalFontAccessState {
  return fontManager.localAccessState()
}

export function localFamilyOptions(options: readonly FontFamilyOption[]): FontFamilyOption[] {
  return options.filter((option) => option.source === 'local' || option.source === 'bundled')
}

export function registerLocalFontPreview(family: string): void {
  if (typeof document === 'undefined' || previewFamilies.has(family)) return
  previewFamilies.add(family)
}

/** Clear host loader; keep Google glyph-subset providers for CJK fallbacks. */
export function preloadFonts(): void {
  fontManager.setHostFontLoader(null)
  fontManager.setWebFontFetch(browserWebFontFetch)
  fontManager.setOnlineFontProviders({
    google: true,
    fontsource: true,
    bunny: false,
    fontshare: false
  })
}

/** Bundled catalog (+ Local Font Access when granted). Does not download CJK faces. */
export async function listLocalFamilies(): Promise<FontFamilyOption[]> {
  preloadFonts()
  const options = localFamilyOptions(await fontManager.listFamilyOptions())
  const byFamily = new Map(options.map((font) => [font.family, font]))
  for (const option of options) registerLocalFontPreview(option.family)
  ensurePreferredFamilies(byFamily)
  if (!byFamily.has(DEFAULT_FONT_FAMILY)) {
    byFamily.set(DEFAULT_FONT_FAMILY, { family: DEFAULT_FONT_FAMILY, source: 'bundled' })
  }
  return [...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family))
}

export async function requestLocalFontAccess(): Promise<FontFamilyOption[]> {
  await fontManager.requestLocalFontAccess()
  return listLocalFamilies()
}

/** Local / bundled only — remote CJK subsets load through fallback coverage demands. */
export async function loadFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
  fontManager.setHostFontLoader(null)
  return fontManager.loadLocalFont(family, style)
}

/** Prefer Inter; CJK glyphs come from unicode-range subsets at rasterize time. */
export async function matchDefaultFontForLocale(_locale: Locale): Promise<string> {
  return DEFAULT_FONT_FAMILY
}

export function localFontAccessLabel(
  state: LocalFontAccessState,
  labels: {
    enabled: string
    denied: string
    unavailable: string
    notRequested: string
  }
): string {
  if (state === 'granted') return labels.enabled
  if (state === 'denied') return labels.denied
  if (state === 'unsupported') return labels.unavailable
  return labels.notRequested
}

if (IS_BROWSER) preloadFonts()
