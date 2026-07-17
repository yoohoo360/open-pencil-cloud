import { createI18n } from '@nanostores/i18n'
import type { ComponentsJSON } from '@nanostores/i18n'

import { locale } from '#react/i18n/locale'
import type { Locale, TranslatedLocale } from '#react/i18n/locale'

const localeLoaders = {
  de: () => import('#react/i18n/locales/de'),
  es: () => import('#react/i18n/locales/es'),
  fr: () => import('#react/i18n/locales/fr'),
  it: () => import('#react/i18n/locales/it'),
  ja: () => import('#react/i18n/locales/ja'),
  pl: () => import('#react/i18n/locales/pl'),
  ru: () => import('#react/i18n/locales/ru'),
  'zh-CN': () => import('#react/i18n/locales/zh-cn')
} satisfies Record<TranslatedLocale, () => Promise<{ default: ComponentsJSON }>>

export const i18n = createI18n<Locale, 'en'>(locale, {
  baseLocale: 'en',
  async get(code) {
    if (code === 'en') return {}
    const mod = await localeLoaders[code]()
    return mod.default
  }
})
