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

/**
 * Wire native font loading so CanvasKit can resolve faces when text asks for them.
 * Does not enumerate the system catalog or register any face bytes.
 */
function configureHostFontLoader(): void {
  if (hostFontLoaderConfigured || !isTauriShell()) return
  hostFontLoaderConfigured = true
  fontManager.setHostFontLoader(loadSystemFont)
}

/** Full family catalog — only for the font picker / settings list, never at boot. */
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
        // Do not sticky-cache failures: ACL / shell inject can race the first open.
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

/** Probe a few locale candidates via host load — not a full catalog walk. */
async function findInstalledPreferredFamily(locale: Locale): Promise<string | null> {
  configureHostFontLoader()
  for (const family of preferredFontFamiliesForLocale(locale)) {
    try {
      const data = await loadSystemFont(family, 'Regular')
      if (data) return family
    } catch {
      // unsupported-format / missing — try the next preferred face
    }
  }
  return null
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

/**
 * Migrate Inter → locale default using only preferred-family probes.
 * Does not call `list_system_fonts`.
 */
export function ensureLocaleDefaultFont(): void {
  if (defaultFontSynced) return
  defaultFontSynced = true
  const locale = readStoredOrBrowserLocale()
  if (preferredFontFamiliesForLocale(locale).length === 0) return

  void findInstalledPreferredFamily(locale).then((matchedPreferred) => {
    if (!matchedPreferred) return
    void import('#react/app/settings/preferences').then(
      ({ appPreferences, updateDefaultFontFamily }) => {
        const current = appPreferences.get().editing.defaultFontFamily
        const localeDefault = defaultFontFamilyForLocale(locale)

        // Fresh installs and previous universal Inter default → an installed locale font.
        if (current === DEFAULT_FONT_FAMILY && matchedPreferred !== current) {
          updateDefaultFontFamily(matchedPreferred)
          return
        }

        // Locale default name that is not installed (legacy phantom) → installed match.
        if (current === localeDefault && matchedPreferred !== current) {
          updateDefaultFontFamily(matchedPreferred)
        }
      }
    )
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

/** Boot: host loader only. Catalog + locale sync wait for the font picker / language change. */
export function preloadFonts(): void {
  configureHostFontLoader()
}

/** Enumerate installed families for the picker UI. Safe to call repeatedly (cached). */
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
    ensureLocaleDefaultFont()
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
  ensureLocaleDefaultFont()
  return [...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family))
}

export async function requestLocalFontAccess(): Promise<FontFamilyOption[]> {
  if (isTauriShell()) return listLocalFamilies()
  await fontManager.requestLocalFontAccess()
  return listLocalFamilies()
}

/** Load one face into the font manager / CanvasKit — called when text or the UI needs it. */
export async function loadFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
  configureHostFontLoader()
  return fontManager.loadLocalFont(family, style)
}

/** Resolve an installed locale default without enumerating the full system catalog. */
export async function matchDefaultFontForLocale(locale: Locale): Promise<string> {
  return (await findInstalledPreferredFamily(locale)) ?? DEFAULT_FONT_FAMILY
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
