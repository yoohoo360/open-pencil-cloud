export type FontFallbackScript = 'cjk' | 'cjk-sc' | 'cjk-tc' | 'cjk-jp' | 'cjk-kr' | 'arabic'

export function cjkFallbackScriptForLanguage(
  language: string | null | undefined
): Extract<FontFallbackScript, 'cjk-sc' | 'cjk-tc' | 'cjk-jp' | 'cjk-kr'> | null {
  if (!language) return null
  const normalized = language.toLowerCase().replaceAll('_', '-')
  const [primary] = normalized.split('-')
  if (primary === 'ja') return 'cjk-jp'
  if (primary === 'ko') return 'cjk-kr'
  if (primary !== 'zh') return null
  const subtags = new Set(normalized.split('-').slice(1))
  if (subtags.has('hant') || subtags.has('tw') || subtags.has('hk') || subtags.has('mo')) {
    return 'cjk-tc'
  }
  return 'cjk-sc'
}

export interface FontFallbackManifestEntry {
  script: FontFallbackScript
  localFamilies: string[]
  remoteFamilies: string[]
}

/** Disabled for memory experiments — no host/remote fallback faces. */
export const ARABIC_LOCAL_FALLBACK_FAMILIES: string[] = []

export const ARABIC_REMOTE_FALLBACK_FAMILIES: string[] = []

export function cjkLocalFallbackFamilies(_userAgent?: string): string[] {
  return []
}

export function fontFallbackManifest(
  _userAgent?: string
): Record<FontFallbackScript, FontFallbackManifestEntry> {
  const empty = (script: FontFallbackScript): FontFallbackManifestEntry => ({
    script,
    localFamilies: [],
    remoteFamilies: []
  })
  return {
    cjk: empty('cjk'),
    'cjk-sc': empty('cjk-sc'),
    'cjk-tc': empty('cjk-tc'),
    'cjk-jp': empty('cjk-jp'),
    'cjk-kr': empty('cjk-kr'),
    arabic: empty('arabic')
  }
}

export function fontFallbackEntry(
  script: FontFallbackScript,
  userAgent?: string
): FontFallbackManifestEntry {
  return fontFallbackManifest(userAgent)[script]
}
