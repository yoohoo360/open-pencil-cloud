import { DEFAULT_FONT_FAMILY, IS_BROWSER } from '@open-pencil/core/constants'
import {
  fontManager,
  UnsupportedFontFormatError,
  type FontFamilyOption,
  type LocalFontAccessState
} from '@open-pencil/core/text'

import {
  defaultFontFamilyForLocale,
  preferredFontFamiliesForLocale,
  readStoredOrBrowserLocale,
  type Locale
} from '#react/i18n/locale'

if (IS_BROWSER) {
  fontManager.setOnlineFontProviders({})
  fontManager.setFallbackUserAgent(navigator.userAgent)
}

interface TauriFontFamily {
  family: string
  styles: string[]
}

type NativeFontLoadError = { code?: 'not-found' | 'unsupported-format' | 'failed' }

const previewFamilies = new Set<string>()

let tauriFontsCache: TauriFontFamily[] | null = null
let tauriFontsPromise: Promise<TauriFontFamily[]> | null = null
let hostFontLoaderConfigured = false
let defaultFontSynced = false

/** Runtime check — do not use the import-time `IS_TAURI` constant (can be false before inject). */
function isTauriShell(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function configureHostFontLoader(): void {
  if (hostFontLoaderConfigured || !isTauriShell()) return
  hostFontLoaderConfigured = true
  fontManager.setHostFontLoader(loadSystemFont)
}

async function getTauriFonts(): Promise<TauriFontFamily[]> {
  if (tauriFontsCache) return tauriFontsCache
  if (!tauriFontsPromise) {
    tauriFontsPromise = import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke<TauriFontFamily[]>('list_system_fonts'))
      .then((fonts) => {
        tauriFontsCache = fonts
        return fonts
      })
      .catch((error: unknown) => {
        // Do not sticky-cache failures: preload can race shell inject / ACL, and a
        // later open of the picker should retry once permissions are available.
        tauriFontsPromise = null
        console.warn('[fonts] list_system_fonts failed; system fonts unavailable', error)
        return [] as TauriFontFamily[]
      })
  }
  return tauriFontsPromise
}

function asArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer | null {
  if (data instanceof ArrayBuffer) return data.byteLength > 0 ? data : null
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView
    if (view.byteLength === 0) return null
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
  }
  return null
}

async function loadSystemFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
  if (!isTauriShell()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const data = await invoke<ArrayBuffer | Uint8Array>('load_system_font', { family, style })
    return asArrayBuffer(data)
  } catch (error) {
    if ((error as NativeFontLoadError | null)?.code === 'unsupported-format') {
      throw new UnsupportedFontFormatError(family, style)
    }
    console.warn(`[fonts] load_system_font failed for ${family} ${style}`, error)
    return null
  }
}

function ensurePreferredFamilies(
  byFamily: Map<string, FontFamilyOption>,
  availableNames: ReadonlySet<string>
): void {
  const locale = readStoredOrBrowserLocale()
  for (const family of preferredFontFamiliesForLocale(locale)) {
    if (byFamily.has(family) || !availableNames.has(family)) continue
    byFamily.set(family, { family, source: 'local' })
    registerLocalFontPreview(family)
  }
}

function syncDefaultFontWithLocale(availableNames: readonly string[]): void {
  if (defaultFontSynced) return
  defaultFontSynced = true
  const locale = readStoredOrBrowserLocale()
  const preferred = preferredFontFamiliesForLocale(locale)
  if (preferred.length === 0) return

  const matchedPreferred = preferred.find((family) => availableNames.includes(family))
  if (!matchedPreferred) return

  void import('#react/app/settings/preferences').then(({ appPreferences, updateDefaultFontFamily }) => {
    const current = appPreferences.get().editing.defaultFontFamily
    const localeDefault = defaultFontFamilyForLocale(locale)

    // Fresh installs and previous universal Inter default → an installed locale font.
    if (current === DEFAULT_FONT_FAMILY && matchedPreferred !== current) {
      updateDefaultFontFamily(matchedPreferred)
      return
    }

    // Settings still hold a preferred name that is not installed; swap to an available one.
    if (
      preferred.includes(current) &&
      !availableNames.includes(current) &&
      matchedPreferred !== current
    ) {
      updateDefaultFontFamily(matchedPreferred)
      return
    }

    // Locale default name that is not installed (legacy phantom) → installed match.
    if (current === localeDefault && matchedPreferred !== current) {
      updateDefaultFontFamily(matchedPreferred)
    }
  })
}

