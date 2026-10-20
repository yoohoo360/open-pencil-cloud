import { localeFrom } from '@nanostores/i18n'
import { atom, onStart } from 'nanostores'

import { DEFAULT_FONT_FAMILY } from '@open-pencil/core/constants'

export const AVAILABLE_LOCALES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'pl', 'ru', 'zh-CN'] as const
export type Locale = (typeof AVAILABLE_LOCALES)[number]
export type TranslatedLocale = Exclude<Locale, 'en'>

export const TRANSLATED_LOCALES = [
  'de',
  'es',
  'fr',
  'it',
  'ja',
  'pl',
  'ru',
  'zh-CN'
] as const satisfies ReadonlyArray<TranslatedLocale>

export const LOCALE_DIR_NAMES = {
  de: 'de',
  es: 'es',
  fr: 'fr',
  it: 'it',
  ja: 'ja',
  pl: 'pl',
  ru: 'ru',
  'zh-CN': 'zh-cn'
} as const satisfies Record<TranslatedLocale, string>

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  ja: '日本語',
  pl: 'Polski',
  ru: 'Русский',
  'zh-CN': '中文（简体）'
}

const LOCALE_STORAGE_KEY = 'open-pencil-locale'

/**
 * Optional CJK families shown in the picker. Defaults stay on Inter so CanvasKit
 * only pulls Google `text=` glyph subsets for characters that actually appear.
 */
export const ZH_CN_FONT_CANDIDATES = ['PingFang SC'] as const

export const localeSetting = atom<Locale | undefined>(undefined)

function matchSimplifiedChinese(normalized: string): Locale | null {
  const [primary, ...rest] = normalized.split('-')
  if (primary !== 'zh') return null
  const subtags = new Set(rest)
  if (subtags.has('hant') || subtags.has('tw') || subtags.has('hk') || subtags.has('mo')) {
    return null
  }
  // Bare `zh`, `zh-Hans`, `zh-CN`, `zh-SG`, …
  return 'zh-CN'
}

export function resolveBrowserLocale(languages: readonly string[]): Locale {
  const localesByCode = new Map(AVAILABLE_LOCALES.map((code) => [code.toLowerCase(), code]))
  for (const language of languages) {
    const normalized = language.toLowerCase().replaceAll('_', '-')
    const exact = localesByCode.get(normalized)
    if (exact) return exact

    const simplifiedChinese = matchSimplifiedChinese(normalized)
    if (simplifiedChinese) return simplifiedChinese

    const base = normalized.split('-')[0]
    const baseLocale = localesByCode.get(base)
    if (baseLocale) return baseLocale
  }
  return 'en'
}

export function preferredFontFamiliesForLocale(code: Locale): readonly string[] {
  if (code === 'zh-CN') return ZH_CN_FONT_CANDIDATES
  return []
}

/** Always Inter — CJK is covered by unicode-range remote subsets, not a default CJK face. */
export function defaultFontFamilyForLocale(_code: Locale): string {
  return DEFAULT_FONT_FAMILY
}

function getLocalStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  if (typeof localStorage.getItem !== 'function') return null
  if (typeof localStorage.setItem !== 'function') return null
  return localStorage
}

export function readBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  const browserLanguages = Array.isArray(navigator.languages) ? navigator.languages : []
  const languages = browserLanguages.length > 0 ? browserLanguages : [navigator.language || 'en']
  return resolveBrowserLocale(languages)
}

export function readStoredOrBrowserLocale(): Locale {
  const saved = getLocalStorage()?.getItem(LOCALE_STORAGE_KEY) as Locale | null | undefined
  if (saved && AVAILABLE_LOCALES.includes(saved)) return saved
  return readBrowserLocale()
}

/** Eager — page-loading overlay must not wait for atom onStart / async i18n packs. */
const browserLocale = atom<Locale>(readBrowserLocale())
onStart(browserLocale, () => {
  browserLocale.set(readBrowserLocale())
})

export const locale = localeFrom(localeSetting, browserLocale)

export function setLocale(code: Locale) {
  const previous = locale.get()
  localeSetting.set(code)
  getLocalStorage()?.setItem(LOCALE_STORAGE_KEY, code)
  if (previous === code) return
  void import('#react/app/settings/preferences').then(({ syncDefaultFontFamilyForLocale }) => {
    syncDefaultFontFamilyForLocale(previous, code)
  })
}

const saved = getLocalStorage()?.getItem(LOCALE_STORAGE_KEY) as Locale | null | undefined
if (saved && AVAILABLE_LOCALES.includes(saved)) {
  localeSetting.set(saved)
}
