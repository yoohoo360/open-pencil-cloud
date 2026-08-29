import { DEFAULT_FONT_FAMILY, IS_BROWSER } from '@open-pencil/core/constants'
import {
  fontManager,
  type FontFamilyOption,
  type LocalFontAccessState
} from '@open-pencil/core/text'

if (IS_BROWSER) {
  fontManager.setOnlineFontProviders({})
  fontManager.setFallbackUserAgent(navigator.userAgent)
}

const previewFamilies = new Set<string>()

export function localFontAccessState(): LocalFontAccessState {
  return fontManager.localAccessState()
}

export function localFamilyOptions(options: readonly FontFamilyOption[]): FontFamilyOption[] {
  return options.filter((option) => option.source === 'local' || option.source === 'bundled')
}

export function registerLocalFontPreview(family: string): void {
  if (typeof document === 'undefined' || previewFamilies.has(family)) return
  previewFamilies.add(family)
  document.fonts.add(new FontFace(family, `local("${family}")`))
}

export async function listLocalFamilies(): Promise<FontFamilyOption[]> {
  fontManager.setOnlineFontProviders({})
  const options = localFamilyOptions(await fontManager.listFamilyOptions())
  for (const option of options) registerLocalFontPreview(option.family)
  if (!options.some((option) => option.family === DEFAULT_FONT_FAMILY)) {
    options.unshift({ family: DEFAULT_FONT_FAMILY, source: 'bundled' })
  }
  return options
}

export async function requestLocalFontAccess(): Promise<FontFamilyOption[]> {
  await fontManager.requestLocalFontAccess()
  return listLocalFamilies()
}

export async function loadFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
  return fontManager.loadLocalFont(family, style)
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
