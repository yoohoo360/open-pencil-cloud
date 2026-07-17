import { createI18n } from '@nanostores/i18n'
import type { ComponentsJSON } from '@nanostores/i18n'

import { locale } from './locale'
import type { Locale, TranslatedLocale } from './locale'

const localeLoaders = {
  de: () => import('../locales/de'),
  es: () => import('../locales/es'),
  fr: () => import('../locales/fr'),
  it: () => import('../locales/it'),
  ja: () => import('../locales/ja'),
  pl: () => import('../locales/pl'),
  ru: () => import('../locales/ru'),
  'zh-CN': () => import('../locales/zh-cn')
} satisfies Record<TranslatedLocale, () => Promise<{ default: ComponentsJSON }>>

export const i18n = createI18n<Locale, 'en'>(locale, {
  baseLocale: 'en',
  async get(code) {
    if (code === 'en') return {}
    const mod = await localeLoaders[code]()
    return mod.default
  }
})