export function localFontAccessState(): LocalFontAccessState {
  return isTauriShell() ? 'granted' : fontManager.localAccessState()
}

export function localFamilyOptions(options: readonly FontFamilyOption[]): FontFamilyOption[] {
  return options.filter((option) => option.source === 'local' || option.source === 'bundled')
}

export function registerLocalFontPreview(family: string): void {
  if (typeof document === 'undefined' || previewFamilies.has(family)) return
  previewFamilies.add(family)
  // Do not register FontFace(local("Family")). CSS local() matches PostScript/full face
  // names (e.g. PingFangSC-Regular), not family names; a failed face can shadow the real
  // system family so the picker preview diverges from CanvasKit's host-loaded PingFang.
  // Installed families already resolve via font-family on the preview element.
}

export function preloadFonts(): void {
  configureHostFontLoader()
  if (!isTauriShell()) return
  void listLocalFamilies()
}

export async function listLocalFamilies(): Promise<FontFamilyOption[]> {
  configureHostFontLoader()
  fontManager.setOnlineFontProviders({})
  if (isTauriShell()) {
    const [systemFonts, webFonts] = await Promise.all([
      getTauriFonts(),
      fontManager.listFamilyOptions()
    ])
    const byFamily = new Map(localFamilyOptions(webFonts).map((font) => [font.family, font]))
    const availableNames = new Set<string>()
    for (const font of systemFonts) {
      availableNames.add(font.family)
      byFamily.set(font.family, { family: font.family, source: 'local' })
      registerLocalFontPreview(font.family)
    }
    ensurePreferredFamilies(byFamily, availableNames)
    if (!byFamily.has(DEFAULT_FONT_FAMILY)) {
      byFamily.set(DEFAULT_FONT_FAMILY, { family: DEFAULT_FONT_FAMILY, source: 'bundled' })
    }
    syncDefaultFontWithLocale([...availableNames])
    return [...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family))
  }

  const options = localFamilyOptions(await fontManager.listFamilyOptions())
  const byFamily = new Map(options.map((font) => [font.family, font]))
  const availableNames = new Set(byFamily.keys())
  for (const option of options) registerLocalFontPreview(option.family)
  ensurePreferredFamilies(byFamily, availableNames)
  if (!byFamily.has(DEFAULT_FONT_FAMILY)) {
    byFamily.set(DEFAULT_FONT_FAMILY, { family: DEFAULT_FONT_FAMILY, source: 'bundled' })
  }
  syncDefaultFontWithLocale([...availableNames])
  return [...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family))
}

export async function requestLocalFontAccess(): Promise<FontFamilyOption[]> {
  if (isTauriShell()) return listLocalFamilies()
  await fontManager.requestLocalFontAccess()
  return listLocalFamilies()
}

export async function loadFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
  configureHostFontLoader()
  return fontManager.loadLocalFont(family, style)
}

/** Resolve an installed locale default; never invent a family the host did not enumerate. */
export async function matchDefaultFontForLocale(locale: Locale): Promise<string> {
  configureHostFontLoader()
  const preferred = preferredFontFamiliesForLocale(locale)
  if (preferred.length === 0) return DEFAULT_FONT_FAMILY
  const availableNames = isTauriShell()
    ? new Set((await getTauriFonts()).map((font) => font.family))
    : new Set(localFamilyOptions(await fontManager.listFamilyOptions()).map((font) => font.family))
  return preferred.find((family) => availableNames.has(family)) ?? DEFAULT_FONT_FAMILY
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
