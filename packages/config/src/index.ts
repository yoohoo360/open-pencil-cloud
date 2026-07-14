import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_LINE_HEIGHT, DEFAULT_FONT_SIZE } from './constants'

const config = {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_LINE_HEIGHT
}
export function getConfig() {
  return config
}

export function updateConfig(newConfig: Partial<typeof config>) {
  Object.assign(config, newConfig)
}

export { DEFAULT_STROKE_MITER_LIMIT } from './constants'

const AVAILABLE_LOCALES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'pl', 'ru', 'zh-CN'] as const
export function updateLocaleConfig(locale: (typeof AVAILABLE_LOCALES)[number]) {
  switch (locale) {
    case 'zh-CN':
      updateConfig({
        DEFAULT_FONT_FAMILY: 'PingFang SC'
      })
      break
    default:
      updateConfig({
        DEFAULT_FONT_FAMILY: DEFAULT_FONT_FAMILY
      })
  }
}
