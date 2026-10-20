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

/**
 * Prefer Google Fonts `text=` glyph subsets over host CJK TTCs / full Noto packs.
 * Local families stay empty so CanvasKit never ingests multi‑MB system collections.
 */
export const ARABIC_LOCAL_FALLBACK_FAMILIES: string[] = []

export const ARABIC_REMOTE_FALLBACK_FAMILIES = ['Noto Naskh Arabic']

export function cjkLocalFallbackFamilies(_userAgent?: string): string[] {
  return []
}

const CJK_SCRIPT_REMOTE_FAMILIES: Record<
  Extract<FontFallbackScript, 'cjk-sc' | 'cjk-tc' | 'cjk-jp' | 'cjk-kr'>,
  string[]
> = {
  'cjk-sc': ['Noto Sans SC'],
  'cjk-tc': ['Noto Sans TC', 'Noto Sans SC'],
  'cjk-jp': ['Noto Sans JP', 'Noto Sans SC'],
  'cjk-kr': ['Noto Sans KR', 'Noto Sans SC']
}

export function fontFallbackManifest(
  _userAgent?: string
): Record<FontFallbackScript, FontFallbackManifestEntry> {
  return {
    cjk: {
      script: 'cjk',
      localFamilies: [],
      remoteFamilies: ['Noto Sans SC']
    },
    'cjk-sc': {
      script: 'cjk-sc',
      localFamilies: [],
      remoteFamilies: CJK_SCRIPT_REMOTE_FAMILIES['cjk-sc']
    },
    'cjk-tc': {
      script: 'cjk-tc',
      localFamilies: [],
      remoteFamilies: CJK_SCRIPT_REMOTE_FAMILIES['cjk-tc']
    },
    'cjk-jp': {
      script: 'cjk-jp',
      localFamilies: [],
      remoteFamilies: CJK_SCRIPT_REMOTE_FAMILIES['cjk-jp']
    },
    'cjk-kr': {
      script: 'cjk-kr',
      localFamilies: [],
      remoteFamilies: CJK_SCRIPT_REMOTE_FAMILIES['cjk-kr']
    },
    arabic: {
      script: 'arabic',
      localFamilies: [],
      remoteFamilies: [...ARABIC_REMOTE_FALLBACK_FAMILIES]
    }
  }
}

export function fontFallbackEntry(
  script: FontFallbackScript,
  userAgent?: string
): FontFallbackManifestEntry {
  return fontFallbackManifest(userAgent)[script]
}
