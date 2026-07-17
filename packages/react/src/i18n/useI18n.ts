import { useStore } from '@nanostores/react'

import { locale, setLocale, AVAILABLE_LOCALES, LOCALE_LABELS } from './locale'
import type { Locale } from './locale'
import {
  menuMessages,
  commandMessages,
  toolMessages,
  panelMessages,
  pageMessages,
  dialogMessages
} from './messages'

/**
 * Reactive i18n hook for OpenPencil React components.
 */
export function useI18n() {
  return {
    menu: useStore(menuMessages),
    commands: useStore(commandMessages),
    tools: useStore(toolMessages),
    panels: useStore(panelMessages),
    pages: useStore(pageMessages),
    dialogs: useStore(dialogMessages),
    locale: useStore(locale) as Locale,
    availableLocales: AVAILABLE_LOCALES,
    localeLabels: LOCALE_LABELS,
    setLocale
  }
}
